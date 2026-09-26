import type {AdminActor, AuditLog} from '@/types'
import type {DemoDatabase} from '../db'

export interface AuditInput {
    actor: AdminActor
    action: string
    targetType: string
    targetId: string
    reason?: string
    ticketId?: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    result?: AuditLog['result']
}

export function recordAudit(data: DemoDatabase, input: AuditInput): AuditLog {
    const entry: AuditLog = {
        id: crypto.randomUUID(),
        operatorId: input.actor.id,
        operatorName: input.actor.name,
        role: input.actor.role,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        ticketId: input.ticketId,
        before: input.before,
        after: input.after,
        result: input.result ?? 'SUCCESS',
        traceId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    }
    data.auditLogs.unshift(entry)
    return entry
}
