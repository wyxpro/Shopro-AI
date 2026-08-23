import {http} from 'msw'
import {permissionsByRole} from '@/constants/permissions'
import type {AdminRole, AdminUser} from '@/types'
import {roleFromRequest} from '../domain/permission-rules'
import {ok} from './utils'

function adminForRole(role: AdminRole): AdminUser {
    const profiles: Record<AdminRole, Omit<AdminUser, 'permissions'>> = {
        SUPER_ADMIN: {id: 'admin-1', name: 'Shopro 管理员', email: 'admin@shopro.ai', role: 'SUPER_ADMIN'},
        OPERATIONS: {id: 'admin-operations', name: '运营专员', email: 'operator@shopro.ai', role: 'OPERATIONS'},
        RISK_REVIEWER: {id: 'admin-risk', name: '风险审核员', email: 'reviewer@shopro.ai', role: 'RISK_REVIEWER'},
        FINANCE: {id: 'admin-finance', name: '财务专员', email: 'finance@shopro.ai', role: 'FINANCE'},
    }
    return {...profiles[role], permissions: [...permissionsByRole[role]]}
}

function roleForEmail(email: string): AdminRole {
    if (email.toLowerCase() === 'operator@shopro.ai') return 'OPERATIONS'
    if (email.toLowerCase() === 'reviewer@shopro.ai') return 'RISK_REVIEWER'
    if (email.toLowerCase() === 'finance@shopro.ai') return 'FINANCE'
    return 'SUPER_ADMIN'
}

export const authHandlers = [
    http.post('/api/admin/auth/login', async ({request}) => {
        const body: unknown = await request.json().catch(() => ({}))
        const email = typeof body === 'object' && body !== null && 'email' in body && typeof body.email === 'string' ? body.email : 'admin@shopro.ai'
        return ok(adminForRole(roleForEmail(email)))
    }),
    http.get('/api/admin/auth/me', ({request}) => ok(adminForRole(roleFromRequest(request)))),
    http.post('/api/admin/auth/logout', () => ok(null)),
]
