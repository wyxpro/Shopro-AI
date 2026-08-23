<template>
  <PageHeader :title="detail ? `风险事件 ${detail.event.id}` : '风险事件详情'"
              description="审核决定只影响内容安全状态；可见性与发布状态保持独立。">
    <template #actions>
      <el-button @click="router.push('/risk/events')">返回风险事件</el-button>
    </template>
  </PageHeader>
  <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
  <div v-if="detail" v-loading="loading">
    <div class="panel">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="风险状态">
          <StatusTag :label="statusLabel(detail.event.status)" :type="statusType(detail.event.status)"/>
        </el-descriptions-item>
        <el-descriptions-item label="风险等级">
          <StatusTag :label="severityLabel(detail.event.severity)" :type="severityType(detail.event.severity)"/>
        </el-descriptions-item>
        <el-descriptions-item label="来源">{{ sourceLabel(detail.event.source) }}</el-descriptions-item>
        <el-descriptions-item label="内容"><span>{{ detail.content.title }}</span>
          <el-button link type="primary"
                     @click="router.push({name: 'customer-user-detail', params: {id: detail.user.id}})">查看所属用户
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="风险类型">{{ riskTypeLabel(detail.event.riskType) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(detail.event.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="可见性">{{ visibilityLabel(detail.content.visibility) }}</el-descriptions-item>
        <el-descriptions-item label="安全状态">{{ safetyLabel(detail.content.safetyStatus) }}</el-descriptions-item>
        <el-descriptions-item label="发布状态">{{ publishLabel(detail.content.publishStatus) }}</el-descriptions-item>
      </el-descriptions>
      <div class="detail-actions">
        <el-button v-if="canDecide" type="primary" @click="decisionVisible = true">提交审核决定</el-button>
        <el-button v-if="canCreateAppeal" @click="appealVisible = true">登记用户申诉</el-button>
      </div>
    </div>

    <div class="grid2" style="margin-top: 16px">
      <div class="panel">
        <h3>内容预览与规则命中</h3>
        <el-image v-if="detail.content.previewUrl" :src="detail.content.previewUrl" fit="cover"
                  style="width: 100%; max-width: 360px; height: 180px; background: #f4f6f8">
          <template #error>
            <div class="preview-fallback">预览资源不可用</div>
          </template>
        </el-image>
        <p><b>规则命中：</b>{{ detail.event.ruleHits.join('、') || '无' }}</p>
        <p><b>证据：</b></p>
        <ul>
          <li v-for="item in detail.event.evidence" :key="item">{{ item }}</li>
        </ul>
        <p v-if="detail.event.userMessage"><b>用户可见说明：</b>{{ detail.event.userMessage }}</p>
        <p v-if="detail.event.internalNote"><b>内部备注：</b>{{ detail.event.internalNote }}</p>
      </div>
      <div class="panel">
        <h3>审核与申诉时间线</h3>
        <el-timeline>
          <el-timeline-item v-for="item in detail.relatedEvents" :key="item.id" :timestamp="formatDate(item.updatedAt)"
                            :type="statusType(item.status)">
            <b>{{ item.parentEventId ? '申诉事件' : '原风险事件' }}</b> · {{ statusLabel(item.status) }}
            <div class="subtle">{{ item.decisionReasonCode || item.evidence[0] || '等待处理' }}</div>
          </el-timeline-item>
          <el-timeline-item v-for="audit in detail.auditLogs" :key="audit.id" :timestamp="formatDate(audit.createdAt)"
                            :type="audit.result === 'FAILED' ? 'danger' : 'info'">
            {{ audit.operatorName }} · {{ audit.action }}
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>

    <div class="grid2" style="margin-top: 16px">
      <div class="panel">
        <h3>用户历史风险事件</h3>
        <el-table :data="detail.userHistory" size="small">
          <el-table-column prop="id" label="事件" min-width="150"/>
          <el-table-column label="类型" min-width="120">
            <template #default="{ row }">{{ riskTypeLabel(row.riskType) }}</template>
          </el-table-column>
          <el-table-column label="等级" width="90">
            <template #default="{ row }">{{ severityLabel(row.severity) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">{{ statusLabel(row.status) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <div class="panel">
        <h3>审计记录</h3>
        <el-table :data="detail.auditLogs" size="small">
          <template #empty>
            <EmptyState description="暂无操作审计"/>
          </template>
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="operatorName" label="操作人" width="110"/>
          <el-table-column prop="action" label="动作" min-width="160"/>
          <el-table-column prop="reason" label="原因" min-width="130"/>
        </el-table>
      </div>
    </div>

    <RiskDecisionDialog v-model="decisionVisible" :event="detail.event" :submitting="decisionSubmitting"
                        @submit="submitDecision"/>
    <el-dialog v-model="appealVisible" title="登记用户申诉" width="500px" :close-on-click-modal="false">
      <el-alert title="申诉会创建一条新的风险事件；原审核结论、证据及审计记录不会被覆盖。" type="info" :closable="false"
                style="margin-bottom: 16px"/>
      <el-input v-model="appealMessage" type="textarea" :rows="4" maxlength="500" show-word-limit
                placeholder="填写用户补充材料或申诉理由"/>
      <template #footer>
        <el-button @click="appealVisible = false">取消</el-button>
        <el-button type="primary" :loading="appealSubmitting" @click="submitAppeal">提交申诉</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {createAppeal, createRiskDecision, getRiskEvent} from '@/api/risk'
import RiskDecisionDialog from '@/components/business/RiskDecisionDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {useAuthStore} from '@/stores/auth'
import type {CreateRiskDecisionRequest, RiskEvent, RiskEventDetail} from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const detail = ref<RiskEventDetail>()
const loading = ref(false)
const error = ref<string>()
const decisionVisible = ref(false)
const decisionSubmitting = ref(false)
const appealVisible = ref(false)
const appealSubmitting = ref(false)
const appealMessage = ref('')

const canDecide = computed(() => auth.hasPermission('risk:decide') && !!detail.value && ['PENDING_REVIEW', 'ESCALATED', 'APPEAL_PENDING'].includes(detail.value.event.status))
const canCreateAppeal = computed(() => auth.hasPermission('risk:decide') && !!detail.value && !detail.value.event.parentEventId && detail.value.event.status === 'REJECTED')

function eventId(): string | undefined {
  return typeof route.params.id === 'string' ? route.params.id : undefined
}

function formatDate(value?: string): string {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}

function sourceLabel(value: RiskEvent['source']): string {
  return {AUTO_SCAN: '自动扫描', USER_REPORT: '用户举报', PLATFORM_REJECT: '平台驳回', MANUAL: '人工创建'}[value]
}

function riskTypeLabel(value: RiskEvent['riskType']): string {
  return {
    PROHIBITED_GOODS: '违禁商品',
    FALSE_CLAIM: '虚假宣传',
    COPYRIGHT: '版权',
    PORTRAIT_RIGHTS: '肖像权',
    VOICE_AUTH: '声音授权',
    PERSONAL_DATA: '个人数据',
    OTHER: '其他'
  }[value]
}

function severityLabel(value: RiskEvent['severity']): string {
  return {LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '严重'}[value]
}

function statusLabel(value: RiskEvent['status']): string {
  return {
    PENDING_REVIEW: '待复核',
    PASSED: '已通过',
    REJECTED: '已驳回',
    ESCALATED: '已升级',
    APPEAL_PENDING: '申诉待审',
    APPEAL_PASSED: '申诉通过',
    APPEAL_REJECTED: '申诉驳回'
  }[value]
}

function severityType(value: RiskEvent['severity']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'CRITICAL' || value === 'HIGH' ? 'danger' : value === 'MEDIUM' ? 'warning' : 'info'
}

function statusType(value: RiskEvent['status']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'PASSED' || value === 'APPEAL_PASSED' ? 'success' : value === 'REJECTED' || value === 'APPEAL_REJECTED' ? 'danger' : value === 'ESCALATED' ? 'warning' : 'info'
}

function visibilityLabel(value: 'PRIVATE' | 'TEAM' | 'PUBLIC'): string {
  return {PRIVATE: '私有', TEAM: '团队可见', PUBLIC: '公开'}[value]
}

function safetyLabel(value: RiskEventDetail['content']['safetyStatus']): string {
  return {
    NOT_SCANNED: '未扫描',
    SCANNING: '扫描中',
    AUTO_PASSED: '自动通过',
    AUTO_BLOCKED: '自动拦截',
    MANUAL_REVIEW: '人工复核中',
    MANUAL_PASSED: '人工通过',
    MANUAL_REJECTED: '人工驳回'
  }[value]
}

function publishLabel(value: RiskEventDetail['content']['publishStatus']): string {
  return {
    NOT_PUBLISHED: '未发布',
    SCHEDULED: '定时发布',
    PUBLISHING: '发布中',
    PUBLISHED: '已发布',
    PLATFORM_REVIEW: '平台审核中',
    PLATFORM_REJECTED: '平台驳回',
    WITHDRAWN: '已撤回'
  }[value]
}

async function load(): Promise<void> {
  const id = eventId()
  if (!id) {
    error.value = '风险事件 ID 不正确';
    return
  }
  loading.value = true
  error.value = undefined
  try {
    detail.value = (await getRiskEvent(id)).data
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : '加载风险事件失败'
  } finally {
    loading.value = false
  }
}

async function submitDecision(payload: CreateRiskDecisionRequest): Promise<void> {
  const id = eventId()
  if (!id) return
  decisionSubmitting.value = true
  try {
    await createRiskDecision(id, payload)
    ElMessage.success('审核决定已保存')
    decisionVisible.value = false
    await load()
  } finally {
    decisionSubmitting.value = false
  }
}

async function submitAppeal(): Promise<void> {
  const id = eventId()
  if (!id || !appealMessage.value.trim()) {
    ElMessage.warning('请填写用户申诉说明');
    return
  }
  appealSubmitting.value = true
  try {
    const appeal = (await createAppeal(id, appealMessage.value.trim())).data
    ElMessage.success('已创建独立申诉事件，原结论保持不变')
    appealVisible.value = false
    appealMessage.value = ''
    await router.push({name: 'risk-event-detail', params: {id: appeal.id}})
    await load()
  } finally {
    appealSubmitting.value = false
  }
}

onMounted(() => void load())
</script>

<style scoped>
.detail-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}

.preview-fallback {
  height: 100%;
  display: grid;
  place-items: center;
  color: #909399;
  background: #f4f6f8;
}

.subtle {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
</style>
