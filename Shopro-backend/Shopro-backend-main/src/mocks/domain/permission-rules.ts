import {hasPermission, permissionsByRole} from '@/constants/permissions'
import type {AdminRole} from '@/types'

const roles: AdminRole[] = ['SUPER_ADMIN', 'OPERATIONS', 'RISK_REVIEWER', 'FINANCE']

export function roleFromRequest(request: Request): AdminRole {
    const role = request.headers.get('x-shopro-admin-role')
    return roles.includes(role as AdminRole) ? role as AdminRole : 'SUPER_ADMIN'
}

export function requestHasPermission(request: Request, permission: string): boolean {
    return hasPermission(permissionsByRole[roleFromRequest(request)], permission)
}
