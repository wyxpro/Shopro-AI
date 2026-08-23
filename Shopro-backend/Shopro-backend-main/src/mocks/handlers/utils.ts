import {HttpResponse} from 'msw'
import type {ApiResponse, PageResult} from '@/types'

export function ok<T>(data: T): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>({
        code: 0,
        message: 'success',
        data,
        traceId: crypto.randomUUID(),
    })
}

export function validationError(message: string): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>({
        code: 'VALIDATION_ERROR',
        message,
        data: null,
        traceId: crypto.randomUUID(),
    }, {status: 400})
}

export function forbidden(message = '当前角色没有执行此操作的权限'): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>({
        code: 'FORBIDDEN',
        message,
        data: null,
        traceId: crypto.randomUUID(),
    }, {status: 403})
}

function hasStatus(value: unknown): value is { status: string } {
    return typeof value === 'object' && value !== null && 'status' in value && typeof value.status === 'string'
}

export function paginate<T>(items: T[], url: URL): PageResult<T> {
    const keyword = url.searchParams.get('keyword') || ''
    const status = url.searchParams.get('status') || ''
    const currentPage = Math.max(1, Number(url.searchParams.get('page') || 1))
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') || 10))
    const filtered = items.filter((item) => {
        const matchesKeyword = !keyword || JSON.stringify(item).includes(keyword)
        const matchesStatus = !status || (hasStatus(item) && item.status === status)
        return matchesKeyword && matchesStatus
    })

    return {
        items: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        total: filtered.length,
        page: currentPage,
        pageSize,
    }
}
