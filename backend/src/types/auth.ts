export type AdminRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'RISK_REVIEWER' | 'FINANCE'

export interface AdminUser {
    id: string
    name: string
    email: string
    role: AdminRole
    permissions: string[]
}

export interface LoginRequest {
    email: string
    password: string
}

/**
 * 服务端认证主体：由请求携带的管理员标识（Demo 中为 x-shopro-admin-id 头）
 * 在服务端管理员目录中解析得到，role 取自服务端目录而非客户端头，防止越权伪造。
 * 迁移 Spring Boot 后应由签名 token 的 subject 解析，字段保持不变即成为契约。
 */
export interface AdminActor {
    id: string
    name: string
    email: string
    role: AdminRole
}
