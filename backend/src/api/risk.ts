import {request} from './client'
import type {
    ApiResponse,
    CreateRiskDecisionRequest,
    PageResult,
    RiskEvent,
    RiskEventDetail,
    RiskEventListItem,
    RiskEventListQuery
} from '@/types'

export function getRiskEvents(params: RiskEventListQuery): Promise<ApiResponse<PageResult<RiskEventListItem>>> {
    return request<PageResult<RiskEventListItem>>({method: 'GET', url: '/admin/risk/events', params})
}

export function getRiskEvent(id: string): Promise<ApiResponse<RiskEventDetail>> {
    return request<RiskEventDetail>({method: 'GET', url: `/admin/risk/events/${id}`})
}

export function createRiskDecision(id: string, payload: CreateRiskDecisionRequest): Promise<ApiResponse<RiskEvent>> {
    return request<RiskEvent>({method: 'POST', url: `/admin/risk/events/${id}/decisions`, data: payload})
}

export function createAppeal(id: string, message: string): Promise<ApiResponse<RiskEvent>> {
    return request<RiskEvent>({method: 'POST', url: `/admin/risk/events/${id}/appeals`, data: {message}})
}
