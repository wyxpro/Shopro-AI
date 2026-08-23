export type CreditEntryType =
    | 'PAYMENT_GRANT'
    | 'PLAN_GRANT'
    | 'PROMOTION_GRANT'
    | 'JOB_CONSUMPTION'
    | 'JOB_FAILURE_REFUND'
    | 'CUSTOMER_COMPENSATION'
    | 'REFUND_RECLAIM'
    | 'MANUAL_CORRECTION'
    | 'REVERSAL'

export interface CreditLedgerEntry {
    id: string
    userId: string
    organizationId?: string
    type: CreditEntryType
    direction: 'CREDIT' | 'DEBIT'
    amount: number
    balanceBefore: number
    balanceAfter: number
    bizType: 'ORDER' | 'WORKFLOW' | 'JOB' | 'REFUND' | 'TICKET' | 'MANUAL'
    bizId: string
    reasonCode: string
    reason: string
    idempotencyKey: string
    operatorId: string
    reversedEntryId?: string
    createdAt: string
}

export interface CreateCreditAdjustmentRequest {
    direction: 'CREDIT' | 'DEBIT'
    amount: number
    reasonCode: 'SYSTEM_INCIDENT' | 'CUSTOMER_COMPLAINT' | 'MANUAL_CORRECTION' | 'RISK_PENALTY'
    reason: string
    ticketId?: string
    bizId?: string
    idempotencyKey: string
}

export interface CreditAdjustmentApproval {
    id: string
    userId: string
    direction: CreateCreditAdjustmentRequest['direction']
    amount: number
    reasonCode: CreateCreditAdjustmentRequest['reasonCode']
    reason: string
    ticketId?: string
    bizId?: string
    idempotencyKey: string
    status: 'PENDING'
    requesterId: string
    createdAt: string
}

export type CreditAdjustmentResult =
    | { status: 'APPLIED'; entry: CreditLedgerEntry }
    | { status: 'PENDING_APPROVAL'; approval: CreditAdjustmentApproval }
