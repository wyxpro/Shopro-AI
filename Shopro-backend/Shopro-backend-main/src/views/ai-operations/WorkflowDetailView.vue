<template>
  <PageHeader :title="detail ? `工作流 ${detail.workflow.id}` : '工作流详情'"
              description="查看子任务、执行尝试、供应商成本和积分扣退记录">
    <template #actions>
      <el-button @click="router.push('/ai-operations')">返回工作流列表</el-button>
    </template>
  </PageHeader>
  <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
  <div v-if="detail" v-loading="loading">
    <el-alert v-if="hasRefundException" type="warning" show-icon style="margin-bottom: 16px">
      <template #title>
        该工作流存在已扣积分未自动退回的最终失败任务，需人工补偿。
        <el-button v-if="auth.hasPermission('workflow:operate')" link type="warning" @click="openManualRefund">
          执行人工补偿
        </el-button>
      </template>
    </el-alert>
    <div class="panel">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="工作流状态">
          <StatusTag :label="workflowStatusLabel(detail.workflow.status)"
                     :type="workflowStatusType(detail.workflow.status)"/>
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          <el-button link type="primary"
                     @click="router.push({name: 'customer-user-detail', params: {id: detail.user.id}})">
            {{ detail.user.name }}（{{ detail.user.id }}）
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="所属企业">{{ detail.organization?.name || '个人用户' }}</el-descriptions-item>
        <el-descriptions-item label="商品">{{ detail.workflow.productName }}</el-descriptions-item>
        <el-descriptions-item label="当前步骤">{{ detail.workflow.currentStep }}</el-descriptions-item>
        <el-descriptions-item label="总进度">{{ detail.workflow.progress }}%</el-descriptions-item>
        <el-descriptions-item label="用户积分">扣 {{ detail.workflow.totalCredits }} / 退
          {{ detail.workflow.refundedCredits }}
        </el-descriptions-item>
        <el-descriptions-item label="供应商成本">¥{{
            (detail.workflow.providerCostMinor / 100).toFixed(2)
          }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(detail.workflow.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="panel" style="margin-top: 16px"><h3>子任务与执行尝试</h3>
      <WorkflowTimeline :jobs="detail.jobs" @retry="retry" @cancel="requestCancel"/>
    </div>

    <div class="grid2">
      <div class="panel"><h3>积分扣退记录</h3>
        <el-table :data="detail.creditLedger" size="small">
          <template #empty>
            <EmptyState description="暂无关联积分流水"/>
          </template>
          <el-table-column prop="createdAt" label="时间" width="170">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="type" label="类型" min-width="150"/>
          <el-table-column label="变动" width="100">
            <template #default="{ row }">{{ row.direction === 'CREDIT' ? '+' : '-' }}{{ row.amount }}</template>
          </el-table-column>
          <el-table-column prop="balanceAfter" label="余额" width="90"/>
        </el-table>
      </div>
      <div class="panel"><h3>操作审计</h3>
        <el-timeline>
          <el-timeline-item v-for="audit in detail.auditLogs" :key="audit.id" :timestamp="formatDate(audit.createdAt)">
            {{ audit.operatorName }} · {{ audit.action }}
          </el-timeline-item>
        </el-timeline>
        <EmptyState v-if="detail.auditLogs.length === 0" description="暂无关联操作"/>
      </div>
    </div>
    <el-dialog v-model="manualRefundVisible" title="人工补偿失败任务" width="480px" :close-on-click-modal="false">
      <el-alert title="补偿会写入关联积分流水并清除该任务的退款待办，原异常和处理审计会保留。" type="info"
                :closable="false" style="margin-bottom: 16px"/>
      <el-form label-width="96px">
        <el-form-item label="失败任务">
          <el-select v-model="manualRefund.jobId" style="width: 100%">
            <el-option v-for="job in refundableJobs" :key="job.id" :value="job.id"
                       :label="`${job.id} · ${job.name}（待补 ${job.creditsCharged - job.creditsRefunded} 积分）`"/>
          </el-select>
        </el-form-item>
        <el-form-item label="补偿原因" required>
          <el-input v-model="manualRefund.reason" type="textarea" :rows="3" maxlength="200" show-word-limit
                    placeholder="例如：核对供应商超时异常后，执行人工补偿"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualRefundVisible = false">取消</el-button>
        <el-button type="warning" :loading="manualRefundSubmitting" @click="submitManualRefund">确认补偿</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {ElMessageBox} from 'element-plus/es/components/message-box/index.mjs'
import {getWorkflow, manuallyRefundFailedJob, requestJobCancellation, retryJob} from '@/api/workflows'
import WorkflowTimeline from '@/components/business/WorkflowTimeline.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {useAuthStore} from '@/stores/auth'
import type {JobDetail, WorkflowDetail, WorkflowStatus} from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const detail = ref<WorkflowDetail>()
const loading = ref(false)
const error = ref<string>()
const manualRefundVisible = ref(false)
const manualRefundSubmitting = ref(false)
const manualRefund = reactive({jobId: '', reason: ''})

const refundableJobs = computed(() => detail.value?.jobs.filter((job) => (
    (job.status === 'FAILED' || job.status === 'TIMED_OUT' || job.status === 'EXPIRED')
    && job.creditsCharged > job.creditsRefunded
)) || [])
const hasRefundException = computed(() => refundableJobs.value.length > 0)

function workflowId(): string | undefined {
  return typeof route.params.id === 'string' ? route.params.id : undefined
}

function formatDate(value?: string): string {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}

function workflowStatusLabel(status: WorkflowStatus): string {
  return {
    QUEUED: '排队中',
    RUNNING: '运行中',
    SUCCEEDED: '成功',
    PARTIALLY_SUCCEEDED: '部分成功',
    FAILED: '失败',
    CANCEL_REQUESTED: '取消请求中',
    CANCELLED: '已取消',
  }[status]
}

function workflowStatusType(status: WorkflowStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'SUCCEEDED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'CANCELLED') return 'info'
  return 'warning'
}

async function load(): Promise<void> {
  const id = workflowId()
  if (!id) {
    error.value = '工作流 ID 不正确'
    return
  }
  loading.value = true
  error.value = undefined
  try {
    detail.value = (await getWorkflow(id)).data
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : '加载工作流详情失败'
  } finally {
    loading.value = false
  }
}

async function retry(job: JobDetail): Promise<void> {
  const currentAttempt = job.attempts.find((attempt) => attempt.id === job.currentAttemptId)
  await ElMessageBox.confirm(`将创建新的执行尝试；旧失败记录会保留，且不会再次扣除用户积分。\n\n${currentAttempt?.errorMessage || ''}`, '确认重试任务', {type: 'warning'})
  await retryJob(job.id)
  ElMessage.success('已创建新的执行尝试，Mock 将在约 3 秒后完成')
  await load()
  window.setTimeout(() => void load(), 3500)
}

async function requestCancel(job: JobDetail): Promise<void> {
  await ElMessageBox.confirm('取消会先进入“取消请求中”，等待供应商确认后才会结束。确认继续？', '确认取消任务', {type: 'warning'})
  await requestJobCancellation(job.id)
  ElMessage.success('已提交取消请求')
  await load()
  window.setTimeout(() => void load(), 2000)
}

function openManualRefund(): void {
  const firstJob = refundableJobs.value[0]
  if (!firstJob) return
  manualRefund.jobId = firstJob.id
  manualRefund.reason = ''
  manualRefundVisible.value = true
}

async function submitManualRefund(): Promise<void> {
  if (!manualRefund.jobId || !manualRefund.reason.trim()) {
    ElMessage.warning('请选择失败任务并填写补偿原因')
    return
  }
  manualRefundSubmitting.value = true
  try {
    await manuallyRefundFailedJob(manualRefund.jobId, manualRefund.reason.trim())
    ElMessage.success('人工补偿已完成，积分流水和审计记录已更新')
    manualRefundVisible.value = false
    await load()
  } finally {
    manualRefundSubmitting.value = false
  }
}

onMounted(() => void load())
</script>
