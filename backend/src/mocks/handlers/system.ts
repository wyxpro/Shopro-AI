import {http} from 'msw'
import {permissionsByRole, PERMISSIONS} from '@/constants/permissions'
import type {AdminActor, AdminRole, ApprovalRequest, AuditLogQuery, RoleDefinition, SearchResult} from '@/types'
import {isDemoMode, readDemoDatabase, resetDemoDatabase, transactDemoDatabase} from '../db'
import {approveCreditAdjustment, rejectCreditAdjustment} from '../domain/credit-rules'
import {approveRefundRequest, rejectRefundRequest} from '../domain/billing-rules'
import {adminDirectory} from '../domain/admin-registry'
import {recordAudit} from '../domain/audit-rules'
import {scheduleSideEffect} from '../domain/side-effects'
import {authorize, notFound, ok, paginate, respondDomainError} from './utils'

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
        decidedAt: approval.decidedAt,
    }))
    const refunds: ApprovalRequest[] = data.refunds.map((refund) => ({
        id: refund.id,
        type: 'REFUND' as const,
        status: refund.status === 'PENDING_APPROVAL' ? 'PENDING' as const
            : refund.status === 'REJECTED' ? 'REJECTED' as const : 'APPROVED' as const,
        requesterId: refund.requesterId,
        targetType: 'ORDER',
        targetId: refund.orderId,
        reason: refund.reason,
        createdAt: refund.createdAt,
    }))
    return [...credits, ...refunds].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function reasonFromBody(body: unknown): string | undefined {
    return typeof body === 'object' && body !== null && 'reason' in body && typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : undefined
}

/**
 * 审批处置端点：先按 id 判定审批类型。
 * - CREDIT_ADJUSTMENT → 领域内 approve/reject（大额积分调整落账闭环），需 system:approvals:decide；
 * - REFUND → 代理到 billing 既有退款审批能力（避免重复实现），需 billing:refund:approve。
 */
async function decideApproval(request: Request, approvalId: string, decision: 'APPROVE' | 'REJECT') {
    const snapshot = readDemoDatabase()
    const isCredit = snapshot.creditApprovals.some((item) => item.id === approvalId)
    const isRefund = snapshot.refunds.some((item) => item.id === approvalId)
    if (!isCredit && !isRefund) return notFound('审批单不存在')

    const permission = isCredit ? PERMISSIONS.SYSTEM_APPROVALS_DECIDE : PERMISSIONS.BILLING_REFUND_APPROVE
    const auth = authorize(request, permission)
    if (auth instanceof Response) return auth
    const actor = auth as AdminActor
    const body: unknown = await request.json().catch(() => undefined)
    const reason = reasonFromBody(body)

    try {
        if (isCredit) {
            const result = transactDemoDatabase((data) => {
                if (decision === 'APPROVE') {
                    const {approval, entry} = approveCreditAdjustment(data, approvalId, actor)
                    recordAudit(data, {
                        actor,
                        action: `审批通过大额积分调整 ${approvalId}`,
                        targetType: 'CREDIT_ADJUSTMENT_APPROVAL',
                        targetId: approval.id,
                        reason: approval.reason,
                        after: {status: approval.status, ledgerEntryId: entry.id},
                    })
                    return approval
                }
                const approval = rejectCreditAdjustment(data, approvalId, actor)
                recordAudit(data, {
                    actor,
                    action: `审批驳回大额积分调整 ${approvalId}`,
                    targetType: 'CREDIT_ADJUSTMENT_APPROVAL',
                    targetId: approval.id,
                    reason: reason ?? approval.reason,
                    after: {status: approval.status},
                })
                return approval
            })
            return ok(result)
        }

        const refundReason = reason ?? (decision === 'APPROVE' ? '审批中心通过' : '审批中心驳回')
        const refund = transactDemoDatabase((data) => {
            const decided = decision === 'APPROVE'
                ? approveRefundRequest(data, approvalId, refundReason, actor)
                : rejectRefundRequest(data, approvalId, refundReason, actor)
            recordAudit(data, {
                actor,
                action: decision === 'APPROVE' ? `审批中心通过退款 ${decided.id}` : `审批中心驳回退款 ${decided.id}`,
                targetType: 'REFUND_REQUEST',
                targetId: decided.id,
                reason: refundReason,
                ticketId: decided.ticketId,
                after: {status: decided.status},
            })
            return decided
        })
        if (decision === 'APPROVE') scheduleSideEffect('refund-start', refund.id, 600)
        return ok(refund)
    } catch (error: unknown) {
        return respondDomainError(error, decision === 'APPROVE' ? '审批通过失败' : '审批驳回失败')
    }
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
    http.get('/api/admin/system/health', ({request}) => {
        const auth = authorize(request, PERMISSIONS.SYSTEM_VIEW)
        if (auth instanceof Response) return auth
        return ok(readDemoDatabase().serviceHealth)
    }),
    http.get('/api/admin/system/audit-logs', ({request}) => {
        const auth = authorize(request, PERMISSIONS.SYSTEM_VIEW)
        if (auth instanceof Response) return auth
        return ok(pageAuditLogs(queryFrom(new URL(request.url))))
    }),
    http.get('/api/admin/system/admins', ({request}) => {
        const auth = authorize(request, PERMISSIONS.SYSTEM_VIEW)
        if (auth instanceof Response) return auth
        return ok(adminDirectory)
    }),
    http.get('/api/admin/system/roles', ({request}) => {
        const auth = authorize(request, PERMISSIONS.SYSTEM_VIEW)
        if (auth instanceof Response) return auth
        return ok(roles)
    }),
    http.get('/api/admin/system/approvals', ({request}) => {
        const auth = authorize(request, PERMISSIONS.SYSTEM_APPROVALS_VIEW)
        if (auth instanceof Response) return auth
        return ok(paginate(approvalQueue(), new URL(request.url)))
    }),
    http.post('/api/admin/system/approvals/:id/approve', async ({params, request}) => {
        const approvalId = typeof params.id === 'string' ? params.id : undefined
        if (!approvalId) return notFound('审批单不存在')
        return decideApproval(request, approvalId, 'APPROVE')
    }),
    http.post('/api/admin/system/approvals/:id/reject', async ({params, request}) => {
        const approvalId = typeof params.id === 'string' ? params.id : undefined
        if (!approvalId) return notFound('审批单不存在')
        return decideApproval(request, approvalId, 'REJECT')
    }),
    http.get('/api/admin/search', ({request}) => {
        const auth = authorize(request, PERMISSIONS.SEARCH_USE)
        if (auth instanceof Response) return auth
        return ok(search(new URL(request.url).searchParams.get('q') || ''))
    }),
    ...(isDemoMode() ? [
        http.post('/api/admin/demo/reset', ({request}) => {
            const auth = authorize(request, PERMISSIONS.SYSTEM_DEMO_RESET)
            if (auth instanceof Response) return auth
            resetDemoDatabase()
            return ok(true)
        }),
    ] : []),
]
