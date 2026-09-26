import {request} from './client'
import type {AdminUser, ApiResponse, LoginRequest} from '@/types'

export function login(payload: LoginRequest): Promise<ApiResponse<AdminUser>> {
    return request<AdminUser>({method: 'POST', url: '/admin/auth/login', data: payload})
}

export function getCurrentAdmin(): Promise<ApiResponse<AdminUser>> {
    return request<AdminUser>({method: 'GET', url: '/admin/auth/me'})
}

export function logout(): Promise<ApiResponse<null>> {
    return request<null>({method: 'POST', url: '/admin/auth/logout'})
}
