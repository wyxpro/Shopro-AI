import axios, {type AxiosError, type AxiosRequestConfig} from 'axios'
import {errorMessages} from '@/constants/error-codes'
import type {ApiCode, ApiErrorData, ApiResponse} from '@/types'

export class ApiClientError extends Error {
    constructor(
        message: string,
        public readonly code: ApiCode | 'NETWORK_ERROR' | 'TIMEOUT',
        public readonly status?: number,
        public readonly traceId?: string,
        public readonly details?: ApiErrorData,
    ) {
        super(message)
        this.name = 'ApiClientError'
    }
}

export const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 8000,
})

client.interceptors.request.use((config) => {
    const raw = localStorage.getItem('shopro-admin')
    if (!raw) return config
    try {
        const stored: unknown = JSON.parse(raw)
        if (typeof stored === 'object' && stored !== null && 'role' in stored && 'id' in stored && typeof stored.role === 'string' && typeof stored.id === 'string') {
            config.headers.set('x-shopro-admin-role', stored.role)
            config.headers.set('x-shopro-admin-id', stored.id)
        }
    } catch {
        // 无效的本地会话不会阻断未认证请求，响应拦截器会统一处理认证失败。
    }
    return config
})

function isSuccessCode(code: ApiCode): boolean {
    return code === 0 || code === 'OK'
}

client.interceptors.response.use(
    (response) => {
        const payload = response.data as ApiResponse<unknown>
        if (!isSuccessCode(payload.code)) {
            return Promise.reject(new ApiClientError(
                payload.message || errorMessages.INTERNAL_ERROR,
                payload.code,
                response.status,
                payload.traceId,
                typeof payload.data === 'object' && payload.data !== null ? payload.data as ApiErrorData : undefined,
            ))
        }

        return response
    },
    (error: AxiosError<ApiResponse<ApiErrorData>>) => {
        const response = error.response
        const payload = response?.data
        const code = error.code === 'ECONNABORTED' ? 'TIMEOUT' : payload?.code || 'NETWORK_ERROR'
        const fallbackMessage = code === 'TIMEOUT' ? errorMessages.TIMEOUT : errorMessages.NETWORK_ERROR
        const clientError = new ApiClientError(
            payload?.message || fallbackMessage,
            code,
            response?.status,
            payload?.traceId,
            payload?.data,
        )

        if (response?.status === 401 || payload?.code === 'UNAUTHORIZED') {
            window.dispatchEvent(new CustomEvent('shopro:unauthorized', {detail: clientError}))
        }

        return Promise.reject(clientError)
    },
)

export function request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return client.request<ApiResponse<T>>(config).then((response) => response.data)
}
