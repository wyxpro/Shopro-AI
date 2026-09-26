import {request} from './client'
import type {
    ApiResponse,
    ApprovalDecisionRequest,
    ApprovalRequest,
    AuditLog,
    AuditLogQuery,
    ListQuery,
    PageResult,
    RoleDefinition,
    SearchResult,
    ServiceHealth,
    SystemAdmin,
} from '@/types'

export function getSystemHealth(): Promise<ApiResponse<ServiceHealth[]>> {
    return request<ServiceHealth[]>({method: 'GET', url: '/admin/system/health'})
}

export function getAuditLogs(params: AuditLogQuery): Promise<ApiResponse<PageResult<AuditLog>>> {
    return request<PageResult<AuditLog>>({method: 'GET', url: '/admin/system/audit-logs', params})
}

export function getAdmins(): Promise<ApiResponse<SystemAdmin[]>> {
    return request<SystemAdmin[]>({method: 'GET', url: '/admin/system/admins'})
}

export function getRoles(): Promise<ApiResponse<RoleDefinition[]>> {
    return request<RoleDefinition[]>({method: 'GET', url: '/admin/system/roles'})
}

export function getApprovals(params: ListQuery): Promise<ApiResponse<PageResult<ApprovalRequest>>> {
    return request<PageResult<ApprovalRequest>>({method: 'GET', url: '/admin/system/approvals', params})
}

/**
 * 审批处置：CREDIT_ADJUSTMENT 类型走积分审批落账闭环，REFUND 类型由后端代理到 billing 退款审批能力。
 * 返回体随类型不同（积分审批单或退款单），调用方按类型分支处理。
 */
export function approveApproval(id: string, payload: ApprovalDecisionRequest = {}): Promise<ApiResponse<unknown>> {
    return request<unknown>({method: 'POST', url: `/admin/system/approvals/${id}/approve`, data: payload})
}

export function rejectApproval(id: string, payload: ApprovalDecisionRequest = {}): Promise<ApiResponse<unknown>> {
    return request<unknown>({method: 'POST', url: `/admin/system/approvals/${id}/reject`, data: payload})
}

export function resetDemoData(): Promise<ApiResponse<true>> {
    return request<true>({method: 'POST', url: '/admin/demo/reset'})
}

export function globalSearch(query: string): Promise<ApiResponse<SearchResult[]>> {
    return request<SearchResult[]>({method: 'GET', url: '/admin/search', params: {q: query}})
}
