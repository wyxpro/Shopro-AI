import type {
    CreateRefundRequest,
    CreditLedgerEntry,
    GrantEntitlementResult,
    Order,
    PaymentEvent,
    PlanSnapshot,
    RefundRequest
} from '@/types'
import type {DemoDatabase} from '../db'

export class BillingRuleError extends Error {
}

function requireOrder(data: DemoDatabase, orderId: string): Order {
    const order = data.orders.find((item) => item.id === orderId)
    if (!order) throw new BillingRuleError('订单不存在')
    return order
}

function requireRefund(data: DemoDatabase, refundId: string): RefundRequest {
    const refund = data.refunds.find((item) => item.id === refundId)
    if (!refund) throw new BillingRuleError('退款申请不存在')
    return refund
}

function requireUser(data: DemoDatabase, userId: string) {
    const user = data.users.find((item) => item.id === userId)
    if (!user) throw new BillingRuleError('订单所属用户不存在')
    return user
}

function addPaymentEvent(data: DemoDatabase, input: Omit<PaymentEvent, 'id' | 'createdAt'>): PaymentEvent {
    const existing = data.paymentEvents.find((item) => item.idempotencyKey === input.idempotencyKey)
    if (existing) return existing
    const event: PaymentEvent = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
    }
    data.paymentEvents.unshift(event)
    return event
}

function createOrderGrantEntry(data: DemoDatabase, order: Order): CreditLedgerEntry | undefined {
    const idempotencyKey = `entitlement-credit-${order.id}`
    const existing = data.creditLedger.find((item) => item.idempotencyKey === idempotencyKey)
    if (existing) return undefined
    const user = requireUser(data, order.userId)
    const timestamp = new Date().toISOString()
    const entry: CreditLedgerEntry = {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: user.organizationId,
        type: 'PAYMENT_GRANT',
        direction: 'CREDIT',
        amount: order.planSnapshot.grantedCredits,
        balanceBefore: user.creditBalance,
        balanceAfter: user.creditBalance + order.planSnapshot.grantedCredits,
        bizType: 'ORDER',
        bizId: order.id,
        reasonCode: 'PAYMENT_ENTITLEMENT_REGRANT',
        reason: '支付成功后重新发放套餐积分权益。',
        idempotencyKey,
        operatorId: 'admin-1',
        createdAt: timestamp,
    }
    user.creditBalance = entry.balanceAfter
    user.updatedAt = timestamp
    data.creditLedger.unshift(entry)
    return entry
}

export function regrantOrderEntitlement(data: DemoDatabase, orderId: string): GrantEntitlementResult {
    const order = requireOrder(data, orderId)
    const grantKey = `entitlement-granted-${order.id}`
    const existingEvent = data.paymentEvents.find((item) => item.idempotencyKey === grantKey)
    if (order.entitlementStatus === 'GRANTED' || existingEvent) {
        if (!existingEvent) throw new BillingRuleError('订单权益状态与支付事件不一致，无法重复发放')
        return {order, alreadyGranted: true, paymentEvent: existingEvent}
    }
    if (order.paymentStatus !== 'PAID' || order.entitlementStatus !== 'FAILED') {
        throw new BillingRuleError('仅支付成功但权益发放失败的订单可以重新发放')
    }

    const creditEntry = createOrderGrantEntry(data, order)
    const event = addPaymentEvent(data, {
        orderId: order.id,
        type: 'ENTITLEMENT_GRANTED',
        channelEventId: `manual-regrant-${order.id}`,
        payloadSummary: '运营人工触发权益补发，支付回调幂等键保持唯一。',
        processed: true,
        idempotencyKey: grantKey,
    })
    order.entitlementStatus = 'GRANTED'
    order.updatedAt = event.createdAt
    return {order, alreadyGranted: false, paymentEvent: event, creditEntry}
}

export function createRefundRequest(data: DemoDatabase, payload: CreateRefundRequest): RefundRequest {
    const order = requireOrder(data, payload.orderId)
    if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIALLY_REFUNDED') {
        throw new BillingRuleError('仅已支付订单可以发起退款申请')
    }
    if (!Number.isInteger(payload.amountMinor) || payload.amountMinor <= 0 || payload.amountMinor > order.amountMinor) {
        throw new BillingRuleError('退款金额必须是订单金额范围内的最小货币单位整数')
    }
    if (!Number.isInteger(payload.reclaimCredits) || payload.reclaimCredits < 0 || payload.reclaimCredits > order.planSnapshot.grantedCredits) {
        throw new BillingRuleError('需回收积分不正确')
    }
    if (!payload.reasonCode.trim() || !payload.reason.trim()) throw new BillingRuleError('退款必须填写原因码和详细原因')
    const ticket = data.tickets.find((item) => item.id === payload.ticketId)
    if (!ticket || ticket.orderId !== order.id) throw new BillingRuleError('退款申请必须关联该订单的工单')

    const timestamp = new Date().toISOString()
    const refund: RefundRequest = {
        id: crypto.randomUUID(),
        orderId: order.id,
        userId: order.userId,
        amountMinor: payload.amountMinor,
        status: 'PENDING_APPROVAL',
        reasonCode: payload.reasonCode.trim(),
        reason: payload.reason.trim(),
        reclaimCredits: payload.reclaimCredits,
        ticketId: ticket.id,
        requesterId: 'admin-1',
        createdAt: timestamp,
        updatedAt: timestamp,
    }
    data.refunds.unshift(refund)
    addPaymentEvent(data, {
        orderId: order.id,
        type: 'REFUND_REQUESTED',
        channelEventId: `refund-request-${refund.id}`,
        payloadSummary: `已发起退款申请，金额 ${refund.amountMinor} 分。`,
        processed: true,
        idempotencyKey: `refund-request-${refund.id}`,
    })
    return refund
}

export function approveRefundRequest(data: DemoDatabase, refundId: string, reason: string): RefundRequest {
    const refund = requireRefund(data, refundId)
    if (refund.status !== 'PENDING_APPROVAL') throw new BillingRuleError('仅待审批退款可以通过')
    if (!reason.trim()) throw new BillingRuleError('请填写退款审批意见')
    refund.status = 'APPROVED'
    refund.approverId = 'admin-1'
    refund.updatedAt = new Date().toISOString()
    return refund
}

export function rejectRefundRequest(data: DemoDatabase, refundId: string, reason: string): RefundRequest {
    const refund = requireRefund(data, refundId)
    if (refund.status !== 'PENDING_APPROVAL') throw new BillingRuleError('仅待审批退款可以拒绝')
    if (!reason.trim()) throw new BillingRuleError('请填写拒绝退款原因')
    refund.status = 'REJECTED'
    refund.approverId = 'admin-1'
    refund.updatedAt = new Date().toISOString()
    return refund
}

export function startRefundExecution(data: DemoDatabase, refundId: string): RefundRequest {
    const refund = requireRefund(data, refundId)
    if (refund.status !== 'APPROVED') throw new BillingRuleError('退款尚未审批通过')
    refund.status = 'PROCESSING'
    refund.updatedAt = new Date().toISOString()
    return refund
}

export function completeRefundExecution(data: DemoDatabase, refundId: string): RefundRequest {
    const refund = requireRefund(data, refundId)
    if (refund.status !== 'PROCESSING') throw new BillingRuleError('退款不处于执行中状态')
    const order = requireOrder(data, refund.orderId)
    const timestamp = new Date().toISOString()
    const simulateFailure = refund.reasonCode === 'CHANNEL_FAILURE_DEMO'
    const user = requireUser(data, refund.userId)
    const reclaimKey = `refund-reclaim-${refund.id}`
    const existingReclaim = data.creditLedger.find((item) => item.idempotencyKey === reclaimKey)
    if (simulateFailure || (!existingReclaim && user.creditBalance < refund.reclaimCredits)) {
        refund.status = 'FAILED'
        refund.updatedAt = timestamp
        addPaymentEvent(data, {
            orderId: order.id,
            type: 'REFUND_FAILED',
            channelEventId: `refund-failed-${refund.id}`,
            payloadSummary: simulateFailure ? 'Demo 模拟渠道退款失败。' : '用户积分不足，退款权益回收失败。',
            processed: true,
            idempotencyKey: `refund-failed-${refund.id}`,
        })
        return refund
    }

    if (!existingReclaim && refund.reclaimCredits > 0) {
        const entry: CreditLedgerEntry = {
            id: crypto.randomUUID(),
            userId: user.id,
            organizationId: user.organizationId,
            type: 'REFUND_RECLAIM',
            direction: 'DEBIT',
            amount: refund.reclaimCredits,
            balanceBefore: user.creditBalance,
            balanceAfter: user.creditBalance - refund.reclaimCredits,
            bizType: 'REFUND',
            bizId: refund.id,
            reasonCode: refund.reasonCode,
            reason: `退款成功，回收套餐权益积分：${refund.reason}`,
            idempotencyKey: reclaimKey,
            operatorId: 'admin-1',
            createdAt: timestamp,
        }
        user.creditBalance = entry.balanceAfter
        user.updatedAt = timestamp
        data.creditLedger.unshift(entry)
    }
    refund.status = 'SUCCEEDED'
    refund.channelRefundId = `demo-refund-${refund.id.slice(0, 8)}`
    refund.updatedAt = timestamp
    order.paymentStatus = refund.amountMinor >= order.amountMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
    order.entitlementStatus = 'RECLAIMED'
    order.updatedAt = timestamp
    addPaymentEvent(data, {
        orderId: order.id,
        type: 'REFUND_SUCCEEDED',
        channelEventId: refund.channelRefundId,
        payloadSummary: `退款执行成功，金额 ${refund.amountMinor} 分。`,
        processed: true,
        idempotencyKey: `refund-succeeded-${refund.id}`,
    })
    return refund
}

export function createPlanVersion(data: DemoDatabase, payload: PlanSnapshot): PlanSnapshot {
    const currentVersions = data.plans.filter((item) => item.planId === payload.planId)
    if (currentVersions.length === 0) throw new BillingRuleError('请基于已有套餐创建新版本')
    if (!Number.isInteger(payload.priceMinor) || payload.priceMinor < 0 || !Number.isInteger(payload.grantedCredits) || payload.grantedCredits < 0 || !Number.isInteger(payload.seatLimit) || payload.seatLimit <= 0 || !Number.isInteger(payload.validityDays) || payload.validityDays <= 0) {
        throw new BillingRuleError('套餐价格、积分、席位和有效期不正确')
    }
    const version: PlanSnapshot = {
        ...payload,
        version: Math.max(...currentVersions.map((item) => item.version)) + 1,
        capabilities: [...payload.capabilities],
    }
    data.plans.unshift(version)
    return version
}
