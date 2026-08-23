import {http} from 'msw'
import type {
    CreateCreditAdjustmentRequest,
    CustomerUser,
    CustomerUserListQuery,
    UpdateUserCapabilitiesRequest,
    UserCapabilities,
} from '@/types'
import {readDemoDatabase, transactDemoDatabase} from '../db'
import {createCreditAdjustment, CreditRuleError, updateUserCapabilities} from '../domain/credit-rules'
import {recordAudit} from '../domain/audit-rules'
import {requestHasPermission} from '../domain/permission-rules'
import {forbidden, ok, paginate, validationError} from './utils'

const capabilityKeys: Array<keyof UserCapabilities> = ['login', 'generation', 'publishing', 'api']
const reasonCodes: UpdateUserCapabilitiesRequest['reasonCode'][] = ['RISK', 'ABUSE', 'PAYMENT', 'USER_REQUEST', 'MANUAL_CORRECTION']
const creditReasonCodes: CreateCreditAdjustmentRequest['reasonCode'][] = ['SYSTEM_INCIDENT', 'CUSTOMER_COMPLAINT', 'MANUAL_CORRECTION', 'RISK_PENALTY']

function asNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isCustomerListQuery(value: URLSearchParams): CustomerUserListQuery {
    return {
        page: Math.max(1, Number(value.get('page') || 1)),
        pageSize: Math.max(1, Number(value.get('pageSize') || 10)),
        userId: value.get('userId') || undefined,
        name: value.get('name') || undefined,
        email: value.get('email') || undefined,
        organization: value.get('organization') || undefined,
        planName: value.get('planName') || undefined,
        capability: capabilityKeys.includes(value.get('capability') as keyof UserCapabilities)
            ? value.get('capability') as keyof UserCapabilities
            : undefined,
        riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(value.get('riskLevel') || '')
            ? value.get('riskLevel') as CustomerUser['riskLevel']
            : undefined,
        startAt: value.get('startAt') || undefined,
        endAt: value.get('endAt') || undefined,
    }
}

function matches(value: string, query?: string): boolean {
    return !query || value.toLowerCase().includes(query.toLowerCase())
}

function pageCustomerUsers(data: ReturnType<typeof readDemoDatabase>, query: CustomerUserListQuery) {
    const items = data.users.filter((user) => {
        const organization = user.organizationId ? data.organizations.find((item) => item.id === user.organizationId) : undefined
        return matches(user.id, query.userId)
            && matches(user.name, query.name)
            && matches(user.email, query.email)
            && matches(organization?.name || '', query.organization)
            && matches(user.planName, query.planName)
            && (!query.capability || user.capabilities[query.capability] === 'ENABLED')
            && (!query.riskLevel || user.riskLevel === query.riskLevel)
            && (!query.startAt || user.createdAt >= query.startAt)
            && (!query.endAt || user.createdAt <= `${query.endAt}T23:59:59.999Z`)
    })
    return {
        items: items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map((user) => ({
            ...user,
            organizationName: user.organizationId ? data.organizations.find((item) => item.id === user.organizationId)?.name : undefined,
        })),
        total: items.length,
        page: query.page,
        pageSize: query.pageSize,
    }
}

function isCapabilityUpdate(value: unknown): value is UpdateUserCapabilitiesRequest {
    if (typeof value !== 'object' || value === null || !('capabilities' in value) || !('reasonCode' in value) || !('reason' in value) || !('notifyUser' in value)) return false
    if (typeof value.reasonCode !== 'string' || !reasonCodes.includes(value.reasonCode as UpdateUserCapabilitiesRequest['reasonCode'])) return false
    if (typeof value.reason !== 'string' || typeof value.notifyUser !== 'boolean') return false
    if (typeof value.capabilities !== 'object' || value.capabilities === null) return false
    return Object.entries(value.capabilities).every(([key, capability]) => (
        capabilityKeys.includes(key as keyof UserCapabilities)
        && (capability === 'ENABLED' || capability === 'DISABLED')
    ))
}

function isCreditAdjustment(value: unknown): value is CreateCreditAdjustmentRequest {
    if (typeof value !== 'object' || value === null) return false
    if (!('direction' in value) || !('amount' in value) || !('reasonCode' in value) || !('reason' in value) || !('idempotencyKey' in value)) return false
    return (value.direction === 'CREDIT' || value.direction === 'DEBIT')
        && typeof value.amount === 'number'
        && typeof value.reasonCode === 'string'
        && creditReasonCodes.includes(value.reasonCode as CreateCreditAdjustmentRequest['reasonCode'])
        && typeof value.reason === 'string'
        && typeof value.idempotencyKey === 'string'
        && (!('ticketId' in value) || value.ticketId === undefined || typeof value.ticketId === 'string')
        && (!('bizId' in value) || value.bizId === undefined || typeof value.bizId === 'string')
}

export const customerHandlers = [
    http.get('/api/admin/customers/users', ({request}) => {
        const data = readDemoDatabase()
        return ok(pageCustomerUsers(data, isCustomerListQuery(new URL(request.url).searchParams)))
    }),
    http.get('/api/admin/customers/users/:id', ({params}) => {
        const userId = typeof params.id === 'string' ? params.id : undefined
        if (!userId) return validationError('用户 ID 不正确')
        const data = readDemoDatabase()
        const user = data.users.find((item) => item.id === userId)
        if (!user) return validationError('用户不存在')
        const userWorkflowIds = data.workflows.filter((item) => item.userId === userId).map((item) => item.id)
        const tickets = data.tickets.filter((item) => item.userId === userId)
        const ticketIds = new Set(tickets.map((item) => item.id))
        return ok({
            user,
            organization: user.organizationId ? data.organizations.find((item) => item.id === user.organizationId) : undefined,
            creditLedger: data.creditLedger.filter((item) => item.userId === userId),
            orders: data.orders.filter((item) => item.userId === userId),
            refunds: data.refunds.filter((item) => item.userId === userId),
            workflows: data.workflows.filter((item) => item.userId === userId),
            failedJobs: data.jobs.filter((item) => userWorkflowIds.includes(item.workflowId) && (item.status === 'FAILED' || item.status === 'TIMED_OUT' || item.status === 'EXPIRED')),
            riskEvents: data.riskEvents.filter((item) => item.userId === userId),
            tickets,
            auditLogs: data.auditLogs.filter((item) => item.targetId === userId || ticketIds.has(item.targetId) || (item.ticketId ? ticketIds.has(item.ticketId) : false)).slice(0, 20),
            capabilityRestrictions: data.capabilityRestrictions.filter((item) => item.userId === userId),
        })
    }),
    http.patch('/api/admin/customers/users/:id/capabilities', async ({params, request}) => {
        if (!requestHasPermission(request, 'customers:operate')) return forbidden()
        const userId = typeof params.id === 'string' ? params.id : undefined
        const payload: unknown = await request.json()
        if (!userId || !isCapabilityUpdate(payload)) return validationError('能力状态调整参数不正确')
        try {
            const user = transactDemoDatabase((data) => {
                const existing = data.users.find((item) => item.id === userId)
                if (!existing) throw new CreditRuleError('用户不存在')
                const before = {...existing.capabilities}
                const updated = updateUserCapabilities(data, userId, payload)
                recordAudit(data, {
                    action: `调整用户 ${updated.name} 能力状态`,
                    targetType: 'CUSTOMER_USER',
                    targetId: updated.id,
                    reason: payload.reason,
                    ticketId: payload.ticketId,
                    before,
                    after: {...updated.capabilities},
                })
                return updated
            })
            return ok(user)
        } catch (error: unknown) {
            return validationError(error instanceof Error ? error.message : '能力状态调整失败')
        }
    }),
    http.get('/api/admin/customers/users/:id/credit-ledger', ({params, request}) => {
        const userId = typeof params.id === 'string' ? params.id : undefined
        if (!userId) return validationError('用户 ID 不正确')
        const data = readDemoDatabase()
        return ok(paginate(data.creditLedger.filter((item) => item.userId === userId), new URL(request.url)))
    }),
    http.post('/api/admin/customers/users/:id/credit-adjustments', async ({params, request}) => {
        if (!requestHasPermission(request, 'customers:operate')) return forbidden()
        const userId = typeof params.id === 'string' ? params.id : undefined
        const payload: unknown = await request.json()
        if (!userId || !isCreditAdjustment(payload)) return validationError('积分调整参数不正确')
        try {
            const result = transactDemoDatabase((data) => {
                const user = data.users.find((item) => item.id === userId)
                if (!user) throw new CreditRuleError('用户不存在')
                const before = {creditBalance: user.creditBalance}
                const adjustment = createCreditAdjustment(data, userId, payload)
                recordAudit(data, adjustment.status === 'APPLIED'
                    ? {
                        action: `创建用户 ${user.name} 积分流水`,
                        targetType: 'CREDIT_LEDGER_ENTRY',
                        targetId: adjustment.entry.id,
                        reason: payload.reason,
                        ticketId: payload.ticketId,
                        before,
                        after: {creditBalance: adjustment.entry.balanceAfter},
                    }
                    : {
                        action: `发起用户 ${user.name} 大额积分调整审批`,
                        targetType: 'CREDIT_ADJUSTMENT_APPROVAL',
                        targetId: adjustment.approval.id,
                        reason: payload.reason,
                        ticketId: payload.ticketId,
                        before,
                        after: {status: adjustment.approval.status},
                    })
                return adjustment
            })
            return ok(result)
        } catch (error: unknown) {
            return validationError(error instanceof Error ? error.message : '积分调整失败')
        }
    }),
    http.get('/api/admin/customers/organizations', ({request}) => {
        const data = readDemoDatabase()
        return ok(paginate(data.organizations, new URL(request.url)))
    }),
    http.get('/api/admin/customers/organizations/:id', ({params}) => {
        const organizationId = typeof params.id === 'string' ? params.id : undefined
        const data = readDemoDatabase()
        const organization = data.organizations.find((item) => item.id === organizationId)
        if (!organization) return validationError('企业不存在')
        return ok(organization)
    }),
]
