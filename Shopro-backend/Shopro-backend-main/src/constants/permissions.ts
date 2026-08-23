import type {AdminRole} from '@/types'

export const permissionsByRole: Record<AdminRole, string[]> = {
    SUPER_ADMIN: ['*'],
    OPERATIONS: [
        'dashboard:view', 'customers:view', 'customers:operate', 'workflow:view', 'workflow:operate',
        'risk:view', 'billing:view', 'billing:refund:create', 'search:use',
    ],
    RISK_REVIEWER: [
        'dashboard:view', 'customers:view', 'workflow:view', 'risk:view', 'risk:decide', 'search:use',
    ],
    FINANCE: [
        'dashboard:view', 'customers:view', 'billing:view', 'billing:refund:create', 'billing:refund:approve',
        'billing:entitlement:grant', 'billing:plan:manage', 'system:view', 'system:approvals:view', 'search:use',
    ],
}

export function hasPermission(permissions: string[], permission: string): boolean {
    return permissions.includes('*') || permissions.includes(permission)
}
