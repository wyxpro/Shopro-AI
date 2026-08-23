export interface PlanSnapshot {
    planId: string
    version: number
    name: string
    priceMinor: number
    currency: 'CNY' | 'USD'
    grantedCredits: number
    validityDays: number
    seatLimit: number
    capabilities: string[]
}

export interface Order {
    id: string
    userId: string
    organizationId?: string
    planSnapshot: PlanSnapshot
    amountMinor: number
    currency: 'CNY' | 'USD'
    paymentStatus: 'CREATED' | 'PENDING' | 'PAID' | 'CLOSED' | 'PARTIALLY_REFUNDED' | 'REFUNDED'
    entitlementStatus: 'PENDING' | 'GRANTED' | 'FAILED' | 'RECLAIMED'
    channel: 'WECHAT' | 'ALIPAY' | 'STRIPE' | 'MANUAL_DEMO'
    channelTransactionId?: string
    createdAt: string
    paidAt?: string
    closedAt?: string
    updatedAt: string
}

export interface PaymentEvent {
    id: string
    orderId: string
    type: 'PAYMENT_CREATED' | 'CALLBACK_RECEIVED' | 'PAYMENT_CONFIRMED' | 'ENTITLEMENT_GRANTED' | 'ENTITLEMENT_FAILED' | 'REFUND_REQUESTED' | 'REFUND_SUCCEEDED' | 'REFUND_FAILED'
    channelEventId: string
    payloadSummary: string
    processed: boolean
    idempotencyKey: string
    createdAt: string
}

export interface RefundRequest {
    id: string
    orderId: string
    userId: string
    amountMinor: number
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REJECTED'
    reasonCode: string
    reason: string
    reclaimCredits: number
    ticketId?: string
    requesterId: string
    approverId?: string
    channelRefundId?: string
    createdAt: string
    updatedAt: string
}

export interface OrderListQuery extends ListQuery {
    paymentStatus?: Order['paymentStatus']
    entitlementStatus?: Order['entitlementStatus']
    userId?: string
}

export interface OrderListItem extends Order {
    userName: string
    organizationName?: string
}

export interface OrderDetail {
    order: Order
    user: CustomerUser
    organization?: Organization
    paymentEvents: PaymentEvent[]
    creditLedger: CreditLedgerEntry[]
    refunds: RefundRequest[]
    auditLogs: AuditLog[]
}

export interface CreateRefundRequest {
    orderId: string
    amountMinor: number
    reasonCode: string
    reason: string
    reclaimCredits: number
    ticketId: string
}

export interface RefundDecisionRequest {
    reason: string
}

export interface GrantEntitlementResult {
    order: Order
    alreadyGranted: boolean
    paymentEvent: PaymentEvent
    creditEntry?: CreditLedgerEntry
}

import type {ListQuery} from './api'
import type {CreditLedgerEntry} from './credit'
import type {CustomerUser, Organization} from './customer'
import type {AuditLog} from './system'
