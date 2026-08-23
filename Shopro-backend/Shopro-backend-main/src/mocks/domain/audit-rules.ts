import type {AuditLog} from '@/types'
import type {DemoDatabase} from '../db'

export interface AuditInput {
    action: string
    targetType: string
    targetId: string
    reason?: string
    ticketId?: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
}

export function recordAudit(data: DemoDatabase, input: AuditInput): AuditLog {
    const entry: AuditLog = {
        id: crypto.randomUUID(),
        operatorId: 'admin-1',
        operatorName: 'admin@shopro.ai',
        role: 'SUPER_ADMIN',
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        ticketId: input.ticketId,
        before: input.before,
        after: input.after,
        result: 'SUCCESS',
        traceId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    }
    data.auditLogs.unshift(entry)
    return entry
}
