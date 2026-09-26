import type {CreditLedgerEntry} from './credit'
import type {CustomerUser, Organization} from './customer'
import type {AuditLog} from './system'

export type WorkflowStatus =
    | 'QUEUED'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'PARTIALLY_SUCCEEDED'
    | 'FAILED'
    | 'CANCEL_REQUESTED'
    | 'CANCELLED'

export interface Workflow {
    id: string
    userId: string
    organizationId?: string
    projectId: string
    productName: string
    status: WorkflowStatus
    currentStep: string
    progress: number
    totalCredits: number
    refundedCredits: number
    providerCostMinor: number
    currency: 'CNY' | 'USD'
    needsAttention: boolean
    createdAt: string
    startedAt?: string
    finishedAt?: string
    updatedAt: string
}

export type JobType =
    | 'PRODUCT_PARSE'
    | 'SCRIPT_GENERATION'
    | 'TRANSLATION'
    | 'EMOTION_ANALYSIS'
    | 'TTS'
    | 'COVER_GENERATION'
    | 'VIDEO_GENERATION'
    | 'VIDEO_COMPOSE'
    | 'PUBLISH'

export type JobStatus =
    | 'WAITING'
    | 'QUEUED'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'TIMED_OUT'
    | 'CANCEL_REQUESTED'
    | 'CANCELLED'
    | 'EXPIRED'

export interface Job {
    id: string
    workflowId: string
    type: JobType
    name: string
    status: JobStatus
    sequence: number
    currentAttemptId?: string
    attemptCount: number
    maxAttempts: number
    creditsCharged: number
    creditsRefunded: number
    needsAttention: boolean
    createdAt: string
    updatedAt: string
}

export type JobErrorCategory =
    | 'PROVIDER_TIMEOUT'
    | 'PROVIDER_RATE_LIMIT'
    | 'PROVIDER_UNAVAILABLE'
    | 'INVALID_INPUT'
    | 'CONTENT_BLOCKED'
    | 'INSUFFICIENT_CREDITS'
    | 'CALLBACK_MISSING'
    | 'INTERNAL_ERROR'

export interface JobAttempt {
    id: string
    jobId: string
    attemptNo: number
    status: JobStatus
    provider: string
    model: string
    providerTaskId?: string
    progress?: number
    errorCategory?: JobErrorCategory
    errorCode?: string
    errorMessage?: string
    retryable: boolean
    providerCostMinor: number
    startedAt?: string
    lastHeartbeatAt?: string
    finishedAt?: string
    outputUrl?: string
    createdAt: string
}

export interface WorkflowListQuery {
    page: number
    pageSize: number
    keyword?: string
    userId?: string
    organization?: string
    status?: WorkflowStatus
    jobType?: JobType
    model?: string
    errorCategory?: JobErrorCategory
    needsAttention?: 'true' | 'false'
    startAt?: string
    endAt?: string
}

export interface WorkflowListItem extends Workflow {
    userName: string
    organizationName?: string
}

export interface JobDetail extends Job {
    attempts: JobAttempt[]
}

export interface WorkflowDetail {
    workflow: Workflow
    user: CustomerUser
    organization?: Organization
    jobs: JobDetail[]
    creditLedger: CreditLedgerEntry[]
    auditLogs: AuditLog[]
}

export interface RetryJobResult {
    job: Job
    attempt: JobAttempt
}

/** @deprecated 仅在阶段 A 兼容旧 /admin/jobs 接口，阶段 C 删除。 */
export interface LegacyJob {
    id: string
    name: string
    type: string
    status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
    progress: number
    createdAt: string
    error?: string
}
