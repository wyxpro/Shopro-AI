import {http} from 'msw'
import {PERMISSIONS} from '@/constants/permissions'
import type {AdminActor, JobErrorCategory, JobType, WorkflowListQuery, WorkflowStatus} from '@/types'
import {readDemoDatabase, transactDemoDatabase} from '../db'
import {
    JobRuleError,
    refundFinalFailure,
    requestJobCancellation,
    retryJob
} from '../domain/job-rules'
import {recordAudit} from '../domain/audit-rules'
import {scheduleSideEffect} from '../domain/side-effects'
import {authorize, notFound, ok, respondDomainError, validationError} from './utils'

const workflowStatuses: WorkflowStatus[] = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED', 'CANCEL_REQUESTED', 'CANCELLED']
const jobTypes: JobType[] = ['PRODUCT_PARSE', 'SCRIPT_GENERATION', 'TRANSLATION', 'EMOTION_ANALYSIS', 'TTS', 'COVER_GENERATION', 'VIDEO_GENERATION', 'VIDEO_COMPOSE', 'PUBLISH']
const errorCategories: JobErrorCategory[] = ['PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMIT', 'PROVIDER_UNAVAILABLE', 'INVALID_INPUT', 'CONTENT_BLOCKED', 'INSUFFICIENT_CREDITS', 'CALLBACK_MISSING', 'INTERNAL_ERROR']

function queryFrom(url: URL): WorkflowListQuery {
    const status = url.searchParams.get('status') || undefined
    const jobType = url.searchParams.get('jobType') || undefined
    const errorCategory = url.searchParams.get('errorCategory') || undefined
    const needsAttention = url.searchParams.get('needsAttention') || undefined
    return {
        page: Math.max(1, Number(url.searchParams.get('page') || 1)),
        pageSize: Math.max(1, Number(url.searchParams.get('pageSize') || 10)),
        keyword: url.searchParams.get('keyword') || undefined,
        userId: url.searchParams.get('userId') || undefined,
        organization: url.searchParams.get('organization') || undefined,
        status: workflowStatuses.includes(status as WorkflowStatus) ? status as WorkflowStatus : undefined,
        jobType: jobTypes.includes(jobType as JobType) ? jobType as JobType : undefined,
        model: url.searchParams.get('model') || undefined,
        errorCategory: errorCategories.includes(errorCategory as JobErrorCategory) ? errorCategory as JobErrorCategory : undefined,
        needsAttention: needsAttention === 'true' || needsAttention === 'false' ? needsAttention : undefined,
        startAt: url.searchParams.get('startAt') || undefined,
        endAt: url.searchParams.get('endAt') || undefined,
    }
}

function matches(value: string, query?: string): boolean {
    return !query || value.toLowerCase().includes(query.toLowerCase())
}

function pageWorkflows(data: ReturnType<typeof readDemoDatabase>, query: WorkflowListQuery) {
    const items = data.workflows.filter((workflow) => {
        const user = data.users.find((item) => item.id === workflow.userId)
        const organization = workflow.organizationId ? data.organizations.find((item) => item.id === workflow.organizationId) : undefined
        const jobs = data.jobs.filter((item) => item.workflowId === workflow.id)
        const attempts = data.jobAttempts.filter((item) => jobs.some((job) => job.id === item.jobId))
        const matchesKeyword = matches(workflow.id, query.keyword)
            || matches(workflow.productName, query.keyword)
            || matches(user?.name || '', query.keyword)
        return matchesKeyword
            && (!query.userId || workflow.userId === query.userId)
            && matches(organization?.name || '', query.organization)
            && (!query.status || workflow.status === query.status)
            && (!query.jobType || jobs.some((job) => job.type === query.jobType))
            && (!query.model || attempts.some((attempt) => matches(attempt.model, query.model)))
            && (!query.errorCategory || attempts.some((attempt) => attempt.errorCategory === query.errorCategory))
            && (!query.needsAttention || String(workflow.needsAttention) === query.needsAttention)
            && (!query.startAt || workflow.createdAt >= query.startAt)
            && (!query.endAt || workflow.createdAt <= `${query.endAt}T23:59:59.999Z`)
    }).map((workflow) => {
        const user = data.users.find((item) => item.id === workflow.userId)
        const organization = workflow.organizationId ? data.organizations.find((item) => item.id === workflow.organizationId) : undefined
        return {...workflow, userName: user?.name || '未知用户', organizationName: organization?.name}
    })
    return {
        items: items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: items.length,
        page: query.page,
        pageSize: query.pageSize,
    }
}

export const workflowHandlers = [
    http.get('/api/admin/ai/workflows', ({request}) => {
        const auth = authorize(request, PERMISSIONS.WORKFLOW_VIEW)
        if (auth instanceof Response) return auth
        const data = readDemoDatabase()
        return ok(pageWorkflows(data, queryFrom(new URL(request.url))))
    }),
    http.get('/api/admin/ai/workflows/:id', ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.WORKFLOW_VIEW)
        if (auth instanceof Response) return auth
        const workflowId = typeof params.id === 'string' ? params.id : undefined
        if (!workflowId) return validationError('工作流 ID 不正确')
        const data = readDemoDatabase()
        const workflow = data.workflows.find((item) => item.id === workflowId)
        if (!workflow) return notFound('工作流不存在')
        const user = data.users.find((item) => item.id === workflow.userId)
        if (!user) return notFound('工作流所属用户不存在')
        const jobs = data.jobs.filter((item) => item.workflowId === workflow.id).sort((left, right) => left.sequence - right.sequence)
        const jobIds = new Set(jobs.map((item) => item.id))
        const attemptIds = new Set(data.jobAttempts.filter((attempt) => jobIds.has(attempt.jobId)).map((attempt) => attempt.id))
        return ok({
            workflow,
            user,
            organization: workflow.organizationId ? data.organizations.find((item) => item.id === workflow.organizationId) : undefined,
            jobs: jobs.map((job) => ({
                ...job,
                attempts: data.jobAttempts.filter((attempt) => attempt.jobId === job.id).sort((left, right) => left.attemptNo - right.attemptNo)
            })),
            creditLedger: data.creditLedger.filter((entry) => entry.userId === user.id && (entry.bizId === workflow.id || jobIds.has(entry.bizId))),
            auditLogs: data.auditLogs.filter((item) => item.targetId === workflow.id || jobIds.has(item.targetId) || attemptIds.has(item.targetId)).slice(0, 30),
        })
    }),
    // 预留端点：单任务详情已内嵌于 /ai/workflows/:id.jobs，此端点保留供外部/未来直链消费。
    http.get('/api/admin/ai/jobs/:id', ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.WORKFLOW_VIEW)
        if (auth instanceof Response) return auth
        const jobId = typeof params.id === 'string' ? params.id : undefined
        if (!jobId) return validationError('任务 ID 不正确')
        const data = readDemoDatabase()
        const job = data.jobs.find((item) => item.id === jobId)
        if (!job) return notFound('任务不存在')
        return ok({
            ...job,
            attempts: data.jobAttempts.filter((attempt) => attempt.jobId === job.id).sort((left, right) => left.attemptNo - right.attemptNo)
        })
    }),
    http.post('/api/admin/ai/jobs/:id/retry', ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.WORKFLOW_OPERATE)
        if (auth instanceof Response) return auth
        const actor = auth as AdminActor
        const jobId = typeof params.id === 'string' ? params.id : undefined
        if (!jobId) return validationError('任务 ID 不正确')
        try {
            const result = transactDemoDatabase((data) => {
                const retryResult = retryJob(data, jobId)
                recordAudit(data, {
                    actor,
                    action: `创建任务 ${retryResult.job.name} 的第 ${retryResult.attempt.attemptNo} 次执行尝试`,
                    targetType: 'JOB_ATTEMPT',
                    targetId: retryResult.attempt.id,
                    reason: '运营人工重试可恢复的任务失败',
                    before: {jobStatus: 'FAILED'},
                    after: {jobStatus: retryResult.job.status, attemptNo: retryResult.attempt.attemptNo},
                })
                return retryResult
            })
            // 重试完成不再用浏览器闭包 setTimeout 推进，改由集中化副作用推进器（模拟服务端回调/调度）。
            scheduleSideEffect('retry-complete', jobId, 3000)
            return ok(result)
        } catch (error: unknown) {
            return respondDomainError(error, '任务重试失败')
        }
    }),
    http.post('/api/admin/ai/jobs/:id/cancel-request', ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.WORKFLOW_OPERATE)
        if (auth instanceof Response) return auth
        const actor = auth as AdminActor
        const jobId = typeof params.id === 'string' ? params.id : undefined
        if (!jobId) return validationError('任务 ID 不正确')
        try {
            const job = transactDemoDatabase((data) => {
                const updated = requestJobCancellation(data, jobId)
                recordAudit(data, {
                    actor,
                    action: `请求取消任务 ${updated.name}`,
                    targetType: 'JOB',
                    targetId: updated.id,
                    reason: '运营人工取消请求',
                    after: {jobStatus: updated.status},
                })
                return updated
            })
            scheduleSideEffect('cancel-complete', jobId, 1500)
            return ok(job)
        } catch (error: unknown) {
            return respondDomainError(error, '取消任务失败')
        }
    }),
    http.post('/api/admin/ai/jobs/:id/manual-refund', async ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.WORKFLOW_OPERATE)
        if (auth instanceof Response) return auth
        const actor = auth as AdminActor
        const jobId = typeof params.id === 'string' ? params.id : undefined
        if (!jobId) return validationError('任务 ID 不正确')
        const body: unknown = await request.json().catch(() => ({}))
        const reason = typeof body === 'object' && body !== null && 'reason' in body && typeof body.reason === 'string' ? body.reason.trim() : ''
        if (!reason) return validationError('请填写人工补偿原因')
        try {
            const entry = transactDemoDatabase((data) => {
                const refund = refundFinalFailure(data, jobId, false, actor.id)
                if (!refund) throw new JobRuleError('该任务没有待补偿的已扣积分', 'BUSINESS_RULE_VIOLATION')
                recordAudit(data, {
                    actor,
                    action: `人工补偿任务 ${jobId} 的失败退款`,
                    targetType: 'JOB',
                    targetId: jobId,
                    reason,
                    after: {ledgerId: refund.id, refundedCredits: refund.amount, idempotencyKey: refund.idempotencyKey},
                })
                return refund
            })
            return ok(entry)
        } catch (error: unknown) {
            return respondDomainError(error, '人工补偿失败')
        }
    }),
    // 预留端点：服务健康已在 SystemView 的 /system/health 统一展示，此处面向 AI 页的过滤视图暂未接入。
    http.get('/api/admin/ai/providers/health', ({request}) => {
        const auth = authorize(request, PERMISSIONS.WORKFLOW_VIEW)
        if (auth instanceof Response) return auth
        const health = readDemoDatabase().serviceHealth.filter((item) => item.capability === 'VIDEO' || item.capability === 'TEXT' || item.capability === 'TTS')
        return ok(health)
    }),
]
