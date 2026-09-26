export const errorMessages = {
    VALIDATION_ERROR: '请求参数不正确',
    UNAUTHORIZED: '登录状态已失效',
    FORBIDDEN: '当前账号没有执行此操作的权限',
    NOT_FOUND: '请求的资源不存在',
    CONFLICT: '当前状态不允许执行此操作',
    IDEMPOTENCY_CONFLICT: '重复请求与原请求不一致',
    BUSINESS_RULE_VIOLATION: '操作不符合业务规则',
    INTERNAL_ERROR: '服务暂时不可用，请稍后重试',
    NETWORK_ERROR: '网络连接异常，请检查网络后重试',
    TIMEOUT: '请求超时，请稍后重试',
} as const
