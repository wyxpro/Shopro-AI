<template>
  <PageHeader title="AI 生产运营" description="以工作流为主追踪生成履约、失败、成本与人工处理">
    <template #actions>
      <el-button @click="load">刷新</el-button>
    </template>
  </PageHeader>
  <div class="panel">
    <div class="toolbar filter-toolbar">
      <el-input v-model="query.keyword" placeholder="工作流、商品或用户" clearable @keyup.enter="search"/>
      <el-input v-model="query.userId" placeholder="用户 ID" clearable @keyup.enter="search"/>
      <el-input v-model="query.organization" placeholder="企业" clearable @keyup.enter="search"/>
      <el-select v-model="query.status" placeholder="工作流状态" clearable>
        <el-option label="排队中" value="QUEUED"/>
        <el-option label="运行中" value="RUNNING"/>
        <el-option label="成功" value="SUCCEEDED"/>
        <el-option label="部分成功" value="PARTIALLY_SUCCEEDED"/>
        <el-option label="失败" value="FAILED"/>
        <el-option label="取消请求中" value="CANCEL_REQUESTED"/>
        <el-option label="已取消" value="CANCELLED"/>
      </el-select>
      <el-select v-model="query.jobType" placeholder="任务类型" clearable>
        <el-option label="视频生成" value="VIDEO_GENERATION"/>
        <el-option label="脚本生成" value="SCRIPT_GENERATION"/>
        <el-option label="语音合成" value="TTS"/>
      </el-select>
      <el-select v-model="query.model" placeholder="模型" clearable>
        <el-option label="Seedance" value="seedance-2-0-fast"/>
        <el-option label="DeepSeek" value="deepseek-v4-flash"/>
        <el-option label="CosyVoice" value="cosyvoice2"/>
      </el-select>
      <el-select v-model="query.errorCategory" placeholder="错误分类" clearable>
        <el-option label="供应商超时" value="PROVIDER_TIMEOUT"/>
        <el-option label="输入不合法" value="INVALID_INPUT"/>
        <el-option label="供应商不可用" value="PROVIDER_UNAVAILABLE"/>
      </el-select>
      <el-select v-model="query.needsAttention" placeholder="人工处理" clearable>
        <el-option label="需要处理" value="true"/>
        <el-option label="无需处理" value="false"/>
      </el-select>
      <el-date-picker v-model="query.startAt" type="date" value-format="YYYY-MM-DD" placeholder="创建开始"/>
      <el-date-picker v-model="query.endAt" type="date" value-format="YYYY-MM-DD" placeholder="创建结束"/>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
    <el-table :data="rows" v-loading="loading" style="cursor: pointer" @row-click="openDetail">
      <template #empty>
        <EmptyState description="没有符合筛选条件的工作流"/>
      </template>
      <el-table-column prop="id" label="工作流 ID" width="110"/>
      <el-table-column prop="productName" label="商品" min-width="150"/>
      <el-table-column label="用户 / 企业" min-width="180">
        <template #default="{ row }">{{ row.userName }}<br><span class="muted">{{
            row.organizationName || row.userId
          }}</span></template>
      </el-table-column>
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <StatusTag :label="workflowStatusLabel(row.status)" :type="workflowStatusType(row.status)"/>
        </template>
      </el-table-column>
      <el-table-column prop="currentStep" label="当前步骤" width="110"/>
      <el-table-column label="进度" width="130">
        <template #default="{ row }">
          <el-progress :percentage="row.progress" :stroke-width="8"/>
        </template>
      </el-table-column>
      <el-table-column label="积分" width="110">
        <template #default="{ row }">{{ row.totalCredits - row.refundedCredits }}</template>
      </el-table-column>
      <el-table-column label="供应商成本" width="120">
        <template #default="{ row }">¥{{ (row.providerCostMinor / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="人工处理" width="100">
        <template #default="{ row }">
          <StatusTag :label="row.needsAttention ? '需处理' : '正常'"
                     :type="row.needsAttention ? 'warning' : 'success'"/>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination layout="total,prev,pager,next" :total="total" v-model:current-page="query.page"
                   @current-change="load"/>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {getWorkflows} from '@/api/workflows'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {usePagedQuery} from '@/composables/usePagedQuery'
import type {WorkflowListItem, WorkflowListQuery, WorkflowStatus} from '@/types'

const router = useRouter()
const route = useRoute()
const query = ref<WorkflowListQuery>({page: 1, pageSize: 10})
const {rows, total, loading, error, load} = usePagedQuery(query, getWorkflows)

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

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

function search(): void {
  query.value.page = 1
  void load()
}

function resetFilters(): void {
  query.value = {page: 1, pageSize: 10}
  void load()
}

function openDetail(workflow: WorkflowListItem): void {
  void router.push({name: 'workflow-detail', params: {id: workflow.id}})
}

onMounted(() => {
  if (route.query.needsAttention === 'true' || route.query.needsAttention === 'false') query.value.needsAttention = route.query.needsAttention
  void load()
})
</script>
