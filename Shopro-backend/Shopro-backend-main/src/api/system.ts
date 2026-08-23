import {request} from './client'
import type {
    ApiResponse,
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

export function resetDemoData(): Promise<ApiResponse<true>> {
    return request<true>({method: 'POST', url: '/admin/demo/reset'})
}

export function globalSearch(query: string): Promise<ApiResponse<SearchResult[]>> {
    return request<SearchResult[]>({method: 'GET', url: '/admin/search', params: {q: query}})
}
