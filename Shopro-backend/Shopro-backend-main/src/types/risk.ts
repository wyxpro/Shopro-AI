import type {ListQuery} from './api'
import type {CustomerUser} from './customer'
import type {AuditLog} from './system'

export interface ContentAsset {
    id: string
    ownerUserId: string
    organizationId?: string
    type: 'PRODUCT' | 'SCRIPT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'AVATAR' | 'VOICE_CLONE'
    title: string
    previewUrl?: string
    visibility: 'PRIVATE' | 'TEAM' | 'PUBLIC'
    safetyStatus: 'NOT_SCANNED' | 'SCANNING' | 'AUTO_PASSED' | 'AUTO_BLOCKED' | 'MANUAL_REVIEW' | 'MANUAL_PASSED' | 'MANUAL_REJECTED'
    publishStatus: 'NOT_PUBLISHED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'PLATFORM_REVIEW' | 'PLATFORM_REJECTED' | 'WITHDRAWN'
    createdAt: string
    updatedAt: string
}

export interface RiskEvent {
    id: string
    parentEventId?: string
    contentId: string
    userId: string
    source: 'AUTO_SCAN' | 'USER_REPORT' | 'PLATFORM_REJECT' | 'MANUAL'
    riskType: 'PROHIBITED_GOODS' | 'FALSE_CLAIM' | 'COPYRIGHT' | 'PORTRAIT_RIGHTS' | 'VOICE_AUTH' | 'PERSONAL_DATA' | 'OTHER'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    status: 'PENDING_REVIEW' | 'PASSED' | 'REJECTED' | 'ESCALATED' | 'APPEAL_PENDING' | 'APPEAL_PASSED' | 'APPEAL_REJECTED'
    evidence: string[]
    ruleHits: string[]
    reviewerId?: string
    decisionReasonCode?: string
    internalNote?: string
    userMessage?: string
    createdAt: string
    reviewedAt?: string
    updatedAt: string
}

export interface RiskEventListQuery extends ListQuery {
    source?: RiskEvent['source']
    riskType?: RiskEvent['riskType']
    severity?: RiskEvent['severity']
    status?: RiskEvent['status']
    startAt?: string
    endAt?: string
}

export interface RiskEventListItem extends RiskEvent {
    contentTitle: string
    userName: string
}

export interface RiskEventDetail {
    event: RiskEvent
    content: ContentAsset
    user: CustomerUser
    relatedEvents: RiskEvent[]
    userHistory: RiskEvent[]
    auditLogs: AuditLog[]
}

export interface CreateRiskDecisionRequest {
    decision: 'PASS' | 'REJECT' | 'ESCALATE'
    reasonCode: string
    internalNote: string
    userMessage: string
}
