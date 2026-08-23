import {http} from 'msw'
import type {CreateRiskDecisionRequest, RiskEvent, RiskEventListItem, RiskEventListQuery} from '@/types'
import {readDemoDatabase, transactDemoDatabase} from '../db'
import {recordAudit} from '../domain/audit-rules'
import {createRiskAppeal, decideRiskEvent, RiskRuleError} from '../domain/risk-rules'
import {requestHasPermission} from '../domain/permission-rules'
import {forbidden, ok, validationError} from './utils'

const sources: RiskEvent['source'][] = ['AUTO_SCAN', 'USER_REPORT', 'PLATFORM_REJECT', 'MANUAL']
const riskTypes: RiskEvent['riskType'][] = ['PROHIBITED_GOODS', 'FALSE_CLAIM', 'COPYRIGHT', 'PORTRAIT_RIGHTS', 'VOICE_AUTH', 'PERSONAL_DATA', 'OTHER']
const severities: RiskEvent['severity'][] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const statuses: RiskEvent['status'][] = ['PENDING_REVIEW', 'PASSED', 'REJECTED', 'ESCALATED', 'APPEAL_PENDING', 'APPEAL_PASSED', 'APPEAL_REJECTED']

function queryFrom(url: URL): RiskEventListQuery {
    const source = url.searchParams.get('source')
    const riskType = url.searchParams.get('riskType')
    const severity = url.searchParams.get('severity')
    const status = url.searchParams.get('status')
    return {
        page: Math.max(1, Number(url.searchParams.get('page') || 1)),
        pageSize: Math.max(1, Number(url.searchParams.get('pageSize') || 10)),
        keyword: url.searchParams.get('keyword') || undefined,
        source: sources.includes(source as RiskEvent['source']) ? source as RiskEvent['source'] : undefined,
        riskType: riskTypes.includes(riskType as RiskEvent['riskType']) ? riskType as RiskEvent['riskType'] : undefined,
        severity: severities.includes(severity as RiskEvent['severity']) ? severity as RiskEvent['severity'] : undefined,
        status: statuses.includes(status as RiskEvent['status']) ? status as RiskEvent['status'] : undefined,
        startAt: url.searchParams.get('startAt') || undefined,
        endAt: url.searchParams.get('endAt') || undefined,
    }
}

function pageRiskEvents(data: ReturnType<typeof readDemoDatabase>, query: RiskEventListQuery) {
    const items: RiskEventListItem[] = data.riskEvents
        .filter((event) => {
            const content = data.contents.find((item) => item.id === event.contentId)
            const user = data.users.find((item) => item.id === event.userId)
            const keyword = query.keyword?.toLowerCase()
            const matchesKeyword = !keyword || [event.id, content?.title || '', user?.name || '', ...event.ruleHits].some((value) => value.toLowerCase().includes(keyword))
            return matchesKeyword
                && (!query.source || event.source === query.source)
                && (!query.riskType || event.riskType === query.riskType)
                && (!query.severity || event.severity === query.severity)
                && (!query.status || event.status === query.status)
                && (!query.startAt || event.createdAt >= query.startAt)
                && (!query.endAt || event.createdAt <= `${query.endAt}T23:59:59.999Z`)
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((event) => {
            const content = data.contents.find((item) => item.id === event.contentId)
            const user = data.users.find((item) => item.id === event.userId)
            return {...event, contentTitle: content?.title || '内容已删除', userName: user?.name || '未知用户'}
        })
    return {
        items: items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: items.length,
        page: query.page,
        pageSize: query.pageSize,
    }
}

function isDecisionPayload(value: unknown): value is CreateRiskDecisionRequest {
    return typeof value === 'object' && value !== null
        && 'decision' in value && (value.decision === 'PASS' || value.decision === 'REJECT' || value.decision === 'ESCALATE')
        && 'reasonCode' in value && typeof value.reasonCode === 'string'
        && 'internalNote' in value && typeof value.internalNote === 'string'
        && 'userMessage' in value && typeof value.userMessage === 'string'
}

export const riskHandlers = [
    http.get('/api/admin/risk/events', ({request}) => ok(pageRiskEvents(readDemoDatabase(), queryFrom(new URL(request.url))))),
    http.get('/api/admin/risk/events/:id', ({params}) => {
        const eventId = typeof params.id === 'string' ? params.id : undefined
        if (!eventId) return validationError('风险事件 ID 不正确')
        const data = readDemoDatabase()
        const event = data.riskEvents.find((item) => item.id === eventId)
        if (!event) return validationError('风险事件不存在')
        const content = data.contents.find((item) => item.id === event.contentId)
        const user = data.users.find((item) => item.id === event.userId)
        if (!content || !user) return validationError('风险事件关联数据不存在')
        const rootId = event.parentEventId || event.id
        const relatedEvents = data.riskEvents.filter((item) => item.id === rootId || item.parentEventId === rootId).sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        const relatedIds = new Set(relatedEvents.map((item) => item.id))
        return ok({
            event,
            content,
            user,
            relatedEvents,
            userHistory: data.riskEvents.filter((item) => item.userId === user.id).sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 10),
            auditLogs: data.auditLogs.filter((item) => relatedIds.has(item.targetId)).slice(0, 30),
        })
    }),
    http.post('/api/admin/risk/events/:id/decisions', async ({params, request}) => {
        if (!requestHasPermission(request, 'risk:decide')) return forbidden()
        const eventId = typeof params.id === 'string' ? params.id : undefined
        const payload: unknown = await request.json().catch(() => undefined)
        if (!eventId || !isDecisionPayload(payload)) return validationError('审核决定参数不完整')
        try {
            const event = transactDemoDatabase((data) => {
                const before = data.riskEvents.find((item) => item.id === eventId)
                const content = before ? data.contents.find((item) => item.id === before.contentId) : undefined
                const previousEvent = before ? {
                    status: before.status,
                    reviewerId: before.reviewerId,
                    decisionReasonCode: before.decisionReasonCode
                } : undefined
                const previousContent = content ? {
                    safetyStatus: content.safetyStatus,
                    visibility: content.visibility,
                    publishStatus: content.publishStatus
                } : undefined
                const updated = decideRiskEvent(data, eventId, payload)
                const updatedContent = data.contents.find((item) => item.id === updated.contentId)
                recordAudit(data, {
                    action: `风险事件 ${updated.id} 完成${payload.decision === 'PASS' ? '通过' : payload.decision === 'REJECT' ? '驳回' : '升级'}审核`,
                    targetType: 'RISK_EVENT',
                    targetId: updated.id,
                    reason: payload.reasonCode,
                    before: {event: previousEvent, content: previousContent},
                    after: {
                        status: updated.status,
                        content: updatedContent ? {
                            safetyStatus: updatedContent.safetyStatus,
                            visibility: updatedContent.visibility,
                            publishStatus: updatedContent.publishStatus
                        } : undefined
                    },
                })
                return updated
            })
            return ok(event)
        } catch (error: unknown) {
            return validationError(error instanceof RiskRuleError ? error.message : '风险审核失败')
        }
    }),
    http.post('/api/admin/risk/events/:id/appeals', async ({params, request}) => {
        if (!requestHasPermission(request, 'risk:decide')) return forbidden()
        const eventId = typeof params.id === 'string' ? params.id : undefined
        const body: unknown = await request.json().catch(() => undefined)
        const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string' ? body.message : ''
        if (!eventId) return validationError('风险事件 ID 不正确')
        try {
            const appeal = transactDemoDatabase((data) => {
                const created = createRiskAppeal(data, eventId, message)
                recordAudit(data, {
                    action: `用户提交风险事件 ${eventId} 的申诉`,
                    targetType: 'RISK_EVENT',
                    targetId: created.id,
                    reason: message.trim(),
                    after: {parentEventId: created.parentEventId, status: created.status},
                })
                return created
            })
            return ok(appeal)
        } catch (error: unknown) {
            return validationError(error instanceof RiskRuleError ? error.message : '登记申诉失败')
        }
    }),
]
