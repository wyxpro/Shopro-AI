import type {ApiCode} from '@/types'

/**
 * 领域校验/守卫错误的统一类型，携带语义化 `ApiCode`，
 * 使 handler 能把「未找到 / 状态冲突 / 幂等冲突 / 业务规则」映射到 404/409/422 等真实状态码，
 * 而不是统统返回 400 VALIDATION_ERROR。迁移后端时对应 REST 异常处理器抛出的业务错误码。
 */
export class DomainError extends Error {
    constructor(public readonly code: ApiCode, message: string) {
        super(message)
        this.name = 'DomainError'
    }
}

export function isDomainError(error: unknown): error is DomainError {
    return error instanceof DomainError
}
