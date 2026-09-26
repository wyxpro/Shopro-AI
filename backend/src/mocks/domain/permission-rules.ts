import {hasPermission, permissionsByRole} from '@/constants/permissions'
import type {AdminActor, AdminRole} from '@/types'
import {adminRoleOf, findAdminById} from './admin-registry'

const roles: AdminRole[] = ['SUPER_ADMIN', 'OPERATIONS', 'RISK_REVIEWER', 'FINANCE']

/**
 * 从请求解析服务端认证主体（fail-close）。
 * 仅信任管理员 id（对应真实后端的签名 token subject），角色一律由服务端管理员目录解析；
 * 缺省 / 非法 id / 目录不存在 一律返回 null（视为未认证），不再回退 SUPER_ADMIN。
 */
export function adminFromRequest(request: Request): AdminActor | null {
    const admin = findAdminById(request.headers.get('x-shopro-admin-id'))
    if (!admin) return null
    const role = adminRoleOf(admin)
    if (!roles.includes(role)) return null
    return {id: admin.id, name: admin.name, email: admin.email, role}
}

/** @deprecated 保留给 /auth/me 复用；语义已改为 fail-close（无合法主体返回 null）。 */
export function roleFromRequest(request: Request): AdminRole | null {
    return adminFromRequest(request)?.role ?? null
}

export function actorHasPermission(actor: AdminActor, permission: string): boolean {
    return hasPermission(permissionsByRole[actor.role], permission)
}

/**
 * 请求级权限校验（fail-close）：无合法主体或角色不含该权限均返回 false。
 * 需要区分 401（未认证）与 403（越权）的调用方应改用 handler 层的 authorize()。
 */
export function requestHasPermission(request: Request, permission: string): boolean {
    const actor = adminFromRequest(request)
    return !!actor && actorHasPermission(actor, permission)
}
