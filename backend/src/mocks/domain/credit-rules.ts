import type {
    AdminActor,
    ApiCode,
    CreateCreditAdjustmentRequest,
    CreateCreditReversalRequest,
    CreditAdjustmentApproval,
    CreditAdjustmentResult,
    CreditEntryType,
    CreditLedgerEntry,
    CustomerUser,
    UpdateUserCapabilitiesRequest,
} from '@/types'
import type {DemoDatabase} from '../db'
import {DomainError} from './errors'

const largeAdjustmentThreshold = 1000

export class CreditRuleError extends DomainError {
    constructor(message: string, code: ApiCode = 'BUSINESS_RULE_VIOLATION') {
        super(code, message)
        this.name = 'CreditRuleError'
    }
}

function requireUser(data: DemoDatabase, userId: string): CustomerUser {
    const user = data.users.find((item) => item.id === userId)
    if (!user) throw new CreditRuleError('用户不存在', 'NOT_FOUND')
    return user
}

function entryTypeFor(payload: CreateCreditAdjustmentRequest): CreditEntryType {
    if (payload.reasonCode === 'CUSTOMER_COMPLAINT') return 'CUSTOMER_COMPENSATION'
    if (payload.reasonCode === 'RISK_PENALTY') return 'MANUAL_CORRECTION'
    return 'MANUAL_CORRECTION'
}

function hasSameRequest(
    approval: CreditAdjustmentApproval,
    userId: string,
    payload: CreateCreditAdjustmentRequest,
): boolean {
    return approval.userId === userId
        && approval.direction === payload.direction
        && approval.amount === payload.amount
        && approval.reasonCode === payload.reasonCode
        && approval.reason === payload.reason
        && approval.ticketId === payload.ticketId
        && approval.bizId === payload.bizId
}

function hasSameLedgerRequest(
    entry: CreditLedgerEntry,
    userId: string,
    payload: CreateCreditAdjustmentRequest,
): boolean {
    return entry.userId === userId
        && entry.direction === payload.direction
        && entry.amount === payload.amount
        && entry.reasonCode === payload.reasonCode
        && entry.reason === payload.reason.trim()
        && (!payload.ticketId || entry.bizId === payload.ticketId)
}

function validateAdjustment(payload: CreateCreditAdjustmentRequest): void {
    if (!Number.isInteger(payload.amount) || payload.amount <= 0) {
        throw new CreditRuleError('积分金额必须为正整数', 'VALIDATION_ERROR')
    }
    if (!payload.reason.trim()) {
        throw new CreditRuleError('请填写详细调整原因', 'VALIDATION_ERROR')
    }
    if (payload.reasonCode === 'CUSTOMER_COMPLAINT' && !payload.ticketId) {
        throw new CreditRuleError('客诉补偿必须关联工单', 'VALIDATION_ERROR')
    }
    if (!payload.idempotencyKey.trim()) {
        throw new CreditRuleError('缺少幂等键', 'VALIDATION_ERROR')
    }
}

interface AdjustmentParams {
    direction: CreateCreditAdjustmentRequest['direction']
    amount: number
    reasonCode: CreateCreditAdjustmentRequest['reasonCode']
    reason: string
    ticketId?: string
    bizId?: string
    idempotencyKey: string
}

/** 落一条调整类积分流水（不可变账本），更新用户余额；供小额直投与审批通过复用。 */
function writeAdjustmentLedger(
    data: DemoDatabase,
    user: CustomerUser,
    params: AdjustmentParams,
    actor: AdminActor,
): CreditLedgerEntry {
    const existing = data.creditLedger.find((item) => item.idempotencyKey === params.idempotencyKey)
    if (existing) return existing
    const balanceBefore = user.creditBalance
    const balanceAfter = params.direction === 'CREDIT' ? balanceBefore + params.amount : balanceBefore - params.amount
    if (balanceAfter < 0) {
        throw new CreditRuleError('扣减后积分余额不能小于 0', 'BUSINESS_RULE_VIOLATION')
    }
    const entry: CreditLedgerEntry = {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: user.organizationId,
        type: entryTypeFor(params),
        direction: params.direction,
        amount: params.amount,
        balanceBefore,
        balanceAfter,
        bizType: params.ticketId ? 'TICKET' : 'MANUAL',
        bizId: params.ticketId || params.bizId || 'manual-adjustment',
        reasonCode: params.reasonCode,
        reason: params.reason.trim(),
        idempotencyKey: params.idempotencyKey,
        operatorId: actor.id,
        createdAt: new Date().toISOString(),
    }
    user.creditBalance = balanceAfter
    user.updatedAt = entry.createdAt
    data.creditLedger.unshift(entry)
    return entry
}

export function createCreditAdjustment(
    data: DemoDatabase,
    userId: string,
    payload: CreateCreditAdjustmentRequest,
    actor: AdminActor,
): CreditAdjustmentResult {
    validateAdjustment(payload)
    const existingEntry = data.creditLedger.find((item) => item.idempotencyKey === payload.idempotencyKey)
    if (existingEntry) {
        if (!hasSameLedgerRequest(existingEntry, userId, payload)) {
            throw new CreditRuleError('幂等键已被不同请求使用', 'IDEMPOTENCY_CONFLICT')
        }
        return {status: 'APPLIED', entry: existingEntry}
    }

    const existingApproval = data.creditApprovals.find((item) => item.idempotencyKey === payload.idempotencyKey)
    if (existingApproval) {
        if (!hasSameRequest(existingApproval, userId, payload)) {
            throw new CreditRuleError('幂等键已被不同请求使用', 'IDEMPOTENCY_CONFLICT')
        }
        return {status: 'PENDING_APPROVAL', approval: existingApproval}
    }

    const user = requireUser(data, userId)
    if (payload.amount >= largeAdjustmentThreshold) {
        const approval: CreditAdjustmentApproval = {
            id: crypto.randomUUID(),
            userId,
            direction: payload.direction,
            amount: payload.amount,
            reasonCode: payload.reasonCode,
            reason: payload.reason.trim(),
            ticketId: payload.ticketId,
            bizId: payload.bizId,
            idempotencyKey: payload.idempotencyKey,
            status: 'PENDING',
            requesterId: actor.id,
            createdAt: new Date().toISOString(),
        }
        data.creditApprovals.unshift(approval)
        return {status: 'PENDING_APPROVAL', approval}
    }

    return {status: 'APPLIED', entry: writeAdjustmentLedger(data, user, payload, actor)}
}

function requirePendingApproval(data: DemoDatabase, approvalId: string): CreditAdjustmentApproval {
    const approval = data.creditApprovals.find((item) => item.id === approvalId)
    if (!approval) throw new CreditRuleError('审批单不存在', 'NOT_FOUND')
    if (approval.status !== 'PENDING') throw new CreditRuleError('该审批已处置，不能重复操作', 'CONFLICT')
    return approval
}

/** 审批通过：落 APPLIED 流水、更新余额、审批置终态。 */
export function approveCreditAdjustment(
    data: DemoDatabase,
    approvalId: string,
    actor: AdminActor,
): {approval: CreditAdjustmentApproval; entry: CreditLedgerEntry} {
    const approval = requirePendingApproval(data, approvalId)
    const user = requireUser(data, approval.userId)
    const entry = writeAdjustmentLedger(data, user, {
        direction: approval.direction,
        amount: approval.amount,
        reasonCode: approval.reasonCode,
        reason: approval.reason,
        ticketId: approval.ticketId,
        bizId: approval.bizId,
        idempotencyKey: approval.idempotencyKey,
    }, actor)
    approval.status = 'APPROVED'
    approval.approverId = actor.id
    approval.decidedAt = new Date().toISOString()
    approval.ledgerEntryId = entry.id
    return {approval, entry}
}

/** 审批驳回：仅置终态，不产生任何流水。 */
export function rejectCreditAdjustment(data: DemoDatabase, approvalId: string, actor: AdminActor): CreditAdjustmentApproval {
    const approval = requirePendingApproval(data, approvalId)
    approval.status = 'REJECTED'
    approval.approverId = actor.id
    approval.decidedAt = new Date().toISOString()
    return approval
}

/**
 * 冲正：为一条已落账流水生成方向相反的 REVERSAL 流水并回填 reversedEntryId，
 * 原流水保持不可变。幂等：同一流水重复冲正返回既有冲正记录。
 */
export function reverseCreditEntry(
    data: DemoDatabase,
    entryId: string,
    payload: CreateCreditReversalRequest,
    actor: AdminActor,
): CreditLedgerEntry {
    const original = data.creditLedger.find((item) => item.id === entryId)
    if (!original) throw new CreditRuleError('积分流水不存在', 'NOT_FOUND')
    if (original.type === 'REVERSAL') throw new CreditRuleError('冲正流水不能再次冲正', 'BUSINESS_RULE_VIOLATION')
    if (!payload.reason.trim()) throw new CreditRuleError('请填写冲正原因', 'VALIDATION_ERROR')
    if (!payload.idempotencyKey.trim()) throw new CreditRuleError('缺少幂等键', 'VALIDATION_ERROR')

    const existingReversal = data.creditLedger.find((item) => item.reversedEntryId === original.id)
    if (existingReversal) return existingReversal

    const user = requireUser(data, original.userId)
    const balanceBefore = user.creditBalance
    const direction = original.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT'
    const balanceAfter = direction === 'CREDIT' ? balanceBefore + original.amount : balanceBefore - original.amount
    if (balanceAfter < 0) {
        throw new CreditRuleError('冲正后积分余额不能小于 0', 'BUSINESS_RULE_VIOLATION')
    }
    const entry: CreditLedgerEntry = {
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: user.organizationId,
        type: 'REVERSAL',
        direction,
        amount: original.amount,
        balanceBefore,
        balanceAfter,
        bizType: original.bizType,
        bizId: original.bizId,
        reasonCode: 'MANUAL_CORRECTION',
        reason: payload.reason.trim(),
        idempotencyKey: payload.idempotencyKey,
        operatorId: actor.id,
        reversedEntryId: original.id,
        createdAt: new Date().toISOString(),
    }
    user.creditBalance = balanceAfter
    user.updatedAt = entry.createdAt
    data.creditLedger.unshift(entry)
    return entry
}

export function updateUserCapabilities(
    data: DemoDatabase,
    userId: string,
    payload: UpdateUserCapabilitiesRequest,
    actor: AdminActor,
): CustomerUser {
    if (!payload.reason.trim()) throw new CreditRuleError('请填写能力限制原因', 'VALIDATION_ERROR')
    if (Object.keys(payload.capabilities).length === 0) throw new CreditRuleError('至少选择一项需要调整的能力', 'VALIDATION_ERROR')

    const user = requireUser(data, userId)
    user.capabilities = {...user.capabilities, ...payload.capabilities}
    user.updatedAt = new Date().toISOString()
    data.capabilityRestrictions.unshift({
        id: crypto.randomUUID(),
        userId,
        capabilities: payload.capabilities,
        reasonCode: payload.reasonCode,
        reason: payload.reason.trim(),
        effectiveUntil: payload.effectiveUntil,
        ticketId: payload.ticketId,
        notifyUser: payload.notifyUser,
        operatorId: actor.id,
        createdAt: user.updatedAt,
    })
    return user
}
