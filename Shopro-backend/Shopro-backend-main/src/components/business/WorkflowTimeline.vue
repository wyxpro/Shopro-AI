<template>
  <el-timeline>
    <el-timeline-item v-for="job in jobs" :key="job.id" :type="timelineType(job.status)"
                      :timestamp="formatDate(job.updatedAt)" placement="top">
      <div class="workflow-job-card">
        <div class="workflow-job-header">
          <div>
            <strong>{{ job.name }}</strong>
            <span class="muted"> · {{ job.type }} · 第 {{ job.attemptCount }}/{{ job.maxAttempts }} 次</span>
          </div>
          <div class="workflow-job-actions">
            <StatusTag :label="job.status" :type="timelineType(job.status)"/>
            <el-button v-if="auth.hasPermission('workflow:operate') && canRetry(job)" link type="primary"
                       @click="emit('retry', job)">重试
            </el-button>
            <el-tooltip v-else-if="auth.hasPermission('workflow:operate') && isFailure(job.status)"
                        :content="retryDisabledReason(job)">
              <el-button link disabled>不可重试</el-button>
            </el-tooltip>
            <el-button v-if="auth.hasPermission('workflow:operate') && canCancel(job.status)" link type="danger"
                       @click="emit('cancel', job)">请求取消
            </el-button>
          </div>
        </div>
        <el-table :data="job.attempts" size="small" style="margin-top: 12px">
          <template #empty>
            <EmptyState description="任务尚未发起真实执行"/>
          </template>
          <el-table-column prop="attemptNo" label="尝试" width="70">
            <template #default="{ row }">#{{ row.attemptNo }}</template>
          </el-table-column>
          <el-table-column prop="provider" label="供应商" width="110"/>
          <el-table-column prop="model" label="模型" min-width="150"/>
          <el-table-column prop="providerTaskId" label="供应商任务号" min-width="150"/>
          <el-table-column prop="status" label="状态" width="130"/>
          <el-table-column label="耗时 / 成本" min-width="130">
            <template #default="{ row }">{{ duration(row.startedAt, row.finishedAt) }} /
              ¥{{ (row.providerCostMinor / 100).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="errorCategory" label="错误分类" min-width="150"/>
          <el-table-column prop="errorMessage" label="错误信息" min-width="220"/>
          <el-table-column label="输出" width="90">
            <template #default="{ row }"><a v-if="row.outputUrl" :href="row.outputUrl" target="_blank" rel="noreferrer">预览</a><span
                v-else>-</span></template>
          </el-table-column>
        </el-table>
      </div>
    </el-timeline-item>
  </el-timeline>
</template>

<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {useAuthStore} from '@/stores/auth'
import type {JobDetail, JobStatus} from '@/types'

const props = defineProps<{
  jobs: JobDetail[]
}>()
const auth = useAuthStore()

const emit = defineEmits<{
  retry: [job: JobDetail]
  cancel: [job: JobDetail]
}>()

function isFailure(status: JobStatus): boolean {
  return status === 'FAILED' || status === 'TIMED_OUT' || status === 'EXPIRED'
}

function canRetry(job: JobDetail): boolean {
  const attempt = job.attempts.find((item) => item.id === job.currentAttemptId)
  return isFailure(job.status) && Boolean(attempt?.retryable) && job.attemptCount < job.maxAttempts
}

function retryDisabledReason(job: JobDetail): string {
  const attempt = job.attempts.find((item) => item.id === job.currentAttemptId)
  if (!attempt?.retryable) return `错误分类 ${attempt?.errorCategory || '未知'} 不允许后台直接重试`
  if (job.attemptCount >= job.maxAttempts) return '已达到最大重试次数'
  return '当前任务状态不允许重试'
}

function canCancel(status: JobStatus): boolean {
  return status === 'WAITING' || status === 'QUEUED' || status === 'RUNNING'
}

function timelineType(status: JobStatus): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'SUCCEEDED') return 'success'
  if (status === 'FAILED' || status === 'TIMED_OUT' || status === 'EXPIRED') return 'danger'
  if (status === 'CANCELLED') return 'info'
  return 'warning'
}

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

function duration(startedAt?: string, finishedAt?: string): string {
  if (!startedAt) return '-'
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000))
  return `${seconds}s`
}
</script>
