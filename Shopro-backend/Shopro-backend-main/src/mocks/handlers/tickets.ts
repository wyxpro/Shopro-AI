import {http} from 'msw'
import type {CreateSupportTicketRequest, SupportTicket, UpdateSupportTicketRequest} from '@/types'
import {readDemoDatabase, transactDemoDatabase} from '../db'
import {recordAudit} from '../domain/audit-rules'
import {createSupportTicket, TicketRuleError, updateSupportTicket} from '../domain/ticket-rules'
import {ok, paginate, validationError} from './utils'

const ticketCategories: SupportTicket['category'][] = ['JOB_FAILURE', 'BILLING', 'CONTENT_RISK', 'ACCOUNT', 'PUBLISHING', 'OTHER']
const ticketPriorities: SupportTicket['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const ticketStatuses: SupportTicket['status'][] = ['OPEN', 'PROCESSING', 'WAITING_USER', 'RESOLVED', 'CLOSED']

function isCreateTicketRequest(value: unknown): value is CreateSupportTicketRequest {
    if (typeof value !== 'object' || value === null) return false
    if (!('title' in value) || !('category' in value) || !('priority' in value) || !('userId' in value) || !('description' in value)) return false
    return typeof value.title === 'string'
        && typeof value.category === 'string'
        && ticketCategories.includes(value.category as SupportTicket['category'])
        && typeof value.priority === 'string'
        && ticketPriorities.includes(value.priority as SupportTicket['priority'])
        && typeof value.userId === 'string'
        && typeof value.description === 'string'
        && (!('organizationId' in value) || value.organizationId === undefined || typeof value.organizationId === 'string')
        && (!('workflowId' in value) || value.workflowId === undefined || typeof value.workflowId === 'string')
        && (!('jobId' in value) || value.jobId === undefined || typeof value.jobId === 'string')
        && (!('orderId' in value) || value.orderId === undefined || typeof value.orderId === 'string')
        && (!('contentId' in value) || value.contentId === undefined || typeof value.contentId === 'string')
}

function isUpdateTicketRequest(value: unknown): value is UpdateSupportTicketRequest {
    if (typeof value !== 'object' || value === null) return false
    if ('status' in value && value.status !== undefined && (!ticketStatuses.includes(value.status as SupportTicket['status']))) return false
    return (!('assigneeId' in value) || value.assigneeId === undefined || typeof value.assigneeId === 'string')
        && (!('resolution' in value) || value.resolution === undefined || typeof value.resolution === 'string')
}

export const ticketHandlers = [
    http.get('/api/admin/tickets', ({request}) => {
        const data = readDemoDatabase()
        return ok(paginate(data.tickets, new URL(request.url)))
    }),
    http.post('/api/admin/tickets', async ({request}) => {
        const payload: unknown = await request.json()
        if (!isCreateTicketRequest(payload)) return validationError('工单参数不正确')
        try {
            const ticket = transactDemoDatabase((data) => {
                const created = createSupportTicket(data, payload)
                recordAudit(data, {
                    action: `创建工单 ${created.title}`,
                    targetType: 'SUPPORT_TICKET',
                    targetId: created.id,
                    after: {...created},
                })
                return created
            })
            return ok(ticket)
        } catch (error: unknown) {
            return validationError(error instanceof TicketRuleError ? error.message : '创建工单失败')
        }
    }),
    http.get('/api/admin/tickets/:id', ({params}) => {
        const ticketId = typeof params.id === 'string' ? params.id : undefined
        const ticket = readDemoDatabase().tickets.find((item) => item.id === ticketId)
        if (!ticket) return validationError('工单不存在')
        return ok(ticket)
    }),
    http.patch('/api/admin/tickets/:id', async ({params, request}) => {
        const ticketId = typeof params.id === 'string' ? params.id : undefined
        const payload: unknown = await request.json()
        if (!ticketId || !isUpdateTicketRequest(payload)) return validationError('工单更新参数不正确')
        try {
            const ticket = transactDemoDatabase((data) => {
                const existing = data.tickets.find((item) => item.id === ticketId)
                if (!existing) throw new TicketRuleError('工单不存在')
                const before = {...existing}
                const updated = updateSupportTicket(data, ticketId, payload)
                recordAudit(data, {
                    action: `更新工单 ${updated.title}`,
                    targetType: 'SUPPORT_TICKET',
                    targetId: updated.id,
                    before,
                    after: {...updated},
                })
                return updated
            })
            return ok(ticket)
        } catch (error: unknown) {
            return validationError(error instanceof TicketRuleError ? error.message : '更新工单失败')
        }
    }),
]
