import {request} from './client'
import type {
    ApiResponse,
    CustomerUser,
    CustomerUserDetail,
    CustomerUserListItem,
    CustomerUserListQuery,
    ListQuery,
    Organization,
    PageResult,
    UpdateUserCapabilitiesRequest,
} from '@/types'

export function getCustomerUsers(params: CustomerUserListQuery): Promise<ApiResponse<PageResult<CustomerUserListItem>>> {
    return request<PageResult<CustomerUserListItem>>({method: 'GET', url: '/admin/customers/users', params})
}

export function getCustomerUser(id: string): Promise<ApiResponse<CustomerUserDetail>> {
    return request<CustomerUserDetail>({method: 'GET', url: `/admin/customers/users/${id}`})
}

export function updateUserCapabilities(
    id: string,
    payload: UpdateUserCapabilitiesRequest,
): Promise<ApiResponse<CustomerUser>> {
    return request<CustomerUser>({method: 'PATCH', url: `/admin/customers/users/${id}/capabilities`, data: payload})
}

export function getOrganizations(params: ListQuery): Promise<ApiResponse<PageResult<Organization>>> {
    return request<PageResult<Organization>>({method: 'GET', url: '/admin/customers/organizations', params})
}

export function getOrganization(id: string): Promise<ApiResponse<Organization>> {
    return request<Organization>({method: 'GET', url: `/admin/customers/organizations/${id}`})
}
