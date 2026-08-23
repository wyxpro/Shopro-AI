import type {ListQuery} from './api'

export interface AuditLog {
    id: string
    operatorId: string
    operatorName: string
    role: string
    action: string
    targetType: string
    targetId: string
    reason?: string
    ticketId?: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    result: 'SUCCESS' | 'FAILED'
    traceId: string
    ipMasked?: string
    createdAt: string
}

export interface ServiceHealth {
    id: string
    capability: 'TEXT' | 'TTS' | 'VIDEO' | 'PAYMENT' | 'PUBLISHING' | 'API'
    provider: string
    status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE'
    latencyMs: number
    affectedUsers: number
    affectedJobs: number
    fallbackEnabled: boolean
    incidentStartedAt?: string
    updatedAt: string
}

export interface SystemAdmin {
    id: string
    name: string
    email: string
    roleIds: string[]
    status: 'ACTIVE' | 'DISABLED'
    lastActiveAt?: string
    createdAt: string
}

export interface RoleDefinition {
    id: string
    name: string
    description: string
    permissions: string[]
    builtIn: boolean
}

export interface ApprovalRequest {
    id: string
    type: 'CREDIT_ADJUSTMENT' | 'REFUND' | 'CAPABILITY_RESTRICTION'
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    requesterId: string
    targetType: string
    targetId: string
    reason: string
    createdAt: string
    decidedAt?: string
}

export interface AuditLogQuery extends ListQuery {
    targetType?: string
    operatorId?: string
    result?: AuditLog['result']
    action?: string
}

export interface SearchResult {
    id: string
    category: 'USER' | 'ORGANIZATION' | 'ORDER' | 'WORKFLOW' | 'JOB' | 'CONTENT' | 'TICKET'
    title: string
    description: string
    route: string
}
