import type {
    CreateCreditAdjustmentRequest,
    CreditAdjustmentApproval,
    CreditAdjustmentResult,
    CreditEntryType,
    CreditLedgerEntry,
    CustomerUser,
    UpdateUserCapabilitiesRequest,
} from '@/types'
import type {DemoDatabase} from '../db'

const largeAdjustmentThreshold = 1000

export class CreditRuleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'CreditRuleError'
    }
}

function requireUser(data: DemoDatabase, userId: string): CustomerUser {
    const user = data.users.find((item) => item.id === userId)
    if (!user) throw new CreditRuleError('用户不存在')
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
        throw new CreditRuleError('积分金额必须为正整数')
    }
    if (!payload.reason.trim()) {
        throw new CreditRuleError('请填写详细调整原因')
    }
    if (payload.reasonCode === 'CUSTOMER_COMPLAINT' && !payload.ticketId) {
        throw new CreditRuleError('客诉补偿必须关联工单')
    }
    if (!payload.idempotencyKey.trim()) {
        throw new CreditRuleError('缺少幂等键')
    }
}

export function createCreditAdjustment(
    data: DemoDatabase,
    userId: string,
    payload: CreateCreditAdjustmentRequest,
): CreditAdjustmentResult {
    validateAdjustment(payload)
    const existingEntry = data.creditLedger.find((item) => item.idempotencyKey === payload.idempotencyKey)
    if (existingEntry) {
        if (!hasSameLedgerRequest(existingEntry, userId, payload)) {
            throw new CreditRuleError('幂等键已被不同请求使用')
        }
        return {status: 'APPLIED', entry: existingEntry}
    }

    const existingApproval = data.creditApprovals.find((item) => item.idempotencyKey === payload.idempotencyKey)
    if (existingApproval) {
        if (!hasSameRequest(existingApproval, userId, payload)) {
            throw new CreditRuleError('幂等键已被不同请求使用')
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
            requesterId: 'admin-1',
            createdAt: new Date().toISOString(),
        }
        data.creditApprovals.unshift(approval)
        return {status: 'PENDING_APPROVAL', approval}
    }

    const balanceBefore = user.creditBalance
    const balanceAfter = payload.direction === 'CREDIT'
        ? balanceBefore + payload.amount
        : balanceBefore - payload.amount
    if (balanceAfter < 0) {
        throw new CreditRuleError('扣减后积分余额不能小于 0')
    }

    const entry: CreditLedgerEntry = {
        id: crypto.randomUUID(),
        userId,
        organizationId: user.organizationId,
        type: entryTypeFor(payload),
        direction: payload.direction,
        amount: payload.amount,
        balanceBefore,
        balanceAfter,
        bizType: payload.ticketId ? 'TICKET' : 'MANUAL',
        bizId: payload.ticketId || payload.bizId || 'manual-adjustment',
        reasonCode: payload.reasonCode,
        reason: payload.reason.trim(),
        idempotencyKey: payload.idempotencyKey,
        operatorId: 'admin-1',
        createdAt: new Date().toISOString(),
    }
    user.creditBalance = balanceAfter
    user.updatedAt = entry.createdAt
    data.creditLedger.unshift(entry)
    return {status: 'APPLIED', entry}
}

export function updateUserCapabilities(
    data: DemoDatabase,
    userId: string,
    payload: UpdateUserCapabilitiesRequest,
): CustomerUser {
    if (!payload.reason.trim()) throw new CreditRuleError('请填写能力限制原因')
    if (Object.keys(payload.capabilities).length === 0) throw new CreditRuleError('至少选择一项需要调整的能力')

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
        operatorId: 'admin-1',
        createdAt: user.updatedAt,
    })
    return user
}
