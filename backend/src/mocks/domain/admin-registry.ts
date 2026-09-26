import type {AdminRole, SystemAdmin} from '@/types'

/**
 * 服务端管理员目录（Demo 内置）。
 * 真实后端应由用户表/权限服务提供，此处模拟「以签名主体 id 在服务端解析角色」的能力：
 * handler 只信任请求携带的管理员 id（x-shopro-admin-id），角色一律以本目录为准，
 * 客户端的 x-shopro-admin-role 头不再作为授权依据，因此篡改角色头无效。
 */
export const adminDirectory: SystemAdmin[] = [
    {
        id: 'admin-1',
        name: 'Shopro 管理员',
        email: 'admin@shopro.ai',
        roleIds: ['SUPER_ADMIN'],
        status: 'ACTIVE',
        lastActiveAt: '2026-08-20T08:00:00.000Z',
        createdAt: '2026-08-01T08:00:00.000Z',
    },
    {
        id: 'admin-operations',
        name: '运营专员',
        email: 'operator@shopro.ai',
        roleIds: ['OPERATIONS'],
        status: 'ACTIVE',
        createdAt: '2026-08-01T08:00:00.000Z',
    },
    {
        id: 'admin-risk',
        name: '风险审核员',
        email: 'reviewer@shopro.ai',
        roleIds: ['RISK_REVIEWER'],
        status: 'ACTIVE',
        createdAt: '2026-08-01T08:00:00.000Z',
    },
    {
        id: 'admin-finance',
        name: '财务专员',
        email: 'finance@shopro.ai',
        roleIds: ['FINANCE'],
        status: 'ACTIVE',
        createdAt: '2026-08-01T08:00:00.000Z',
    },
]

export function findAdminById(id: string | null): SystemAdmin | undefined {
    if (!id) return undefined
    return adminDirectory.find((admin) => admin.id === id)
}

export function findAdminByEmail(email: string): SystemAdmin | undefined {
    const normalized = email.trim().toLowerCase()
    return adminDirectory.find((admin) => admin.email.toLowerCase() === normalized)
}

export function adminRoleOf(admin: SystemAdmin): AdminRole {
    return admin.roleIds[0] as AdminRole
}

/** 系统/服务身份：用于无请求主体的异步回调、自动退款、调度推进等场景的审计与账本操作人。 */
export const SERVICE_ACTOR = {
    id: 'system',
    name: '平台服务',
    email: 'system@shopro.ai',
    role: 'SUPER_ADMIN',
} as const
