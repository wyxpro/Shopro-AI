import type {CreditLedgerEntry, Job, JobAttempt, LegacyJob, RetryJobResult, Workflow} from '@/types'
import type {DemoDatabase} from '../db'

const jobTypeLabels: Record<Job['type'], string> = {
    PRODUCT_PARSE: '商品解析',
    SCRIPT_GENERATION: '脚本',
    TRANSLATION: '翻译',
    EMOTION_ANALYSIS: '情感分析',
    TTS: '配音',
    COVER_GENERATION: '封面',
    VIDEO_GENERATION: '视频',
    VIDEO_COMPOSE: '视频合成',
    PUBLISH: '发布',
}

const legacyStatusByJobStatus: Record<Job['status'], LegacyJob['status']> = {
    WAITING: 'pending',
    QUEUED: 'pending',
    RUNNING: 'running',
    SUCCEEDED: 'success',
    FAILED: 'failed',
    TIMED_OUT: 'failed',
    CANCEL_REQUESTED: 'running',
    CANCELLED: 'cancelled',
    EXPIRED: 'failed',
}

export class JobRuleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'JobRuleError'
    }
}

function requireJob(data: DemoDatabase, jobId: string): Job {
    const job = data.jobs.find((item) => item.id === jobId)
    if (!job) throw new JobRuleError('任务不存在')
    return job
}

function requireWorkflow(data: DemoDatabase, workflowId: string): Workflow {
    const workflow = data.workflows.find((item) => item.id === workflowId)
    if (!workflow) throw new JobRuleError('工作流不存在')
    return workflow
}

function currentAttempt(data: DemoDatabase, job: Job): JobAttempt | undefined {
    return job.currentAttemptId ? data.jobAttempts.find((item) => item.id === job.currentAttemptId) : undefined
}

function attemptsForJob(data: DemoDatabase, jobId: string): JobAttempt[] {
    return data.jobAttempts.filter((item) => item.jobId === jobId).sort((left, right) => left.attemptNo - right.attemptNo)
}

function updateWorkflowCost(data: DemoDatabase, workflow: Workflow): void {
    const jobIds = new Set(data.jobs.filter((item) => item.workflowId === workflow.id).map((item) => item.id))
    workflow.providerCostMinor = data.jobAttempts
        .filter((attempt) => jobIds.has(attempt.jobId))
        .reduce((total, attempt) => total + attempt.providerCostMinor, 0)
}

function refreshWorkflowStatus(data: DemoDatabase, workflow: Workflow): void {
    const jobs = data.jobs.filter((item) => item.workflowId === workflow.id)
    const timestamp = new Date().toISOString()
    if (jobs.some((job) => job.status === 'CANCEL_REQUESTED')) workflow.status = 'CANCEL_REQUESTED'
    else if (jobs.every((job) => job.status === 'CANCELLED')) workflow.status = 'CANCELLED'
    else if (jobs.every((job) => job.status === 'SUCCEEDED')) {
        workflow.status = 'SUCCEEDED'
        workflow.finishedAt = timestamp
    } else if (jobs.some((job) => job.status === 'RUNNING' || job.status === 'QUEUED' || job.status === 'WAITING')) workflow.status = 'RUNNING'
    else if (jobs.some((job) => job.status === 'SUCCEEDED')) workflow.status = 'PARTIALLY_SUCCEEDED'
    else if (jobs.some((job) => job.status === 'FAILED' || job.status === 'TIMED_OUT' || job.status === 'EXPIRED')) workflow.status = 'FAILED'

    workflow.progress = jobs.length === 0
        ? 0
        : Math.round(jobs.reduce((sum, job) => sum + (currentAttempt(data, job)?.progress ?? (job.status === 'SUCCEEDED' ? 100 : 0)), 0) / jobs.length)
    workflow.needsAttention = jobs.some((job) => job.needsAttention)
    workflow.updatedAt = timestamp
    updateWorkflowCost(data, workflow)
}

export function toLegacyJob(data: DemoDatabase, job: Job): LegacyJob {
    const attempt = currentAttempt(data, job)
    const status = legacyStatusByJobStatus[job.status]
    return {
        id: job.id,
        name: job.name,
        type: jobTypeLabels[job.type],
        status,
        progress: attempt?.progress ?? (status === 'success' ? 100 : status === 'failed' ? 62 : status === 'cancelled' ? 0 : 45),
        createdAt: job.createdAt.slice(0, 10),
        error: attempt?.errorMessage,
    }
}

export function retryJob(data: DemoDatabase, jobId: string): RetryJobResult {
    const job = requireJob(data, jobId)
    const previousAttempt = currentAttempt(data, job)
    if (!previousAttempt || !previousAttempt.retryable) {
        throw new JobRuleError('该任务的错误类型不允许后台直接重试')
    }
    if (!['FAILED', 'TIMED_OUT', 'EXPIRED'].includes(job.status)) {
        throw new JobRuleError('当前任务状态不允许重试')
    }
    if (data.jobAttempts.some((item) => item.jobId === job.id && (item.status === 'RUNNING' || item.status === 'CANCEL_REQUESTED'))) {
        throw new JobRuleError('该任务已有执行中的尝试，不能重复重试')
    }
    if (job.attemptCount >= job.maxAttempts) {
        throw new JobRuleError('已达到最大重试次数')
    }

    const timestamp = new Date().toISOString()
    const attempt: JobAttempt = {
        id: crypto.randomUUID(),
        jobId: job.id,
        attemptNo: Math.max(...attemptsForJob(data, job.id).map((item) => item.attemptNo), 0) + 1,
        status: 'RUNNING',
        provider: previousAttempt.provider,
        model: previousAttempt.model,
        providerTaskId: `${previousAttempt.providerTaskId || job.id}-retry-${job.attemptCount + 1}`,
        progress: 15,
        retryable: true,
        providerCostMinor: previousAttempt.providerCostMinor,
        startedAt: timestamp,
        lastHeartbeatAt: timestamp,
        createdAt: timestamp,
    }
    data.jobAttempts.push(attempt)
    job.currentAttemptId = attempt.id
    job.attemptCount = attempt.attemptNo
    job.status = 'RUNNING'
    job.needsAttention = false
    job.updatedAt = timestamp
    const workflow = requireWorkflow(data, job.workflowId)
    refreshWorkflowStatus(data, workflow)
    return {job, attempt}
}

export function completeRetryAsSuccess(data: DemoDatabase, jobId: string): RetryJobResult {
    const job = requireJob(data, jobId)
    const attempt = currentAttempt(data, job)
    if (!attempt || attempt.status !== 'RUNNING') throw new JobRuleError('当前没有可完成的重试执行')
    const timestamp = new Date().toISOString()
    attempt.status = 'SUCCEEDED'
    attempt.progress = 100
    attempt.finishedAt = timestamp
    attempt.outputUrl = `https://demo.shopro.ai/outputs/${job.id}-${attempt.attemptNo}.mp4`
    job.status = 'SUCCEEDED'
    job.needsAttention = false
    job.updatedAt = timestamp
    const workflow = requireWorkflow(data, job.workflowId)
    refreshWorkflowStatus(data, workflow)
    return {job, attempt}
}

export function requestJobCancellation(data: DemoDatabase, jobId: string): Job {
    const job = requireJob(data, jobId)
    if (!['WAITING', 'QUEUED', 'RUNNING'].includes(job.status)) {
        throw new JobRuleError('已成功、已失败或已取消的任务不能再次取消')
    }
    const timestamp = new Date().toISOString()
    job.status = 'CANCEL_REQUESTED'
    job.updatedAt = timestamp
    const attempt = currentAttempt(data, job)
    if (attempt) {
        attempt.status = 'CANCEL_REQUESTED'
        attempt.lastHeartbeatAt = timestamp
    }
    const workflow = requireWorkflow(data, job.workflowId)
    refreshWorkflowStatus(data, workflow)
    return job
}

export function completeCancellation(data: DemoDatabase, jobId: string): Job {
    const job = requireJob(data, jobId)
    const attempt = currentAttempt(data, job)
    if (job.status !== 'CANCEL_REQUESTED') throw new JobRuleError('任务不处于取消请求中')
    const timestamp = new Date().toISOString()
    if (job.id === 'j6') {
        job.status = 'RUNNING'
        job.needsAttention = true
        job.updatedAt = timestamp
        if (attempt) {
            attempt.status = 'RUNNING'
            attempt.errorCategory = 'PROVIDER_UNAVAILABLE'
            attempt.errorCode = 'CANCEL_NOT_SUPPORTED'
            attempt.errorMessage = '当前供应商未确认取消，任务仍在运行。'
            attempt.retryable = true
            attempt.lastHeartbeatAt = timestamp
        }
    } else {
        job.status = 'CANCELLED'
        job.updatedAt = timestamp
        if (attempt) {
            attempt.status = 'CANCELLED'
            attempt.progress = 0
            attempt.finishedAt = timestamp
        }
    }
    const workflow = requireWorkflow(data, job.workflowId)
    refreshWorkflowStatus(data, workflow)
    return job
}

export function refundFinalFailure(data: DemoDatabase, jobId: string, simulateFailure = false): CreditLedgerEntry | undefined {
    const job = requireJob(data, jobId)
    if (!['FAILED', 'TIMED_OUT', 'EXPIRED'].includes(job.status) || job.creditsCharged <= job.creditsRefunded) return undefined
    job.needsAttention = simulateFailure
    const workflow = requireWorkflow(data, job.workflowId)
    if (simulateFailure) {
        workflow.needsAttention = true
        workflow.updatedAt = new Date().toISOString()
        return undefined
    }

    const user = data.users.find((item) => item.id === workflow.userId)
    if (!user) throw new JobRuleError('任务所属用户不存在')
    const amount = job.creditsCharged - job.creditsRefunded
    const existing = data.creditLedger.find((entry) => entry.idempotencyKey === `job-failure-refund-${job.id}`)
    if (existing) return existing
    const timestamp = new Date().toISOString()
    const entry: CreditLedgerEntry = {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: user.organizationId,
        type: 'JOB_FAILURE_REFUND',
        direction: 'CREDIT',
        amount,
        balanceBefore: user.creditBalance,
        balanceAfter: user.creditBalance + amount,
        bizType: 'JOB',
        bizId: job.id,
        reasonCode: 'FINAL_JOB_FAILURE',
        reason: '任务最终失败，系统自动退回已扣积分。',
        idempotencyKey: `job-failure-refund-${job.id}`,
        operatorId: 'system',
        createdAt: timestamp,
    }
    user.creditBalance = entry.balanceAfter
    user.updatedAt = timestamp
    job.creditsRefunded += amount
    job.needsAttention = false
    workflow.refundedCredits += amount
    workflow.needsAttention = false
    data.creditLedger.unshift(entry)
    job.updatedAt = timestamp
    workflow.updatedAt = timestamp
    return entry
}
