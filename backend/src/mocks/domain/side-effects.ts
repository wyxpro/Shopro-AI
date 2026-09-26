import {SERVICE_ACTOR} from './admin-registry'
import {recordAudit} from './audit-rules'
import {completeRefundExecution, startRefundExecution} from './billing-rules'
import {completeCancellation, completeRetryAsSuccess} from './job-rules'
import {transactDemoDatabase} from '../db'

/**
 * 集中化的异步副作用推进器（Demo 版“服务端调度/渠道回调”替身）。
 *
 * 迁移前：重试完成、取消确认、退款执行分散在各 handler 内的 window.setTimeout 闭包里，
 * 页面刷新即丢失、多标签不同步。迁移后：所有待推进的状态流转登记为可持久化的“待办副作用”，
 * 由本模块统一按到期时间执行；真实后端应把它替换为 Webhook 回调 / 定时调度，
 * 前端只需通过轮询或 SSE 读取终态——因此这里刻意与具体浏览器闭包解耦。
 *
 * 待后端接入：真正的渠道异步回调来源（Stripe/微信/支付宝、模型供应商）与分布式调度。
 */
export type SideEffectKind = 'retry-complete' | 'cancel-complete' | 'refund-start' | 'refund-complete'

export interface PendingSideEffect {
    id: string
    kind: SideEffectKind
    targetId: string
    runAt: number
}

const storageKey = 'shopro-admin-side-effects'

function loadPending(): PendingSideEffect[] {
    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return []
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed as PendingSideEffect[] : []
    } catch {
        return []
    }
}

function savePending(items: PendingSideEffect[]): void {
    localStorage.setItem(storageKey, JSON.stringify(items))
}

export function scheduleSideEffect(kind: SideEffectKind, targetId: string, delayMs: number): PendingSideEffect {
    const effect: PendingSideEffect = {id: crypto.randomUUID(), kind, targetId, runAt: Date.now() + delayMs}
    const pending = loadPending()
    pending.push(effect)
    savePending(pending)
    return effect
}

function applyEffect(effect: PendingSideEffect): void {
    if (effect.kind === 'retry-complete') {
        transactDemoDatabase((data) => {
            try {
                const completed = completeRetryAsSuccess(data, effect.targetId)
                recordAudit(data, {
                    actor: SERVICE_ACTOR,
                    action: `任务 ${completed.job.name} 重试成功`,
                    targetType: 'JOB_ATTEMPT',
                    targetId: completed.attempt.id,
                    after: {jobStatus: completed.job.status, outputUrl: completed.attempt.outputUrl || ''},
                })
            } catch {
                // 数据被重置或任务已被其它流程推进时，丢弃过期回调。
            }
        })
        return
    }
    if (effect.kind === 'cancel-complete') {
        transactDemoDatabase((data) => {
            try {
                const completed = completeCancellation(data, effect.targetId)
                recordAudit(data, {
                    actor: SERVICE_ACTOR,
                    action: completed.status === 'CANCELLED' ? `任务 ${completed.name} 已取消` : `任务 ${completed.name} 取消未确认`,
                    targetType: 'JOB',
                    targetId: completed.id,
                    after: {
                        jobStatus: completed.status,
                        supplierCancellationSupported: completed.status === 'CANCELLED',
                    },
                })
            } catch {
                // 同上。
            }
        })
        return
    }
    if (effect.kind === 'refund-start') {
        transactDemoDatabase((data) => {
            try {
                const refund = startRefundExecution(data, effect.targetId)
                recordAudit(data, {
                    actor: SERVICE_ACTOR,
                    action: `退款 ${refund.id} 进入渠道执行`,
                    targetType: 'REFUND_REQUEST',
                    targetId: refund.id,
                    after: {status: refund.status},
                })
            } catch {
                return
            }
        })
        scheduleSideEffect('refund-complete', effect.targetId, 1200)
        return
    }
    // refund-complete
    transactDemoDatabase((data) => {
        try {
            const refund = completeRefundExecution(data, effect.targetId)
            recordAudit(data, {
                actor: SERVICE_ACTOR,
                action: refund.status === 'SUCCEEDED' ? `退款 ${refund.id} 执行成功` : `退款 ${refund.id} 执行失败`,
                targetType: 'REFUND_REQUEST',
                targetId: refund.id,
                reason: refund.reason,
                ticketId: refund.ticketId,
                after: {status: refund.status, channelRefundId: refund.channelRefundId},
            })
        } catch {
            // 同上。
        }
    })
}

/** 执行所有已到期的待办副作用；返回本次处理的条数。前端可显式调用，也可由读取端点顺带触发。 */
export function runDueSideEffects(): number {
    const now = Date.now()
    const pending = loadPending()
    const due = pending.filter((item) => item.runAt <= now)
    if (due.length === 0) return 0
    const remaining = pending.filter((item) => item.runAt > now)
    savePending(remaining)
    due.forEach(applyEffect)
    return due.length
}

export function hasPendingSideEffects(): boolean {
    return loadPending().length > 0
}

let autoTimer: number | undefined

/** 单例定时器：模拟服务端调度器持续泵送待办；真实后端删除，改由回调/调度驱动。 */
export function startSideEffectAdvancer(): void {
    if (autoTimer !== undefined) return
    autoTimer = window.setInterval(() => runDueSideEffects(), 1000)
}

export function clearSideEffects(): void {
    localStorage.removeItem(storageKey)
}
