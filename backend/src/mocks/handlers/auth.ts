import {http} from 'msw'
import {permissionsByRole} from '@/constants/permissions'
import type {AdminUser, SystemAdmin} from '@/types'
import {adminDirectory, adminRoleOf, findAdminByEmail, findAdminById} from '../domain/admin-registry'
import {adminFromRequest} from '../domain/permission-rules'
import {ok, unauthorized} from './utils'

function toAdminUser(admin: SystemAdmin): AdminUser {
    const role = adminRoleOf(admin)
    return {id: admin.id, name: admin.name, email: admin.email, role, permissions: [...permissionsByRole[role]]}
}

export const authHandlers = [
    http.post('/api/admin/auth/login', async ({request}) => {
        const body: unknown = await request.json().catch(() => ({}))
        const email = typeof body === 'object' && body !== null && 'email' in body && typeof body.email === 'string' ? body.email : 'admin@shopro.ai'
        // 演示登录：邮箱命中服务端管理员目录则以其真实角色登录，未知邮箱回退超级管理员账号。
        const admin = findAdminByEmail(email) ?? adminDirectory[0]
        return ok(toAdminUser(admin))
    }),
    http.get('/api/admin/auth/me', ({request}) => {
        // fail-close：无合法主体（缺省/非法 x-shopro-admin-id）一律 401，不再回退超级管理员。
        const actor = adminFromRequest(request)
        if (!actor) return unauthorized()
        const admin = findAdminById(actor.id)
        return ok(admin ? toAdminUser(admin) : {...actor, permissions: [...permissionsByRole[actor.role]]})
    }),
    http.post('/api/admin/auth/logout', () => ok(null)),
]
