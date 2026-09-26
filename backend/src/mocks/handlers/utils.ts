import {HttpResponse} from 'msw'
import type {AdminActor, ApiCode, ApiResponse, PageResult} from '@/types'
import {actorHasPermission, adminFromRequest} from '../domain/permission-rules'
import {isDomainError} from '../domain/errors'

function body(code: ApiCode, message: string, data: unknown = null): ApiResponse<unknown> {
    return {code, message, data, traceId: crypto.randomUUID()}
}

export function ok<T>(data: T): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>(body(0, 'success', data))
}

/** 400 参数校验失败。 */
export function validationError(message: string): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>(body('VALIDATION_ERROR', message), {status: 400})
}

/** 401 未认证：client.ts 拦截器据此广播 shopro:unauthorized。 */
export function unauthorized(message = '登录状态已失效，请重新登录'): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>(body('UNAUTHORIZED', message), {status: 401})
}

/** 403 越权。 */
export function forbidden(message = '当前角色没有执行此操作的权限'): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>(body('FORBIDDEN', message), {status: 403})
}

/** 404 资源不存在。 */
export function notFound(message = '请求的资源不存在'): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>(body('NOT_FOUND', message), {status: 404})
}

/** 409 状态冲突（非法状态流转 / 重复操作）。 */
export function conflict(message = '当前状态不允许执行此操作'): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>(body('CONFLICT', message), {status: 409})
}

/** 409 幂等键复用但内容不一致。 */
export function idempotencyConflict(message = '重复请求与原请求不一致'): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>(body('IDEMPOTENCY_CONFLICT', message), {status: 409})
}

/** 422 业务规则不满足。 */
export function businessRuleViolation(message: string): HttpResponse<ApiResponse<unknown>> {
    return HttpResponse.json<ApiResponse<unknown>>(body('BUSINESS_RULE_VIOLATION', message), {status: 422})
}

/**
 * 守卫式鉴权（fail-close）：
 * - 无合法主体 → 401；有主体但缺权限 → 403；通过 → 返回可继续使用的 AdminActor。
 * 用法：const auth = authorize(request, PERM.X); if (auth instanceof Response) return auth; const actor = auth as AdminActor
 */
export type Authorization = AdminActor | HttpResponse<ApiResponse<unknown>>

export function authorize(request: Request, permission: string): Authorization {
    const actor = adminFromRequest(request)
    if (!actor) return unauthorized()
    if (!actorHasPermission(actor, permission)) return forbidden()
    return actor
}

/** 仅需登录、不细分权限的端点使用。 */
export function authenticate(request: Request): AdminActor | HttpResponse<ApiResponse<unknown>> {
    return adminFromRequest(request) ?? unauthorized()
}

function statusForCode(code: ApiCode): number {
    switch (code) {
        case 'UNAUTHORIZED':
            return 401
        case 'FORBIDDEN':
            return 403
        case 'NOT_FOUND':
            return 404
        case 'CONFLICT':
        case 'IDEMPOTENCY_CONFLICT':
            return 409
        case 'BUSINESS_RULE_VIOLATION':
            return 422
        case 'INTERNAL_ERROR':
            return 500
        default:
            return 400
    }
}

/** 把领域错误映射为语义化状态码响应；非领域错误退回 400。 */
export function respondDomainError(error: unknown, fallbackMessage: string): HttpResponse<ApiResponse<unknown>> {
    if (isDomainError(error)) {
        const status = statusForCode(error.code)
        return HttpResponse.json<ApiResponse<unknown>>(body(error.code, error.message), {status})
    }
    const message = error instanceof Error && error.message ? error.message : fallbackMessage
    return validationError(message)
}

function hasStatus(value: unknown): value is { status: string } {
    return typeof value === 'object' && value !== null && 'status' in value && typeof value.status === 'string'
}

const SEARCHABLE_FIELDS = ['id', 'name', 'title', 'email', 'phone', 'orderNo', 'code', 'description', 'username', 'realName', 'planId', 'modelId']

function matchesSearchKeyword(item: unknown, keyword: string): boolean {
    if (!item || typeof item !== 'object') return false
    const lowerKeyword = keyword.toLowerCase()
    const record = item as Record<string, unknown>
    for (const key of SEARCHABLE_FIELDS) {
        if (key in record) {
            const val = record[key]
            if (typeof val === 'string' && val.toLowerCase().includes(lowerKeyword)) return true
            if (typeof val === 'number' && String(val).includes(lowerKeyword)) return true
        }
    }
    // 降级兜底：检查顶层原始字符串或数字字段
    for (const val of Object.values(record)) {
        if (typeof val === 'string' && val.toLowerCase().includes(lowerKeyword)) return true
        if (typeof val === 'number' && String(val).includes(lowerKeyword)) return true
    }
    return false
}

export function paginate<T>(items: T[], url: URL): PageResult<T> {
    const keyword = (url.searchParams.get('keyword') || '').trim()
    const status = url.searchParams.get('status') || ''
    const currentPage = Math.max(1, Number(url.searchParams.get('page') || 1))
    const rawPageSize = Number(url.searchParams.get('pageSize') || 10)
    // 规范分页上限，避免超大页码导致 payload 膨胀
    const pageSize = Math.min(100, Math.max(1, Number.isNaN(rawPageSize) ? 10 : rawPageSize))
    const filtered = items.filter((item) => {
        const matchesKeyword = !keyword || matchesSearchKeyword(item, keyword)
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
