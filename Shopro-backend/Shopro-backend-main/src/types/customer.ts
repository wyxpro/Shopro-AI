import type {Order, RefundRequest} from './billing'
import type {CreditLedgerEntry} from './credit'
import type {RiskEvent} from './risk'
import type {AuditLog} from './system'
import type {SupportTicket} from './ticket'
import type {Job, Workflow} from './workflow'

export interface UserCapabilities {
    login: 'ENABLED' | 'DISABLED'
    generation: 'ENABLED' | 'DISABLED'
    publishing: 'ENABLED' | 'DISABLED'
    api: 'ENABLED' | 'DISABLED'
}

export interface Organization {
    id: string
    name: string
    type: 'INDIVIDUAL' | 'BUSINESS'
    ownerUserId: string
    planId?: string
    seatLimit: number
    memberCount: number
    status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
    createdAt: string
    updatedAt: string
}

export interface CustomerUser {
    id: string
    organizationId?: string
    name: string
    email: string
    phoneMasked?: string
    accountType: 'INDIVIDUAL' | 'BUSINESS_OWNER' | 'BUSINESS_MEMBER'
    planName: string
    planExpiresAt?: string
    creditBalance: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    capabilities: UserCapabilities
    lastActiveAt?: string
    createdAt: string
    updatedAt: string
}

export interface UpdateUserCapabilitiesRequest {
    capabilities: Partial<UserCapabilities>
    reasonCode: 'RISK' | 'ABUSE' | 'PAYMENT' | 'USER_REQUEST' | 'MANUAL_CORRECTION'
    reason: string
    effectiveUntil?: string
    ticketId?: string
    notifyUser: boolean
}

export interface CapabilityRestriction {
    id: string
    userId: string
    capabilities: Partial<UserCapabilities>
    reasonCode: UpdateUserCapabilitiesRequest['reasonCode']
    reason: string
    effectiveUntil?: string
    ticketId?: string
    notifyUser: boolean
    operatorId: string
    createdAt: string
}

export interface CustomerUserListQuery {
    page: number
    pageSize: number
    userId?: string
    name?: string
    email?: string
    organization?: string
    planName?: string
    capability?: keyof UserCapabilities
    riskLevel?: CustomerUser['riskLevel']
    startAt?: string
    endAt?: string
}

export interface CustomerUserListItem extends CustomerUser {
    organizationName?: string
}

export interface CustomerUserDetail {
    user: CustomerUser
    organization?: Organization
    creditLedger: CreditLedgerEntry[]
    orders: Order[]
    refunds: RefundRequest[]
    workflows: Workflow[]
    failedJobs: Job[]
    riskEvents: RiskEvent[]
    tickets: SupportTicket[]
    auditLogs: AuditLog[]
    capabilityRestrictions: CapabilityRestriction[]
}

/** @deprecated 仅在阶段 A 兼容旧 /admin/users 接口，阶段 B 删除。 */
export interface LegacyUser {
    id: string
    name: string
    email: string
    type: string
    credits: number
    status: 'active' | 'disabled'
    createdAt: string
}
