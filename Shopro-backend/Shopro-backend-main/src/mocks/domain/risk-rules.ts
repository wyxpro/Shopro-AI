import type {ContentAsset, CreateRiskDecisionRequest, RiskEvent} from '@/types'
import type {DemoDatabase} from '../db'

export class RiskRuleError extends Error {
}

function requireContent(data: DemoDatabase, contentId: string): ContentAsset {
    const content = data.contents.find((item) => item.id === contentId)
    if (!content) throw new RiskRuleError('关联内容不存在')
    return content
}

function requireRiskEvent(data: DemoDatabase, eventId: string): RiskEvent {
    const event = data.riskEvents.find((item) => item.id === eventId)
    if (!event) throw new RiskRuleError('风险事件不存在')
    return event
}

function isAppealEvent(event: RiskEvent): boolean {
    return Boolean(event.parentEventId)
}

export function decideRiskEvent(
    data: DemoDatabase,
    eventId: string,
    payload: CreateRiskDecisionRequest,
): RiskEvent {
    const event = requireRiskEvent(data, eventId)
    if (!['PENDING_REVIEW', 'ESCALATED', 'APPEAL_PENDING'].includes(event.status)) {
        throw new RiskRuleError('当前风险事件不在可审核状态')
    }
    if (!payload.reasonCode.trim() || !payload.internalNote.trim()) {
        throw new RiskRuleError('审核决定必须填写原因码和内部备注')
    }
    if (payload.decision === 'REJECT' && !payload.userMessage.trim()) {
        throw new RiskRuleError('驳回必须填写面向用户的说明')
    }

    const content = requireContent(data, event.contentId)
    const timestamp = new Date().toISOString()
    const appeal = isAppealEvent(event)
    if (payload.decision === 'PASS') {
        event.status = appeal ? 'APPEAL_PASSED' : 'PASSED'
        content.safetyStatus = 'MANUAL_PASSED'
    } else if (payload.decision === 'REJECT') {
        event.status = appeal ? 'APPEAL_REJECTED' : 'REJECTED'
        content.safetyStatus = 'MANUAL_REJECTED'
    } else {
        event.status = 'ESCALATED'
        content.safetyStatus = 'MANUAL_REVIEW'
    }
    event.reviewerId = 'admin-1'
    event.decisionReasonCode = payload.reasonCode.trim()
    event.internalNote = payload.internalNote.trim()
    event.userMessage = payload.userMessage.trim() || undefined
    event.reviewedAt = timestamp
    event.updatedAt = timestamp
    // 风险判定仅更新安全状态，不会隐式改动可见性或发布状态。
    content.updatedAt = timestamp
    return event
}

export function createRiskAppeal(data: DemoDatabase, eventId: string, message: string): RiskEvent {
    const sourceEvent = requireRiskEvent(data, eventId)
    const original = sourceEvent.parentEventId ? requireRiskEvent(data, sourceEvent.parentEventId) : sourceEvent
    if (!['REJECTED', 'APPEAL_REJECTED'].includes(original.status)) {
        throw new RiskRuleError('仅已驳回的原风险事件可以登记申诉')
    }
    if (!message.trim()) throw new RiskRuleError('请填写用户申诉说明')

    const timestamp = new Date().toISOString()
    const appeal: RiskEvent = {
        id: crypto.randomUUID(),
        parentEventId: original.id,
        contentId: original.contentId,
        userId: original.userId,
        source: 'MANUAL',
        riskType: original.riskType,
        severity: original.severity,
        status: 'APPEAL_PENDING',
        evidence: [`用户申诉：${message.trim()}`],
        ruleHits: [...original.ruleHits],
        createdAt: timestamp,
        updatedAt: timestamp,
    }
    // 申诉为独立事件，原审核结论及其证据保持不可变。
    data.riskEvents.unshift(appeal)
    return appeal
}
