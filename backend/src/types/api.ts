export type ApiCode =
    | 'OK'
    | 'VALIDATION_ERROR'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'IDEMPOTENCY_CONFLICT'
    | 'BUSINESS_RULE_VIOLATION'
    | 'INTERNAL_ERROR'
    | number

export interface ApiResponse<T> {
    code: ApiCode
    message: string
    data: T
    traceId?: string
}

export interface PageResult<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
}

export interface ListQuery {
    page: number
    pageSize: number
    keyword?: string
    status?: string
    startAt?: string
    endAt?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface ApiErrorData {
    fieldErrors?: Record<string, string>
    retryable?: boolean
    details?: Record<string, unknown>
}

export type LegacyListQuery = Pick<ListQuery, 'page' | 'pageSize' | 'keyword' | 'status'>
