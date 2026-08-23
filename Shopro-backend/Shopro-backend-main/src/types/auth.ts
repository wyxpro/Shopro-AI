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
