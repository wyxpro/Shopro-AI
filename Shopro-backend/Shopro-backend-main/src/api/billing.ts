import {request} from './client'
import type {
    ApiResponse,
    CreateRefundRequest,
    CreditLedgerEntry,
    GrantEntitlementResult,
    ListQuery,
    OrderDetail,
    OrderListItem,
    OrderListQuery,
    PageResult,
    PlanSnapshot,
    RefundDecisionRequest,
    RefundRequest
} from '@/types'

export function getOrders(params: OrderListQuery): Promise<ApiResponse<PageResult<OrderListItem>>> {
    return request<PageResult<OrderListItem>>({method: 'GET', url: '/admin/billing/orders', params})
}

export function getOrder(id: string): Promise<ApiResponse<OrderDetail>> {
    return request<OrderDetail>({method: 'GET', url: `/admin/billing/orders/${id}`})
}

export function regrantEntitlement(id: string): Promise<ApiResponse<GrantEntitlementResult>> {
    return request<GrantEntitlementResult>({method: 'POST', url: `/admin/billing/orders/${id}/regrant-entitlement`})
}

export function getRefunds(params: ListQuery): Promise<ApiResponse<PageResult<RefundRequest>>> {
    return request<PageResult<RefundRequest>>({method: 'GET', url: '/admin/billing/refunds', params})
}

export function createRefund(payload: CreateRefundRequest): Promise<ApiResponse<RefundRequest>> {
    return request<RefundRequest>({method: 'POST', url: '/admin/billing/refunds', data: payload})
}

export function approveRefund(id: string, payload: RefundDecisionRequest): Promise<ApiResponse<RefundRequest>> {
    return request<RefundRequest>({method: 'POST', url: `/admin/billing/refunds/${id}/approve`, data: payload})
}

export function rejectRefund(id: string, payload: RefundDecisionRequest): Promise<ApiResponse<RefundRequest>> {
    return request<RefundRequest>({method: 'POST', url: `/admin/billing/refunds/${id}/reject`, data: payload})
}

export function getCreditLedger(params: ListQuery): Promise<ApiResponse<PageResult<CreditLedgerEntry>>> {
    return request<PageResult<CreditLedgerEntry>>({method: 'GET', url: '/admin/billing/credit-ledger', params})
}

export function getPlans(): Promise<ApiResponse<PlanSnapshot[]>> {
    return request<PlanSnapshot[]>({method: 'GET', url: '/admin/billing/plans'})
}

export function createPlanVersion(payload: PlanSnapshot): Promise<ApiResponse<PlanSnapshot>> {
    return request<PlanSnapshot>({method: 'POST', url: '/admin/billing/plans', data: payload})
}
