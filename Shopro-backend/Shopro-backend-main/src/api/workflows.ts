import {request} from './client'
import type {
    ApiResponse,
    CreditLedgerEntry,
    Job,
    JobDetail,
    PageResult,
    RetryJobResult,
    ServiceHealth,
    WorkflowDetail,
    WorkflowListItem,
    WorkflowListQuery
} from '@/types'

export function getWorkflows(params: WorkflowListQuery): Promise<ApiResponse<PageResult<WorkflowListItem>>> {
    return request<PageResult<WorkflowListItem>>({method: 'GET', url: '/admin/ai/workflows', params})
}

export function getWorkflow(id: string): Promise<ApiResponse<WorkflowDetail>> {
    return request<WorkflowDetail>({method: 'GET', url: `/admin/ai/workflows/${id}`})
}

export function getJob(id: string): Promise<ApiResponse<JobDetail>> {
    return request<JobDetail>({method: 'GET', url: `/admin/ai/jobs/${id}`})
}

export function retryJob(id: string): Promise<ApiResponse<RetryJobResult>> {
    return request<RetryJobResult>({method: 'POST', url: `/admin/ai/jobs/${id}/retry`})
}

export function requestJobCancellation(id: string): Promise<ApiResponse<Job>> {
    return request<Job>({method: 'POST', url: `/admin/ai/jobs/${id}/cancel-request`})
}

export function manuallyRefundFailedJob(id: string, reason: string): Promise<ApiResponse<CreditLedgerEntry>> {
    return request<CreditLedgerEntry>({method: 'POST', url: `/admin/ai/jobs/${id}/manual-refund`, data: {reason}})
}

export function getProviderHealth(): Promise<ApiResponse<ServiceHealth[]>> {
    return request<ServiceHealth[]>({method: 'GET', url: '/admin/ai/providers/health'})
}
