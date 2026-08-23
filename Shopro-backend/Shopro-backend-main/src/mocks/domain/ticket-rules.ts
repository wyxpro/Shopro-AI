import type {CreateSupportTicketRequest, SupportTicket, UpdateSupportTicketRequest} from '@/types'
import type {DemoDatabase} from '../db'

export class TicketRuleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'TicketRuleError'
    }
}

function requireTicket(data: DemoDatabase, ticketId: string): SupportTicket {
    const ticket = data.tickets.find((item) => item.id === ticketId)
    if (!ticket) throw new TicketRuleError('工单不存在')
    return ticket
}

export function createSupportTicket(data: DemoDatabase, payload: CreateSupportTicketRequest): SupportTicket {
    if (!payload.title.trim()) throw new TicketRuleError('请填写工单标题')
    if (!payload.description.trim()) throw new TicketRuleError('请填写问题描述')
    if (!data.users.some((item) => item.id === payload.userId)) throw new TicketRuleError('关联用户不存在')

    const timestamp = new Date().toISOString()
    const ticket: SupportTicket = {
        id: `T${Date.now()}${Math.floor(Math.random() * 1000)}`,
        title: payload.title.trim(),
        category: payload.category,
        priority: payload.priority,
        status: 'OPEN',
        userId: payload.userId,
        organizationId: payload.organizationId,
        workflowId: payload.workflowId,
        jobId: payload.jobId,
        orderId: payload.orderId,
        contentId: payload.contentId,
        description: payload.description.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
    }
    data.tickets.unshift(ticket)
    return ticket
}

export function updateSupportTicket(
    data: DemoDatabase,
    ticketId: string,
    payload: UpdateSupportTicketRequest,
): SupportTicket {
    const ticket = requireTicket(data, ticketId)
    if (payload.status === 'CLOSED' && !payload.resolution?.trim() && !ticket.resolution?.trim()) {
        throw new TicketRuleError('关闭工单前必须填写处理结论')
    }
    if (payload.status) ticket.status = payload.status
    if (payload.assigneeId !== undefined) ticket.assigneeId = payload.assigneeId
    if (payload.resolution?.trim()) ticket.resolution = payload.resolution.trim()
    ticket.updatedAt = new Date().toISOString()
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') ticket.resolvedAt = ticket.updatedAt
    return ticket
}
