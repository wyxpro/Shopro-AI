import {http} from 'msw'
import {permissionsByRole} from '@/constants/permissions'
import type {AdminRole, ApprovalRequest, AuditLogQuery, RoleDefinition, SearchResult, SystemAdmin} from '@/types'
import {isDemoMode, readDemoDatabase, resetDemoDatabase} from '../db'
import {requestHasPermission} from '../domain/permission-rules'
import {forbidden, ok, paginate} from './utils'

const admins: SystemAdmin[] = [
    {
        id: 'admin-1',
        name: 'Shopro 管理员',
        email: 'admin@shopro.ai',
        roleIds: ['SUPER_ADMIN'],
        status: 'ACTIVE',
        lastActiveAt: '2026-08-20T08:00:00.000Z',
        createdAt: '2026-08-01T08:00:00.000Z'
    },
    {
        id: 'admin-operations',
        name: '运营专员',
        email: 'operator@shopro.ai',
        roleIds: ['OPERATIONS'],
        status: 'ACTIVE',
        createdAt: '2026-08-01T08:00:00.000Z'
    },
    {
        id: 'admin-risk',
        name: '风险审核员',
        email: 'reviewer@shopro.ai',
        roleIds: ['RISK_REVIEWER'],
        status: 'ACTIVE',
        createdAt: '2026-08-01T08:00:00.000Z'
    },
    {
        id: 'admin-finance',
        name: '财务专员',
        email: 'finance@shopro.ai',
        roleIds: ['FINANCE'],
        status: 'ACTIVE',
        createdAt: '2026-08-01T08:00:00.000Z'
    },
]

const roleDescriptions: Record<AdminRole, string> = {
    SUPER_ADMIN: '拥有所有后台管理权限。',
    OPERATIONS: '负责客户、工作流和日常运营处理。',
    RISK_REVIEWER: '负责风险事件审核与申诉复核。',
    FINANCE: '负责订单、退款审批及套餐版本管理。',
}

const roles: RoleDefinition[] = (Object.keys(permissionsByRole) as AdminRole[]).map((role) => ({
    id: role,
    name: role,
    description: roleDescriptions[role],
    permissions: [...permissionsByRole[role]],
    builtIn: true,
}))

function queryFrom(url: URL): AuditLogQuery {
    const result = url.searchParams.get('result')
    return {
        page: Math.max(1, Number(url.searchParams.get('page') || 1)),
        pageSize: Math.max(1, Number(url.searchParams.get('pageSize') || 10)),
        keyword: url.searchParams.get('keyword') || undefined,
        targetType: url.searchParams.get('targetType') || undefined,
        operatorId: url.searchParams.get('operatorId') || undefined,
        result: result === 'SUCCESS' || result === 'FAILED' ? result : undefined,
        action: url.searchParams.get('action') || undefined,
        startAt: url.searchParams.get('startAt') || undefined,
        endAt: url.searchParams.get('endAt') || undefined,
    }
}

function pageAuditLogs(query: AuditLogQuery) {
    const items = readDemoDatabase().auditLogs.filter((item) => {
        const keyword = query.keyword?.toLowerCase()
        return (!keyword || [item.targetId, item.action, item.operatorName, item.reason || '', item.traceId].some((value) => value.toLowerCase().includes(keyword)))
            && (!query.targetType || item.targetType === query.targetType)
            && (!query.operatorId || item.operatorId === query.operatorId)
            && (!query.result || item.result === query.result)
            && (!query.action || item.action.includes(query.action))
            && (!query.startAt || item.createdAt >= query.startAt)
            && (!query.endAt || item.createdAt <= `${query.endAt}T23:59:59.999Z`)
    }).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    return {
        items: items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: items.length,
        page: query.page,
        pageSize: query.pageSize
    }
}

function approvalQueue(): ApprovalRequest[] {
    const data = readDemoDatabase()
    const credits: ApprovalRequest[] = data.creditApprovals.map((approval) => ({
        id: approval.id,
        type: 'CREDIT_ADJUSTMENT',
        status: approval.status,
        requesterId: approval.requesterId,
        targetType: 'CUSTOMER_USER',
        targetId: approval.userId,
        reason: approval.reason,
        createdAt: approval.createdAt,
    }))
    const refunds: ApprovalRequest[] = data.refunds.filter((refund) => refund.status === 'PENDING_APPROVAL').map((refund) => ({
        id: refund.id,
        type: 'REFUND',
        status: 'PENDING',
        requesterId: refund.requesterId,
        targetType: 'ORDER',
        targetId: refund.orderId,
        reason: refund.reason,
        createdAt: refund.createdAt,
    }))
    return [...credits, ...refunds].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function search(query: string): SearchResult[] {
    const normalized = query.trim().toLowerCase()
    if (normalized.length < 2) return []
    const data = readDemoDatabase()
    const includes = (...values: string[]): boolean => values.some((value) => value.toLowerCase().includes(normalized))
    return [
        ...data.users.filter((item) => includes(item.id, item.name, item.email)).map((item) => ({
            id: item.id,
            category: 'USER' as const,
            title: item.name,
            description: `${item.id} · ${item.email}`,
            route: `/customers/users/${item.id}`
        })),
        ...data.organizations.filter((item) => includes(item.id, item.name)).map((item) => ({
            id: item.id,
            category: 'ORGANIZATION' as const,
            title: item.name,
            description: item.id,
            route: `/users?organization=${encodeURIComponent(item.name)}`
        })),
        ...data.orders.filter((item) => includes(item.id, item.planSnapshot.name)).map((item) => ({
            id: item.id,
            category: 'ORDER' as const,
            title: item.id,
            description: `${item.planSnapshot.name} · ${item.paymentStatus}`,
            route: `/billing/orders/${item.id}`
        })),
        ...data.workflows.filter((item) => includes(item.id, item.productName)).map((item) => ({
            id: item.id,
            category: 'WORKFLOW' as const,
            title: `${item.id} · ${item.productName}`,
            description: item.status,
            route: `/ai-operations/workflows/${item.id}`
        })),
        ...data.jobs.filter((item) => includes(item.id, item.name)).map((item) => ({
            id: item.id,
            category: 'JOB' as const,
            title: `${item.id} · ${item.name}`,
            description: item.status,
            route: `/ai-operations/workflows/${item.workflowId}`
        })),
        ...data.contents.filter((item) => includes(item.id, item.title)).map((item) => ({
            id: item.id,
            category: 'CONTENT' as const,
            title: item.title,
            description: item.id,
            route: `/risk/events?keyword=${encodeURIComponent(item.id)}`
        })),
        ...data.tickets.filter((item) => includes(item.id, item.title)).map((item) => ({
            id: item.id,
            category: 'TICKET' as const,
            title: item.title,
            description: item.id,
            route: `/tickets/${item.id}`
        })),
    ].slice(0, 20)
}

export const systemHandlers = [
    http.get('/api/admin/system/health', ({request}) => requestHasPermission(request, 'system:view') ? ok(readDemoDatabase().serviceHealth) : forbidden()),
    http.get('/api/admin/system/audit-logs', ({request}) => requestHasPermission(request, 'system:view') ? ok(pageAuditLogs(queryFrom(new URL(request.url)))) : forbidden()),
    http.get('/api/admin/system/admins', ({request}) => requestHasPermission(request, 'system:view') ? ok(admins) : forbidden()),
    http.get('/api/admin/system/roles', ({request}) => requestHasPermission(request, 'system:view') ? ok(roles) : forbidden()),
    http.get('/api/admin/system/approvals', ({request}) => requestHasPermission(request, 'system:approvals:view') ? ok(paginate(approvalQueue(), new URL(request.url))) : forbidden()),
    http.get('/api/admin/search', ({request}) => requestHasPermission(request, 'search:use') ? ok(search(new URL(request.url).searchParams.get('q') || '')) : forbidden()),
    ...(isDemoMode() ? [
        http.post('/api/admin/demo/reset', ({request}) => {
            if (!requestHasPermission(request, 'system:demo:reset')) return forbidden()
            resetDemoDatabase()
            return ok(true)
        }),
    ] : []),
]
