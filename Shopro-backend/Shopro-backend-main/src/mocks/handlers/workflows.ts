import {http} from 'msw'
import type {JobErrorCategory, JobType, WorkflowListQuery, WorkflowStatus} from '@/types'
import {readDemoDatabase, transactDemoDatabase} from '../db'
import {
    completeCancellation,
    completeRetryAsSuccess,
    JobRuleError,
    refundFinalFailure,
    requestJobCancellation,
    retryJob
} from '../domain/job-rules'
import {recordAudit} from '../domain/audit-rules'
import {requestHasPermission} from '../domain/permission-rules'
import {forbidden, ok, validationError} from './utils'

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
        const data = readDemoDatabase()
        return ok(pageWorkflows(data, queryFrom(new URL(request.url))))
    }),
    http.get('/api/admin/ai/workflows/:id', ({params}) => {
        const workflowId = typeof params.id === 'string' ? params.id : undefined
        if (!workflowId) return validationError('工作流 ID 不正确')
        const data = readDemoDatabase()
        const workflow = data.workflows.find((item) => item.id === workflowId)
        if (!workflow) return validationError('工作流不存在')
        const user = data.users.find((item) => item.id === workflow.userId)
        if (!user) return validationError('工作流所属用户不存在')
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
    http.get('/api/admin/ai/jobs/:id', ({params}) => {
        const jobId = typeof params.id === 'string' ? params.id : undefined
        if (!jobId) return validationError('任务 ID 不正确')
        const data = readDemoDatabase()
        const job = data.jobs.find((item) => item.id === jobId)
        if (!job) return validationError('任务不存在')
        return ok({
            ...job,
            attempts: data.jobAttempts.filter((attempt) => attempt.jobId === job.id).sort((left, right) => left.attemptNo - right.attemptNo)
        })
    }),
    http.post('/api/admin/ai/jobs/:id/retry', ({params, request}) => {
        if (!requestHasPermission(request, 'workflow:operate')) return forbidden()
        const jobId = typeof params.id === 'string' ? params.id : undefined
        if (!jobId) return validationError('任务 ID 不正确')
        try {
            const result = transactDemoDatabase((data) => {
                const retryResult = retryJob(data, jobId)
                recordAudit(data, {
                    action: `创建任务 ${retryResult.job.name} 的第 ${retryResult.attempt.attemptNo} 次执行尝试`,
                    targetType: 'JOB_ATTEMPT',
                    targetId: retryResult.attempt.id,
                    reason: '运营人工重试可恢复的任务失败',
                    before: {jobStatus: 'FAILED'},
                    after: {jobStatus: retryResult.job.status, attemptNo: retryResult.attempt.attemptNo},
                })
                return retryResult
            })
            window.setTimeout(() => {
                transactDemoDatabase((data) => {
                    try {
                        const completed = completeRetryAsSuccess(data, jobId)
                        recordAudit(data, {
                            action: `任务 ${completed.job.name} 重试成功`,
                            targetType: 'JOB_ATTEMPT',
                            targetId: completed.attempt.id,
                            after: {jobStatus: completed.job.status, outputUrl: completed.attempt.outputUrl || ''},
                        })
                    } catch {
                        // 用户在演示过程中重置数据时，不再写入过期的异步结果。
                    }
                })
            }, 3000)
            return ok(result)
        } catch (error: unknown) {
            return validationError(error instanceof JobRuleError ? error.message : '任务重试失败')
        }
    }),
    http.post('/api/admin/ai/jobs/:id/cancel-request', ({params, request}) => {
        if (!requestHasPermission(request, 'workflow:operate')) return forbidden()
        const jobId = typeof params.id === 'string' ? params.id : undefined
        if (!jobId) return validationError('任务 ID 不正确')
        try {
            const job = transactDemoDatabase((data) => {
                const updated = requestJobCancellation(data, jobId)
                recordAudit(data, {
                    action: `请求取消任务 ${updated.name}`,
                    targetType: 'JOB',
                    targetId: updated.id,
                    reason: '运营人工取消请求',
                    after: {jobStatus: updated.status},
                })
                return updated
            })
            window.setTimeout(() => {
                transactDemoDatabase((data) => {
                    try {
                        const completed = completeCancellation(data, jobId)
                        recordAudit(data, {
                            action: completed.status === 'CANCELLED' ? `任务 ${completed.name} 已取消` : `任务 ${completed.name} 取消未确认`,
                            targetType: 'JOB',
                            targetId: completed.id,
                            after: {
                                jobStatus: completed.status,
                                supplierCancellationSupported: completed.status === 'CANCELLED',
                                billing: completed.status === 'CANCELLED' ? '不再追加用户积分扣除，已产生扣费按既有流水保留' : '供应商未确认取消，等待最终计费回调',
                            },
                        })
                    } catch {
                        // 用户在演示过程中重置数据时，不再写入过期的异步结果。
                    }
                })
            }, 1500)
            return ok(job)
        } catch (error: unknown) {
            return validationError(error instanceof JobRuleError ? error.message : '取消任务失败')
        }
    }),
    http.post('/api/admin/ai/jobs/:id/manual-refund', async ({params, request}) => {
        if (!requestHasPermission(request, 'workflow:operate')) return forbidden()
        const jobId = typeof params.id === 'string' ? params.id : undefined
        if (!jobId) return validationError('任务 ID 不正确')
        const body: unknown = await request.json().catch(() => ({}))
        const reason = typeof body === 'object' && body !== null && 'reason' in body && typeof body.reason === 'string' ? body.reason.trim() : ''
        if (!reason) return validationError('请填写人工补偿原因')
        try {
            const entry = transactDemoDatabase((data) => {
                const refund = refundFinalFailure(data, jobId)
                if (!refund) throw new JobRuleError('该任务没有待补偿的已扣积分')
                recordAudit(data, {
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
            return validationError(error instanceof JobRuleError ? error.message : '人工补偿失败')
        }
    }),
    http.get('/api/admin/ai/providers/health', () => {
        const health = readDemoDatabase().serviceHealth.filter((item) => item.capability === 'VIDEO' || item.capability === 'TEXT' || item.capability === 'TTS')
        return ok(health)
    }),
]
