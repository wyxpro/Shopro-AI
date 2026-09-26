import type {
    AuditLog,
    ContentAsset,
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
import type {DemoDatabase} from '../db'
import {refundFinalFailure} from '../domain/job-rules'

const seedTimestamp = '2026-08-20T08:00:00.000Z'
const userSurnames = ['陈', '林', '王', '李']
const userGivenNames = ['晨', '若', '明', '悦']
const productNames = ['夏日护肤', '智能咖啡机', '运动耳机']
const legacyJobTypes = ['视频', '脚本', '配音'] as const
const jobTypes: Job['type'][] = ['VIDEO_GENERATION', 'SCRIPT_GENERATION', 'TTS']
const planNames = ['体验套餐', '专业套餐', '企业套餐'] as const
const planPrices = [9900, 29900, 99900]
const legacyJobStatuses = ['success', 'running', 'pending', 'cancelled'] as const
type LegacySeedJobStatus = 'failed' | typeof legacyJobStatuses[number]
const workflowStatusByLegacyStatus: Record<LegacySeedJobStatus, Workflow['status']> = {
    failed: 'FAILED',
    success: 'SUCCEEDED',
    running: 'RUNNING',
    pending: 'QUEUED',
    cancelled: 'CANCELLED',
}
const jobStatusByLegacyStatus: Record<LegacySeedJobStatus, Job['status']> = {
    failed: 'FAILED',
    success: 'SUCCEEDED',
    running: 'RUNNING',
    pending: 'QUEUED',
    cancelled: 'CANCELLED',
}

function seedJobStatus(index: number): LegacySeedJobStatus {
    if (index === 0 || index === 2 || index === 6) return 'failed'
    return legacyJobStatuses[index % legacyJobStatuses.length]
}

function createPlans(): PlanSnapshot[] {
    return planNames.map((name, index) => ({
        planId: `plan-${index + 1}`,
        version: 1,
        name,
        priceMinor: planPrices[index],
        currency: 'CNY',
        grantedCredits: [300, 1200, 5000][index],
        validityDays: 30,
        seatLimit: [1, 3, 20][index],
        capabilities: index === 2 ? ['generation', 'publishing', 'api'] : ['generation', 'publishing'],
    }))
}

function createOrganizations(): Organization[] {
    return Array.from({length: 24}, (_, index) => ({
        id: `org-${index + 1}`,
        name: `Shopro 企业客户 ${index + 1}`,
        type: 'BUSINESS',
        ownerUserId: `u${index * 5 + 1}`,
        planId: 'plan-3',
        seatLimit: 20,
        memberCount: 5,
        status: 'ACTIVE',
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
    }))
}

function createUsers(): CustomerUser[] {
    return Array.from({length: 120}, (_, index) => {
        const isBusiness = index % 5 === 0
        return {
            id: `u${index + 1}`,
            organizationId: isBusiness ? `org-${Math.floor(index / 5) + 1}` : undefined,
            name: `${userSurnames[index % 4]}${userGivenNames[index % 4]}${index + 1}`,
            email: `user${index + 1}@shopro.ai`,
            phoneMasked: `138****${String(1000 + index).slice(-4)}`,
            accountType: isBusiness ? 'BUSINESS_OWNER' : 'INDIVIDUAL',
            planName: planNames[index % planNames.length],
            planExpiresAt: '2026-09-20T08:00:00.000Z',
            creditBalance: 300 + index * 17,
            riskLevel: index % 13 === 0 ? 'HIGH' : index % 7 === 0 ? 'MEDIUM' : 'LOW',
            capabilities: {
                login: index % 11 === 0 ? 'DISABLED' : 'ENABLED',
                generation: 'ENABLED',
                publishing: 'ENABLED',
                api: isBusiness ? 'ENABLED' : 'DISABLED',
            },
            lastActiveAt: seedTimestamp,
            createdAt: '2026-08-18T08:00:00.000Z',
            updatedAt: seedTimestamp,
        }
    })
}

function createWorkflows(): Workflow[] {
    return Array.from({length: 90}, (_, index) => {
        const legacyStatus = seedJobStatus(index)
        const status = workflowStatusByLegacyStatus[legacyStatus]
        return {
            id: `wf-${index + 1}`,
            userId: `u${index + 1}`,
            organizationId: index % 5 === 0 ? `org-${Math.floor(index / 5) + 1}` : undefined,
            projectId: `project-${index + 1}`,
            productName: productNames[index % productNames.length],
            status,
            currentStep: legacyJobTypes[index % legacyJobTypes.length],
            progress: legacyStatus === 'failed' ? 62 : legacyStatus === 'success' ? 100 : legacyStatus === 'pending' ? 0 : 45,
            totalCredits: index === 2 ? 0 : 100,
            refundedCredits: 0,
            providerCostMinor: legacyStatus === 'pending' || index === 2 ? 0 : 80,
            currency: 'CNY',
            needsAttention: index === 0 || index === 2,
            createdAt: seedTimestamp,
            startedAt: seedTimestamp,
            finishedAt: legacyStatus === 'success' ? seedTimestamp : undefined,
            updatedAt: seedTimestamp,
        }
    })
}

function createJobs(): Job[] {
    return Array.from({length: 90}, (_, index) => {
        const legacyStatus = seedJobStatus(index)
        const status = jobStatusByLegacyStatus[legacyStatus]
        return {
            id: `j${index + 1}`,
            workflowId: `wf-${index + 1}`,
            name: `${productNames[index % productNames.length]} AI ${legacyJobTypes[index % legacyJobTypes.length]}生成`,
            type: jobTypes[index % jobTypes.length],
            status,
            sequence: 1,
            currentAttemptId: legacyStatus === 'pending' ? undefined : `attempt-j${index + 1}-1`,
            attemptCount: index === 6 ? 3 : legacyStatus === 'pending' ? 0 : 1,
            maxAttempts: 3,
            creditsCharged: index === 2 ? 0 : 100,
            creditsRefunded: 0,
            needsAttention: index === 0 || index === 2,
            createdAt: seedTimestamp,
            updatedAt: seedTimestamp,
        }
    })
}

function createJobAttempts(): JobAttempt[] {
    return Array.from({length: 90}, (_, index): JobAttempt[] => {
        const legacyStatus = seedJobStatus(index)
        if (legacyStatus === 'pending') return []
        const failedTimeout = index === 0
        const failedInput = index === 2
        const failedBlocked = index === 6
        return [{
            id: `attempt-j${index + 1}-1`,
            jobId: `j${index + 1}`,
            attemptNo: 1,
            status: jobStatusByLegacyStatus[legacyStatus],
            provider: 'Seedance',
            model: index % 3 === 0 ? 'seedance-2-0-fast' : index % 3 === 1 ? 'deepseek-v4-flash' : 'cosyvoice2',
            providerTaskId: `provider-demo-${String(index + 1).padStart(3, '0')}`,
            progress: legacyStatus === 'failed' ? 62 : legacyStatus === 'success' ? 100 : legacyStatus === 'cancelled' ? 0 : 45,
            errorCategory: failedTimeout ? 'PROVIDER_TIMEOUT' : failedInput ? 'INVALID_INPUT' : failedBlocked ? 'CONTENT_BLOCKED' : undefined,
            errorCode: failedTimeout ? 'PROVIDER_TIMEOUT' : failedInput ? 'INVALID_INPUT' : failedBlocked ? 'CONTENT_BLOCKED' : undefined,
            errorMessage: failedTimeout
                ? '模型服务响应超时，已扣积分但自动退款异常。'
                : failedInput
                    ? '输入素材不符合生成要求，无法直接重试。'
                    : failedBlocked
                        ? '内容命中平台拦截规则，任务已最终失败并自动退款。'
                        : undefined,
            retryable: !failedInput && !failedBlocked,
            providerCostMinor: failedInput ? 0 : 80,
            startedAt: seedTimestamp,
            lastHeartbeatAt: legacyStatus === 'running' ? seedTimestamp : undefined,
            finishedAt: legacyStatus === 'running' ? undefined : seedTimestamp,
            outputUrl: legacyStatus === 'success' ? `https://demo.shopro.ai/outputs/j${index + 1}-1.mp4` : undefined,
            createdAt: seedTimestamp,
        }]
    }).flat()
}

function createCreditLedger(): CreditLedgerEntry[] {
    return [{
        id: 'ledger-job-j1-consumption',
        userId: 'u1',
        organizationId: 'org-1',
        type: 'JOB_CONSUMPTION',
        direction: 'DEBIT',
        amount: 100,
        balanceBefore: 400,
        balanceAfter: 300,
        bizType: 'JOB',
        bizId: 'j1',
        reasonCode: 'JOB_SUBMITTED',
        reason: '视频生成任务已提交并扣除积分。',
        idempotencyKey: 'job-consumption-j1',
        operatorId: 'system',
        createdAt: seedTimestamp,
    }, {
        id: 'ledger-job-j7-consumption',
        userId: 'u7',
        type: 'JOB_CONSUMPTION',
        direction: 'DEBIT',
        amount: 100,
        balanceBefore: 502,
        balanceAfter: 402,
        bizType: 'JOB',
        bizId: 'j7',
        reasonCode: 'JOB_SUBMITTED',
        reason: '视频生成任务已提交并扣除积分。',
        idempotencyKey: 'job-consumption-j7',
        operatorId: 'system',
        createdAt: seedTimestamp,
    }, {
        id: 'ledger-order-refund-scenario-grant',
        userId: 'u50',
        type: 'PAYMENT_GRANT',
        direction: 'CREDIT',
        amount: 300,
        balanceBefore: 833,
        balanceAfter: 1133,
        bizType: 'ORDER',
        bizId: 'SCENARIO_REFUND_ORDER',
        reasonCode: 'PAYMENT_ENTITLEMENT_GRANTED',
        reason: '支付成功后发放体验套餐积分权益。',
        idempotencyKey: 'entitlement-credit-SCENARIO_REFUND_ORDER',
        operatorId: 'system',
        createdAt: seedTimestamp,
    }]
}

function createContents(): ContentAsset[] {
    return Array.from({length: 50}, (_, index) => {
        const fixedHighRisk = index === 0
        const fixedPrivateAutoPassed = index === 1
        const fixedAppealContent = index === 2
        return {
            id: `c${index + 1}`,
            ownerUserId: `u${index + 1}`,
            organizationId: index % 5 === 0 ? `org-${Math.floor(index / 5) + 1}` : undefined,
            type: fixedHighRisk ? 'VIDEO' : ['PRODUCT', 'SCRIPT', 'VIDEO'][index % 3] as ContentAsset['type'],
            title: `${['便携榨汁杯', '氨基酸洁面', '露营灯'][index % 3]}推广作品 ${index + 1}`,
            previewUrl: `https://demo.shopro.ai/previews/content-${index + 1}.jpg`,
            visibility: fixedPrivateAutoPassed || fixedAppealContent ? 'PRIVATE' : index % 4 === 0 ? 'TEAM' : 'PUBLIC',
            safetyStatus: fixedHighRisk ? 'MANUAL_REVIEW' : fixedPrivateAutoPassed ? 'AUTO_PASSED' : fixedAppealContent ? 'MANUAL_REJECTED' : index % 6 === 0 ? 'AUTO_BLOCKED' : 'AUTO_PASSED',
            publishStatus: fixedHighRisk ? 'PUBLISHED' : fixedAppealContent ? 'NOT_PUBLISHED' : index % 5 === 0 ? 'PLATFORM_REVIEW' : 'NOT_PUBLISHED',
            createdAt: seedTimestamp,
            updatedAt: seedTimestamp,
        }
    })
}

function createRiskEvents(): RiskEvent[] {
    const fixedEvents: RiskEvent[] = [{
        id: 'SCENARIO_RISK_HIGH_PENDING',
        contentId: 'c1',
        userId: 'u1',
        source: 'AUTO_SCAN',
        riskType: 'FALSE_CLAIM',
        severity: 'HIGH',
        status: 'PENDING_REVIEW',
        evidence: ['模型置信度 0.96', '视频第 00:08 处出现“全网最低价”绝对化表述'],
        ruleHits: ['AD_FALSE_CLAIM_ABSOLUTE_PRICE', 'AD_CLAIM_REQUIRES_EVIDENCE'],
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
    }, {
        id: 'risk-appeal-original-1',
        contentId: 'c3',
        userId: 'u3',
        source: 'AUTO_SCAN',
        riskType: 'COPYRIGHT',
        severity: 'MEDIUM',
        status: 'REJECTED',
        evidence: ['与图库受保护素材的感知哈希相似度 0.91'],
        ruleHits: ['COPYRIGHT_IMAGE_MATCH'],
        reviewerId: 'admin-1',
        decisionReasonCode: 'COPYRIGHT_UNAUTHORIZED',
        internalNote: '未提供素材授权证明。',
        userMessage: '该内容疑似使用未经授权的图片素材，请替换后重新提交。',
        createdAt: seedTimestamp,
        reviewedAt: seedTimestamp,
        updatedAt: seedTimestamp,
    }, {
        id: 'SCENARIO_APPEAL_PENDING',
        parentEventId: 'risk-appeal-original-1',
        contentId: 'c3',
        userId: 'u3',
        source: 'MANUAL',
        riskType: 'COPYRIGHT',
        severity: 'MEDIUM',
        status: 'APPEAL_PENDING',
        evidence: ['用户申诉：已补充正版图库授权凭证，申请复核。'],
        ruleHits: ['COPYRIGHT_IMAGE_MATCH'],
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
    }]
    const extraEvents = Array.from({length: 12}, (_, index): RiskEvent => {
        const number = index + 4
        const severity: RiskEvent['severity'] = index % 5 === 0 ? 'CRITICAL' : index % 3 === 0 ? 'HIGH' : index % 2 === 0 ? 'MEDIUM' : 'LOW'
        const status: RiskEvent['status'] = index % 4 === 0 ? 'PENDING_REVIEW' : index % 4 === 1 ? 'PASSED' : index % 4 === 2 ? 'REJECTED' : 'ESCALATED'
        return {
            id: `risk-seed-${number}`,
            contentId: `c${number}`,
            userId: `u${number}`,
            source: ['AUTO_SCAN', 'USER_REPORT', 'PLATFORM_REJECT'][index % 3] as RiskEvent['source'],
            riskType: ['PROHIBITED_GOODS', 'PORTRAIT_RIGHTS', 'VOICE_AUTH', 'PERSONAL_DATA'][index % 4] as RiskEvent['riskType'],
            severity,
            status,
            evidence: [`风险检测证据 #${number}`],
            ruleHits: [`RISK_RULE_${String(number).padStart(3, '0')}`],
            reviewerId: status === 'PENDING_REVIEW' ? undefined : 'admin-1',
            decisionReasonCode: status === 'PENDING_REVIEW' ? undefined : 'SEED_REVIEW',
            internalNote: status === 'PENDING_REVIEW' ? undefined : '演示历史审核记录。',
            createdAt: seedTimestamp,
            reviewedAt: status === 'PENDING_REVIEW' ? undefined : seedTimestamp,
            updatedAt: seedTimestamp,
        }
    })
    return [...fixedEvents, ...extraEvents]
}

function createRiskAuditLogs(): AuditLog[] {
    return [{
        id: 'audit-risk-high-detected-1',
        operatorId: 'system',
        operatorName: '内容风控引擎',
        role: 'SYSTEM',
        action: '自动扫描命中高风险规则，进入人工待复核队列',
        targetType: 'RISK_EVENT',
        targetId: 'SCENARIO_RISK_HIGH_PENDING',
        after: {status: 'PENDING_REVIEW', safetyStatus: 'MANUAL_REVIEW'},
        result: 'SUCCESS',
        traceId: 'seed-risk-high-detected-1',
        createdAt: seedTimestamp,
    }, {
        id: 'audit-risk-appeal-reject-1',
        operatorId: 'admin-1',
        operatorName: '系统管理员',
        role: 'SUPER_ADMIN',
        action: '风险事件审核驳回',
        targetType: 'RISK_EVENT',
        targetId: 'risk-appeal-original-1',
        reason: 'COPYRIGHT_UNAUTHORIZED',
        result: 'SUCCESS',
        traceId: 'seed-risk-appeal-reject-1',
        createdAt: seedTimestamp,
    }, {
        id: 'audit-risk-appeal-created-1',
        operatorId: 'u3',
        operatorName: '用户 u3',
        role: 'USER',
        action: '用户提交授权材料并发起申诉',
        targetType: 'RISK_EVENT',
        targetId: 'SCENARIO_APPEAL_PENDING',
        result: 'SUCCESS',
        traceId: 'seed-risk-appeal-created-1',
        createdAt: seedTimestamp,
    }]
}

function createBillingAuditLogs(): AuditLog[] {
    return [{
        id: 'audit-payment-entitlement-failed',
        operatorId: 'system',
        operatorName: '支付权益服务',
        role: 'SYSTEM',
        action: '支付成功但权益发放失败，已创建异常待办',
        targetType: 'ORDER',
        targetId: 'SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        reason: 'ENTITLEMENT_GRANT_FAILED',
        result: 'FAILED',
        traceId: 'seed-payment-entitlement-failed',
        createdAt: seedTimestamp,
    }, {
        id: 'audit-refund-pending-approval',
        operatorId: 'admin-1',
        operatorName: '系统管理员',
        role: 'SUPER_ADMIN',
        action: '已发起退款申请，等待财务审批',
        targetType: 'REFUND_REQUEST',
        targetId: 'SCENARIO_REFUND_PENDING_APPROVAL',
        reason: 'SERVICE_NOT_USED',
        ticketId: 'ticket-refund-pending-approval',
        result: 'SUCCESS',
        traceId: 'seed-refund-pending-approval',
        createdAt: seedTimestamp,
    }]
}

function createOrders(plans: PlanSnapshot[]): Order[] {
    return Array.from({length: 80}, (_, index) => {
        const legacyStatus = ['paid', 'unpaid', 'refunding', 'refunded'][index % 4]
        const paymentFailureScenario = index === 9
        const refundScenario = index === 49
        const plan = paymentFailureScenario ? plans[1] : refundScenario ? plans[0] : plans[index % plans.length]
        return {
            id: paymentFailureScenario ? 'SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED' : refundScenario ? 'SCENARIO_REFUND_ORDER' : `O202608${String(index + 1).padStart(4, '0')}`,
            userId: `u${index + 1}`,
            organizationId: index % 5 === 0 ? `org-${Math.floor(index / 5) + 1}` : undefined,
            planSnapshot: {...plan, capabilities: [...plan.capabilities]},
            amountMinor: plan.priceMinor,
            currency: 'CNY',
            paymentStatus: paymentFailureScenario || refundScenario ? 'PAID' : legacyStatus === 'paid' ? 'PAID' : legacyStatus === 'unpaid' ? 'PENDING' : legacyStatus === 'refunding' ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
            entitlementStatus: paymentFailureScenario ? 'FAILED' : refundScenario || legacyStatus === 'paid' ? 'GRANTED' : 'PENDING',
            channel: paymentFailureScenario ? 'STRIPE' : 'MANUAL_DEMO',
            channelTransactionId: paymentFailureScenario ? 'txn-demo-entitlement-failed' : undefined,
            createdAt: seedTimestamp,
            paidAt: paymentFailureScenario || refundScenario || legacyStatus === 'paid' ? seedTimestamp : undefined,
            updatedAt: seedTimestamp,
        }
    })
}

function createSupportTickets(): SupportTicket[] {
    return [{
        id: 'ticket-payment-entitlement-failed',
        title: '支付成功但套餐权益未到账',
        category: 'BILLING',
        priority: 'HIGH',
        status: 'OPEN',
        userId: 'u10',
        orderId: 'SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        description: '支付回调已确认，但权益发放任务失败，等待运营处理。',
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
    }, {
        id: 'ticket-refund-pending-approval',
        title: '体验套餐退款申请',
        category: 'BILLING',
        priority: 'MEDIUM',
        status: 'PROCESSING',
        userId: 'u50',
        orderId: 'SCENARIO_REFUND_ORDER',
        description: '用户因购买后未使用服务申请退款，等待财务审批。',
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
    }]
}

function createPaymentEvents(): PaymentEvent[] {
    return [{
        id: 'payment-scenario-created',
        orderId: 'SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        type: 'PAYMENT_CREATED',
        channelEventId: 'checkout-demo-entitlement-failed',
        payloadSummary: 'Stripe 支付单已创建。',
        processed: true,
        idempotencyKey: 'payment-created-SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        createdAt: seedTimestamp,
    }, {
        id: 'payment-scenario-callback',
        orderId: 'SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        type: 'CALLBACK_RECEIVED',
        channelEventId: 'evt-stripe-demo-entitlement-failed',
        payloadSummary: '支付渠道回调已接收。',
        processed: true,
        idempotencyKey: 'callback-SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        createdAt: seedTimestamp,
    }, {
        id: 'payment-scenario-confirmed',
        orderId: 'SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        type: 'PAYMENT_CONFIRMED',
        channelEventId: 'txn-demo-entitlement-failed',
        payloadSummary: '支付已确认，订单状态更新为 PAID。',
        processed: true,
        idempotencyKey: 'payment-confirmed-SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        createdAt: seedTimestamp,
    }, {
        id: 'payment-scenario-entitlement-failed',
        orderId: 'SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        type: 'ENTITLEMENT_FAILED',
        channelEventId: 'grant-demo-entitlement-failed',
        payloadSummary: '权益发放任务失败，未增加用户积分。',
        processed: true,
        idempotencyKey: 'entitlement-failed-SCENARIO_PAYMENT_PAID_ENTITLEMENT_FAILED',
        createdAt: seedTimestamp,
    }, {
        id: 'payment-refund-scenario-confirmed',
        orderId: 'SCENARIO_REFUND_ORDER',
        type: 'PAYMENT_CONFIRMED',
        channelEventId: 'txn-demo-refund-order',
        payloadSummary: '支付已确认，体验套餐权益已发放。',
        processed: true,
        idempotencyKey: 'payment-confirmed-SCENARIO_REFUND_ORDER',
        createdAt: seedTimestamp,
    }, {
        id: 'payment-refund-scenario-granted',
        orderId: 'SCENARIO_REFUND_ORDER',
        type: 'ENTITLEMENT_GRANTED',
        channelEventId: 'grant-demo-refund-order',
        payloadSummary: '体验套餐积分权益已发放。',
        processed: true,
        idempotencyKey: 'entitlement-granted-SCENARIO_REFUND_ORDER',
        createdAt: seedTimestamp,
    }]
}

function createRefunds(): RefundRequest[] {
    return [{
        id: 'SCENARIO_REFUND_PENDING_APPROVAL',
        orderId: 'SCENARIO_REFUND_ORDER',
        userId: 'u50',
        amountMinor: 9900,
        status: 'PENDING_APPROVAL',
        reasonCode: 'SERVICE_NOT_USED',
        reason: '用户购买后未使用套餐权益，申请原路退款。',
        reclaimCredits: 300,
        ticketId: 'ticket-refund-pending-approval',
        requesterId: 'admin-1',
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp,
    }]
}

function createAuditLogs(): AuditLog[] {
    return Array.from({length: 100}, (_, index) => ({
        id: `audit-${index + 1}`,
        operatorId: 'admin-1',
        operatorName: '系统管理员',
        role: 'SUPER_ADMIN',
        action: '演示数据初始化',
        targetType: 'SYSTEM',
        targetId: 'demo-database',
        result: 'SUCCESS',
        traceId: `seed-trace-${index + 1}`,
        createdAt: seedTimestamp,
    }))
}

function createServiceHealth(): ServiceHealth[] {
    return [
        {
            id: 'health-api',
            capability: 'API',
            provider: 'API 网关',
            status: 'HEALTHY',
            latencyMs: 18,
            affectedUsers: 0,
            affectedJobs: 0,
            fallbackEnabled: false,
            updatedAt: seedTimestamp
        },
        {
            id: 'health-video',
            capability: 'VIDEO',
            provider: '视频生成服务',
            status: 'HEALTHY',
            latencyMs: 142,
            affectedUsers: 0,
            affectedJobs: 0,
            fallbackEnabled: true,
            updatedAt: seedTimestamp
        },
        {
            id: 'health-queue',
            capability: 'TEXT',
            provider: '模型队列',
            status: 'DEGRADED',
            latencyMs: 286,
            affectedUsers: 12,
            affectedJobs: 3,
            fallbackEnabled: true,
            updatedAt: seedTimestamp
        },
    ]
}

export function createSeed(): DemoDatabase {
    const plans = createPlans()
    const data: DemoDatabase = {
        schemaVersion: 2,
        organizations: createOrganizations(),
        users: createUsers(),
        creditLedger: createCreditLedger(),
        creditApprovals: [],
        capabilityRestrictions: [],
        tickets: createSupportTickets(),
        workflows: createWorkflows(),
        jobs: createJobs(),
        jobAttempts: createJobAttempts(),
        contents: createContents(),
        riskEvents: createRiskEvents(),
        orders: createOrders(plans),
        paymentEvents: createPaymentEvents(),
        refunds: createRefunds(),
        plans,
        auditLogs: [...createBillingAuditLogs(), ...createRiskAuditLogs(), ...createAuditLogs()],
        serviceHealth: createServiceHealth(),
    }
    const automaticRefund = refundFinalFailure(data, 'j7')
    data.auditLogs.unshift({
        id: 'audit-auto-refund-failed-j1',
        operatorId: 'system',
        operatorName: '系统',
        role: 'SYSTEM',
        action: '任务 j1 自动退款失败，已进入人工补偿待办',
        targetType: 'JOB',
        targetId: 'j1',
        reason: '供应商超时后的积分退款写入异常',
        result: 'FAILED',
        traceId: 'seed-auto-refund-failed-j1',
        createdAt: seedTimestamp,
    })
    if (automaticRefund) {
        data.auditLogs.unshift({
            id: 'audit-auto-refund-success-j7',
            operatorId: 'system',
            operatorName: '系统',
            role: 'SYSTEM',
            action: '任务 j7 最终失败后自动退回积分',
            targetType: 'JOB',
            targetId: 'j7',
            after: {ledgerId: automaticRefund.id, refundedCredits: automaticRefund.amount},
            result: 'SUCCESS',
            traceId: 'seed-auto-refund-success-j7',
            createdAt: seedTimestamp,
        })
    }
    return data
}
