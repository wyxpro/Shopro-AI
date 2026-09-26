import {http} from 'msw'
import {PERMISSIONS} from '@/constants/permissions'
import type {
    AdminActor,
    CreateRefundRequest,
    Order,
    OrderListItem,
    OrderListQuery,
    OrderSummary,
    PlanSnapshot,
    RefundRequest,
} from '@/types'
import {readDemoDatabase, transactDemoDatabase} from '../db'
import {recordAudit} from '../domain/audit-rules'
import {
    approveRefundRequest,
    createPlanVersion,
    createRefundRequest,
    regrantOrderEntitlement,
    rejectRefundRequest,
} from '../domain/billing-rules'
import {scheduleSideEffect} from '../domain/side-effects'
import {authorize, notFound, ok, paginate, respondDomainError, validationError} from './utils'

const paymentStatuses: Order['paymentStatus'][] = ['CREATED', 'PENDING', 'PAID', 'CLOSED', 'PARTIALLY_REFUNDED', 'REFUNDED']
const entitlementStatuses: Order['entitlementStatus'][] = ['PENDING', 'GRANTED', 'FAILED', 'RECLAIMED']
const refundStatuses: RefundRequest['status'][] = ['PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REJECTED']

function orderQueryFrom(url: URL): OrderListQuery {
    const paymentStatus = url.searchParams.get('paymentStatus')
    const entitlementStatus = url.searchParams.get('entitlementStatus')
    return {
        page: Math.max(1, Number(url.searchParams.get('page') || 1)),
        pageSize: Math.max(1, Number(url.searchParams.get('pageSize') || 10)),
        keyword: url.searchParams.get('keyword') || undefined,
        userId: url.searchParams.get('userId') || undefined,
        paymentStatus: paymentStatuses.includes(paymentStatus as Order['paymentStatus']) ? paymentStatus as Order['paymentStatus'] : undefined,
        entitlementStatus: entitlementStatuses.includes(entitlementStatus as Order['entitlementStatus']) ? entitlementStatus as Order['entitlementStatus'] : undefined,
    }
}

function filterOrders(data: ReturnType<typeof readDemoDatabase>, query: OrderListQuery): OrderListItem[] {
    return data.orders
        .filter((order) => {
            const user = data.users.find((item) => item.id === order.userId)
            const keyword = query.keyword?.toLowerCase()
            return (!keyword || [order.id, order.planSnapshot.name, user?.name || ''].some((item) => item.toLowerCase().includes(keyword)))
                && (!query.userId || order.userId === query.userId)
                && (!query.paymentStatus || order.paymentStatus === query.paymentStatus)
                && (!query.entitlementStatus || order.entitlementStatus === query.entitlementStatus)
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((order) => {
            const user = data.users.find((item) => item.id === order.userId)
            const organization = order.organizationId ? data.organizations.find((item) => item.id === order.organizationId) : undefined
            return {...order, userName: user?.name || '未知用户', organizationName: organization?.name}
        })
}

function pageOrders(data: ReturnType<typeof readDemoDatabase>, query: OrderListQuery) {
    const items = filterOrders(data, query)
    return {
        items: items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: items.length,
        page: query.page,
        pageSize: query.pageSize,
    }
}

/** 后端聚合订单 KPI，替代前端拉取 pageSize:200 自行汇总。 */
function summarizeOrders(data: ReturnType<typeof readDemoDatabase>, query: OrderListQuery): OrderSummary {
    const scope = filterOrders(data, query)
    const paidOrders = scope.filter((order) => ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.paymentStatus))
    const paidAmountMinor = paidOrders.reduce((sum, order) => sum + order.amountMinor, 0)
    const scopeIds = new Set(scope.map((order) => order.id))
    const succeededRefundAmountMinor = data.refunds
        .filter((refund) => refund.status === 'SUCCEEDED' && scopeIds.has(refund.orderId))
        .reduce((sum, refund) => sum + refund.amountMinor, 0)
    const failedEntitlementCount = scope.filter((order) => order.paymentStatus === 'PAID' && order.entitlementStatus === 'FAILED').length
    return {
        currency: 'CNY',
        paidAmountMinor,
        succeededRefundAmountMinor,
        refundRatePercent: paidAmountMinor > 0 ? Math.round((succeededRefundAmountMinor / paidAmountMinor) * 1000) / 10 : 0,
        failedEntitlementCount,
    }
}

function isRefundPayload(value: unknown): value is CreateRefundRequest {
    return typeof value === 'object' && value !== null
        && 'orderId' in value && typeof value.orderId === 'string'
        && 'amountMinor' in value && typeof value.amountMinor === 'number'
        && 'reasonCode' in value && typeof value.reasonCode === 'string'
        && 'reason' in value && typeof value.reason === 'string'
        && 'reclaimCredits' in value && typeof value.reclaimCredits === 'number'
        && 'ticketId' in value && typeof value.ticketId === 'string'
}

function reasonFrom(value: unknown): string | undefined {
    return typeof value === 'object' && value !== null && 'reason' in value && typeof value.reason === 'string' ? value.reason.trim() || undefined : undefined
}

function isPlanSnapshot(value: unknown): value is PlanSnapshot {
    return typeof value === 'object' && value !== null
        && 'planId' in value && typeof value.planId === 'string'
        && 'version' in value && typeof value.version === 'number'
        && 'name' in value && typeof value.name === 'string'
        && 'priceMinor' in value && typeof value.priceMinor === 'number'
        && 'currency' in value && (value.currency === 'CNY' || value.currency === 'USD')
        && 'grantedCredits' in value && typeof value.grantedCredits === 'number'
        && 'validityDays' in value && typeof value.validityDays === 'number'
        && 'seatLimit' in value && typeof value.seatLimit === 'number'
        && 'capabilities' in value && Array.isArray(value.capabilities) && value.capabilities.every((item) => typeof item === 'string')
}

export const billingHandlers = [
    http.get('/api/admin/billing/orders', ({request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_VIEW)
        if (auth instanceof Response) return auth
        return ok(pageOrders(readDemoDatabase(), orderQueryFrom(new URL(request.url))))
    }),
    http.get('/api/admin/billing/summary', ({request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_VIEW)
        if (auth instanceof Response) return auth
        return ok(summarizeOrders(readDemoDatabase(), orderQueryFrom(new URL(request.url))))
    }),
    http.get('/api/admin/billing/orders/:id', ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_VIEW)
        if (auth instanceof Response) return auth
        const orderId = typeof params.id === 'string' ? params.id : undefined
        if (!orderId) return validationError('订单 ID 不正确')
        const data = readDemoDatabase()
        const order = data.orders.find((item) => item.id === orderId)
        if (!order) return notFound('订单不存在')
        const user = data.users.find((item) => item.id === order.userId)
        if (!user) return notFound('订单所属用户不存在')
        const refunds = data.refunds.filter((item) => item.orderId === order.id)
        const refundIds = new Set(refunds.map((item) => item.id))
        const paymentEvents = data.paymentEvents.filter((item) => item.orderId === order.id).sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        const paymentEventIds = new Set(paymentEvents.map((item) => item.id))
        return ok({
            order,
            user,
            organization: order.organizationId ? data.organizations.find((item) => item.id === order.organizationId) : undefined,
            paymentEvents,
            creditLedger: data.creditLedger.filter((item) => item.bizId === order.id || refundIds.has(item.bizId)),
            refunds,
            auditLogs: data.auditLogs.filter((item) => item.targetId === order.id || refundIds.has(item.targetId) || paymentEventIds.has(item.targetId)).slice(0, 30),
        })
    }),
    http.post('/api/admin/billing/orders/:id/regrant-entitlement', ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_ENTITLEMENT_GRANT)
        if (auth instanceof Response) return auth
        const actor = auth as AdminActor
        const orderId = typeof params.id === 'string' ? params.id : undefined
        if (!orderId) return validationError('订单 ID 不正确')
        try {
            const result = transactDemoDatabase((data) => {
                const before = data.orders.find((item) => item.id === orderId)
                const beforeStatus = before?.entitlementStatus
                const granted = regrantOrderEntitlement(data, orderId, actor)
                recordAudit(data, {
                    actor,
                    action: granted.alreadyGranted ? `订单 ${orderId} 权益补发幂等命中` : `订单 ${orderId} 重新发放套餐权益`,
                    targetType: 'ORDER',
                    targetId: orderId,
                    reason: 'PAYMENT_PAID_ENTITLEMENT_FAILED',
                    before: {entitlementStatus: beforeStatus},
                    after: {
                        entitlementStatus: granted.order.entitlementStatus,
                        paymentEventId: granted.paymentEvent.id,
                        creditLedgerId: granted.creditEntry?.id
                    },
                })
                return granted
            })
            return ok(result)
        } catch (error: unknown) {
            return respondDomainError(error, '重新发放权益失败')
        }
    }),
    http.get('/api/admin/billing/refunds', ({request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_VIEW)
        if (auth instanceof Response) return auth
        const data = readDemoDatabase()
        const url = new URL(request.url)
        const status = url.searchParams.get('status')
        const items = data.refunds.filter((refund) => !status || refund.status === status).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        return ok(paginate(items, url))
    }),
    http.post('/api/admin/billing/refunds', async ({request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_REFUND_CREATE)
        if (auth instanceof Response) return auth
        const actor = auth as AdminActor
        const payload: unknown = await request.json().catch(() => undefined)
        if (!isRefundPayload(payload)) return validationError('退款申请参数不完整')
        try {
            const refund = transactDemoDatabase((data) => {
                const created = createRefundRequest(data, payload, actor)
                recordAudit(data, {
                    actor,
                    action: `发起订单 ${created.orderId} 的退款申请`,
                    targetType: 'REFUND_REQUEST',
                    targetId: created.id,
                    reason: created.reason,
                    ticketId: created.ticketId,
                    after: {
                        status: created.status,
                        amountMinor: created.amountMinor,
                        reclaimCredits: created.reclaimCredits
                    },
                })
                return created
            })
            return ok(refund)
        } catch (error: unknown) {
            return respondDomainError(error, '创建退款申请失败')
        }
    }),
    http.post('/api/admin/billing/refunds/:id/approve', async ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_REFUND_APPROVE)
        if (auth instanceof Response) return auth
        const actor = auth as AdminActor
        const refundId = typeof params.id === 'string' ? params.id : undefined
        const reason = reasonFrom(await request.json().catch(() => undefined))
        if (!refundId || !reason) return validationError('请填写退款审批意见')
        try {
            const refund = transactDemoDatabase((data) => {
                const approved = approveRefundRequest(data, refundId, reason, actor)
                recordAudit(data, {
                    actor,
                    action: `审批通过退款 ${approved.id}`,
                    targetType: 'REFUND_REQUEST',
                    targetId: approved.id,
                    reason,
                    ticketId: approved.ticketId,
                    after: {
                        status: approved.status,
                        amountMinor: approved.amountMinor,
                        reclaimCredits: approved.reclaimCredits
                    },
                })
                return approved
            })
            // 退款执行不再用浏览器闭包 setTimeout，改由集中化副作用推进器模拟渠道异步回调。
            scheduleSideEffect('refund-start', refund.id, 600)
            return ok(refund)
        } catch (error: unknown) {
            return respondDomainError(error, '审批退款失败')
        }
    }),
    http.post('/api/admin/billing/refunds/:id/reject', async ({params, request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_REFUND_APPROVE)
        if (auth instanceof Response) return auth
        const actor = auth as AdminActor
        const refundId = typeof params.id === 'string' ? params.id : undefined
        const reason = reasonFrom(await request.json().catch(() => undefined))
        if (!refundId || !reason) return validationError('请填写拒绝退款原因')
        try {
            const refund = transactDemoDatabase((data) => {
                const rejected = rejectRefundRequest(data, refundId, reason, actor)
                recordAudit(data, {
                    actor,
                    action: `拒绝退款 ${rejected.id}`,
                    targetType: 'REFUND_REQUEST',
                    targetId: rejected.id,
                    reason,
                    ticketId: rejected.ticketId,
                    after: {status: rejected.status},
                })
                return rejected
            })
            return ok(refund)
        } catch (error: unknown) {
            return respondDomainError(error, '拒绝退款失败')
        }
    }),
    // 预留端点：全量积分流水当前无专门页面（按用户维度已在 customers/credit-ledger 展示），保留供财务对账页接入。
    http.get('/api/admin/billing/credit-ledger', ({request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_VIEW)
        if (auth instanceof Response) return auth
        return ok(paginate(readDemoDatabase().creditLedger, new URL(request.url)))
    }),
    http.get('/api/admin/billing/plans', ({request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_VIEW)
        if (auth instanceof Response) return auth
        return ok([...readDemoDatabase().plans].sort((left, right) => left.planId.localeCompare(right.planId) || right.version - left.version))
    }),
    http.post('/api/admin/billing/plans', async ({request}) => {
        const auth = authorize(request, PERMISSIONS.BILLING_PLAN_MANAGE)
        if (auth instanceof Response) return auth
        const actor = auth as AdminActor
        const payload: unknown = await request.json().catch(() => undefined)
        if (!isPlanSnapshot(payload)) return validationError('套餐版本参数不完整')
        try {
            const plan = transactDemoDatabase((data) => {
                const created = createPlanVersion(data, payload)
                recordAudit(data, {
                    actor,
                    action: `创建套餐 ${created.name} v${created.version}`,
                    targetType: 'PLAN_VERSION',
                    targetId: `${created.planId}@${created.version}`,
                    reason: '套餐价格或权益调整创建新版本',
                    after: {...created, capabilities: [...created.capabilities]},
                })
                return created
            })
            return ok(plan)
        } catch (error: unknown) {
            return respondDomainError(error, '创建套餐版本失败')
        }
    }),
]
