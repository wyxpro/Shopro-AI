import {request} from './client'
import type {
    ApiResponse,
    CreateSupportTicketRequest,
    ListQuery,
    PageResult,
    SupportTicket,
    UpdateSupportTicketRequest
} from '@/types'

export function getTickets(params: ListQuery): Promise<ApiResponse<PageResult<SupportTicket>>> {
    return request<PageResult<SupportTicket>>({method: 'GET', url: '/admin/tickets', params})
}

export function createTicket(payload: CreateSupportTicketRequest): Promise<ApiResponse<SupportTicket>> {
    return request<SupportTicket>({method: 'POST', url: '/admin/tickets', data: payload})
}

export function getTicket(id: string): Promise<ApiResponse<SupportTicket>> {
    return request<SupportTicket>({method: 'GET', url: `/admin/tickets/${id}`})
}

export function updateTicket(id: string, payload: UpdateSupportTicketRequest): Promise<ApiResponse<SupportTicket>> {
    return request<SupportTicket>({method: 'PATCH', url: `/admin/tickets/${id}`, data: payload})
}
