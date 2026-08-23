import {http} from 'msw'
import type {DashboardData, DashboardMetric, DashboardQuery, DashboardTodo, DashboardTrendPoint} from '@/api/dashboard'
import type {Job, RiskEvent} from '@/types'
import {readDemoDatabase} from '../db'
import {requestHasPermission} from '../domain/permission-rules'
import {forbidden, ok} from './utils'

function dateOnly(value: string): string {
    return value.slice(0, 10)
}

function dateAt(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`)
}

function shiftDate(value: string, days: number): string {
    const date = dateAt(value)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
}

function rangeDays(startAt: string, endAt: string): number {
    return Math.max(1, Math.round((dateAt(endAt).getTime() - dateAt(startAt).getTime()) / 86_400_000) + 1)
}

function queryFrom(url: URL): DashboardQuery {
    return {startAt: url.searchParams.get('startAt') || undefined, endAt: url.searchParams.get('endAt') || undefined}
}

function periodFor(query: DashboardQuery): DashboardData['period'] {
    const data = readDemoDatabase()
    const latest = [
        ...data.jobs.map((item) => item.updatedAt),
        ...data.orders.map((item) => item.updatedAt),
        ...data.riskEvents.map((item) => item.updatedAt),
    ].sort().slice(-1)[0] || new Date().toISOString()
    const endAt = query.endAt || dateOnly(latest)
    const startAt = query.startAt || shiftDate(endAt, -6)
    const days = rangeDays(startAt, endAt)
    return {startAt, endAt, compareStartAt: shiftDate(startAt, -days), compareEndAt: shiftDate(startAt, -1)}
}

function inPeriod(timestamp: string, startAt: string, endAt: string): boolean {
    const date = dateOnly(timestamp)
    return date >= startAt && date <= endAt
}

function valueForPeriod(startAt: string, endAt: string): Array<{ value: number }> {
    const data = readDemoDatabase()
    const jobs = data.jobs.filter((item) => inPeriod(item.createdAt, startAt, endAt))
    const terminal = jobs.filter((item) => ['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'EXPIRED', 'CANCELLED'].includes(item.status))
    const fulfillment = terminal.length ? Math.round((terminal.filter((item) => item.status === 'SUCCEEDED').length / terminal.length) * 10_000) / 100 : 0
    const orders = data.orders.filter((item) => inPeriod(item.createdAt, startAt, endAt) && ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(item.paymentStatus))
    const paidAmount = orders.reduce((sum, item) => sum + item.amountMinor, 0)
    const refundedAmount = data.refunds.filter((item) => item.status === 'SUCCEEDED' && inPeriod(item.updatedAt, startAt, endAt)).reduce((sum, item) => sum + item.amountMinor, 0)
    const riskTodos = data.riskEvents.filter((item) => inPeriod(item.createdAt, startAt, endAt) && ['PENDING_REVIEW', 'APPEAL_PENDING', 'ESCALATED'].includes(item.status)).length
    const serviceImpact = data.serviceHealth.filter((item) => item.status !== 'HEALTHY').reduce((sum, item) => sum + item.affectedJobs, 0)
    return [{value: fulfillment}, {value: paidAmount - refundedAmount}, {value: riskTodos}, {value: serviceImpact}]
}

function compare(current: number, previous: number): number {
    if (previous === 0) return current === 0 ? 0 : 100
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

function metricsFor(period: DashboardData['period']): DashboardMetric[] {
    const current = valueForPeriod(period.startAt, period.endAt)
    const previous = valueForPeriod(period.compareStartAt, period.compareEndAt)
    const definitions: Array<Pick<DashboardMetric, 'key' | 'label' | 'format'>> = [
        {key: 'AI_FULFILLMENT', label: 'AI 履约成功率', format: 'percent'},
        {key: 'NET_REVENUE', label: '净支付金额', format: 'money'},
        {key: 'RISK_TODOS', label: '风险待办', format: 'number'},
        {key: 'SERVICE_IMPACT', label: '受影响任务', format: 'number'},
    ]
    return definitions.map((definition, index) => ({
        ...definition,
        value: current[index].value,
        previousValue: previous[index].value,
        delta: compare(current[index].value, previous[index].value)
    }))
}

function trendFor(period: DashboardData['period']): DashboardTrendPoint[] {
    const data = readDemoDatabase()
    const days = rangeDays(period.startAt, period.endAt)
    return Array.from({length: Math.min(days, 31)}, (_, index) => {
        const date = shiftDate(period.startAt, index)
        return {date, jobs: data.jobs.filter((job) => dateOnly(job.createdAt) === date).length}
    })
}

function distributionFor(period: DashboardData['period']): DashboardData['distribution'] {
    const jobs = readDemoDatabase().jobs.filter((item) => inPeriod(item.createdAt, period.startAt, period.endAt))
    return [
        {name: '成功', value: jobs.filter((item) => item.status === 'SUCCEEDED').length},
        {
            name: '运行中',
            value: jobs.filter((item) => item.status === 'RUNNING' || item.status === 'QUEUED' || item.status === 'WAITING').length
        },
        {name: '失败', value: jobs.filter((item) => ['FAILED', 'TIMED_OUT', 'EXPIRED'].includes(item.status)).length},
        {name: '已取消', value: jobs.filter((item) => item.status === 'CANCELLED').length},
    ]
}

function todoForFailure(job: Job): DashboardTodo {
    return {
        id: `job-${job.id}`,
        title: `${job.name}：已扣积分但未完成退款`,
        category: 'WORKFLOW',
        status: job.status,
        severity: 'HIGH',
        route: '/ai-operations?needsAttention=true'
    }
}

function todoForRisk(event: RiskEvent): DashboardTodo {
    return {
        id: `risk-${event.id}`,
        title: `风险复核：${event.riskType}`,
        category: 'RISK',
        status: event.status,
        severity: event.severity,
        route: `/risk/events?status=${event.status}`
    }
}

function todosFor(): DashboardTodo[] {
    const data = readDemoDatabase()
    const workflowTodos = data.jobs.filter((job) => ['FAILED', 'TIMED_OUT', 'EXPIRED'].includes(job.status) && job.creditsCharged > job.creditsRefunded).map(todoForFailure)
    const billingTodos = data.orders.filter((order) => order.paymentStatus === 'PAID' && order.entitlementStatus === 'FAILED').map((order) => ({
        id: `billing-${order.id}`,
        title: `支付成功但权益未到账：${order.planSnapshot.name}`,
        category: 'BILLING' as const,
        status: 'ENTITLEMENT_FAILED',
        severity: 'HIGH' as const,
        route: '/billing/orders?entitlementStatus=FAILED'
    }))
    const riskTodos = data.riskEvents.filter((event) => ['PENDING_REVIEW', 'APPEAL_PENDING', 'ESCALATED'].includes(event.status)).map(todoForRisk)
    const refundTodos = data.refunds.filter((refund) => refund.status === 'PENDING_APPROVAL').map((refund) => ({
        id: `refund-${refund.id}`,
        title: `退款待审批：${refund.orderId}`,
        category: 'BILLING' as const,
        status: refund.status,
        severity: 'MEDIUM' as const,
        route: '/billing/orders?tab=refunds&status=PENDING_APPROVAL'
    }))
    const serviceTodos = data.serviceHealth.filter((health) => health.status !== 'HEALTHY').map((health) => ({
        id: `service-${health.id}`,
        title: `${health.provider} 服务${health.status === 'OUTAGE' ? '中断' : '降级'}`,
        category: 'SERVICE' as const,
        status: health.status,
        severity: health.status === 'OUTAGE' ? 'CRITICAL' as const : 'MEDIUM' as const,
        route: '/system?tab=health'
    }))
    return [...billingTodos, ...workflowTodos, ...riskTodos, ...refundTodos, ...serviceTodos]
}

function dashboard(query: DashboardQuery): DashboardData {
    const period = periodFor(query)
    return {
        period,
        metrics: metricsFor(period),
        trend: trendFor(period),
        distribution: distributionFor(period),
        todos: todosFor()
    }
}

export const dashboardHandlers = [
    http.get('/api/admin/dashboard', ({request}) => requestHasPermission(request, 'dashboard:view') ? ok(dashboard(queryFrom(new URL(request.url)))) : forbidden()),
    http.get('/api/admin/dashboard/todos', ({request}) => requestHasPermission(request, 'dashboard:view') ? ok(todosFor()) : forbidden()),
]
