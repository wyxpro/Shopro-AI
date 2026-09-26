import type {AdminRole} from '@/types'

/**
 * 权限码单一来源（Shared Permission Catalog）。
 * 前端按钮/路由门控、MSW handler 校验、以及供 Spring Boot 对接的服务端策略
 * 均应以本清单为准，禁止在业务代码里再出现裸字符串权限码。
 * 迁移后端时，这里的每个 key 对应一个服务端授权注解（如 @PreAuthorize）。
 */
export const PERMISSIONS = {
    DASHBOARD_VIEW: 'dashboard:view',
    CUSTOMERS_VIEW: 'customers:view',
    CUSTOMERS_OPERATE: 'customers:operate',
    WORKFLOW_VIEW: 'workflow:view',
    WORKFLOW_OPERATE: 'workflow:operate',
    RISK_VIEW: 'risk:view',
    RISK_DECIDE: 'risk:decide',
    BILLING_VIEW: 'billing:view',
    BILLING_REFUND_CREATE: 'billing:refund:create',
    BILLING_REFUND_APPROVE: 'billing:refund:approve',
    BILLING_ENTITLEMENT_GRANT: 'billing:entitlement:grant',
    BILLING_PLAN_MANAGE: 'billing:plan:manage',
    SYSTEM_VIEW: 'system:view',
    SYSTEM_APPROVALS_VIEW: 'system:approvals:view',
    SYSTEM_APPROVALS_DECIDE: 'system:approvals:decide',
    SYSTEM_DEMO_RESET: 'system:demo:reset',
    SEARCH_USE: 'search:use',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** 通配权限：仅超级管理员持有，代表全权。 */
export const WILDCARD_PERMISSION = '*' as const

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)

export const permissionsByRole: Record<AdminRole, string[]> = {
    SUPER_ADMIN: [WILDCARD_PERMISSION],
    OPERATIONS: [
        PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_OPERATE,
        PERMISSIONS.WORKFLOW_VIEW, PERMISSIONS.WORKFLOW_OPERATE, PERMISSIONS.RISK_VIEW,
        PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_REFUND_CREATE, PERMISSIONS.SEARCH_USE,
    ],
    RISK_REVIEWER: [
        PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.WORKFLOW_VIEW,
        PERMISSIONS.RISK_VIEW, PERMISSIONS.RISK_DECIDE, PERMISSIONS.SEARCH_USE,
    ],
    FINANCE: [
        PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.BILLING_VIEW,
        PERMISSIONS.BILLING_REFUND_CREATE, PERMISSIONS.BILLING_REFUND_APPROVE,
        PERMISSIONS.BILLING_ENTITLEMENT_GRANT, PERMISSIONS.BILLING_PLAN_MANAGE,
        PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_APPROVALS_VIEW, PERMISSIONS.SYSTEM_APPROVALS_DECIDE,
        PERMISSIONS.SEARCH_USE,
    ],
}

export function hasPermission(permissions: string[], permission: string): boolean {
    return permissions.includes(WILDCARD_PERMISSION) || permissions.includes(permission)
}
