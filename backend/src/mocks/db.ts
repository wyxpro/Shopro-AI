import type {
    AuditLog,
    CapabilityRestriction,
    ContentAsset,
    CreditAdjustmentApproval,
    CreditLedgerEntry,
    CustomerUser,
    Job,
    JobAttempt,
    Order,
    Organization,
    PaymentEvent,
    PlanSnapshot,
    RefundRequest,
    RiskEvent,
    ServiceHealth,
    SupportTicket,
    Workflow,
} from '@/types'
import {createSeed} from './seed'

const storageKey = 'shopro-admin-demo'
const schemaVersion = 2

export interface DemoDatabase {
    schemaVersion: 2
    organizations: Organization[]
    users: CustomerUser[]
    creditLedger: CreditLedgerEntry[]
    creditApprovals: CreditAdjustmentApproval[]
    capabilityRestrictions: CapabilityRestriction[]
    tickets: SupportTicket[]
    workflows: Workflow[]
    jobs: Job[]
    jobAttempts: JobAttempt[]
    contents: ContentAsset[]
    riskEvents: RiskEvent[]
    orders: Order[]
    paymentEvents: PaymentEvent[]
    refunds: RefundRequest[]
    plans: PlanSnapshot[]
    auditLogs: AuditLog[]
    serviceHealth: ServiceHealth[]
}

function isSchemaV2(value: unknown): value is DemoDatabase {
    if (typeof value !== 'object' || value === null || !('schemaVersion' in value) || value.schemaVersion !== schemaVersion) return false
    const candidate = value as Partial<DemoDatabase>
    const requiredCollections = [
        'organizations', 'users', 'creditLedger', 'creditApprovals', 'capabilityRestrictions', 'tickets',
        'workflows', 'jobs', 'jobAttempts', 'contents', 'riskEvents', 'orders', 'paymentEvents',
        'refunds', 'plans', 'auditLogs', 'serviceHealth',
    ]
    const hasCollections = requiredCollections.every((key) => Array.isArray(candidate[key as keyof DemoDatabase]))
    if (!hasCollections) return false
    const attempts = candidate.jobAttempts
    const ledger = candidate.creditLedger
    const riskEvents = candidate.riskEvents
    const paymentEvents = candidate.paymentEvents
    const refunds = candidate.refunds
    return Array.isArray(attempts)
        && attempts.some((attempt) => typeof attempt === 'object' && attempt !== null && 'jobId' in attempt && attempt.jobId === 'j2')
        && Array.isArray(ledger)
        && ledger.some((entry) => typeof entry === 'object' && entry !== null && 'idempotencyKey' in entry && entry.idempotencyKey === 'job-consumption-j1')
        && Array.isArray(riskEvents)
        && riskEvents.some((event) => typeof event === 'object' && event !== null && 'id' in event && event.id === 'SCENARIO_RISK_HIGH_PENDING')
        && Array.isArray(paymentEvents)
        && paymentEvents.some((event) => typeof event === 'object' && event !== null && 'orderId' in event && event.orderId === 'SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED')
        && Array.isArray(refunds)
        && refunds.some((refund) => typeof refund === 'object' && refund !== null && 'id' in refund && refund.id === 'SCENARIO_REFUND_PENDING_APPROVAL')
}

export function isDemoMode(): boolean {
    return (import.meta.env.VITE_APP_MODE || 'demo') === 'demo'
}

export function readDemoDatabase(): DemoDatabase {
    const raw = localStorage.getItem(storageKey)
    if (raw === null) {
        const initial = createSeed()
        localStorage.setItem(storageKey, JSON.stringify(initial))
        return initial
    }

    try {
        const parsed: unknown = JSON.parse(raw)
        if (isSchemaV2(parsed)) return parsed
    } catch {
        // Demo 环境会在下方以稳定种子恢复，非 Demo 环境会显式失败。
    }

    if (!isDemoMode()) {
        throw new Error('演示数据版本不匹配；非 Demo 环境不会自动重置本地数据。')
    }

    const initial = createSeed()
    localStorage.setItem(storageKey, JSON.stringify(initial))
    return initial
}

export function writeDemoDatabase(data: DemoDatabase): void {
    localStorage.setItem(storageKey, JSON.stringify(data))
}

export function transactDemoDatabase<T>(operation: (data: DemoDatabase) => T): T {
    const data = readDemoDatabase()
    const result = operation(data)
    writeDemoDatabase(data)
    return result
}

export function resetDemoDatabase(): void {
    if (!isDemoMode()) {
        throw new Error('当前环境不允许重置演示数据。')
    }
    localStorage.removeItem(storageKey)
}
