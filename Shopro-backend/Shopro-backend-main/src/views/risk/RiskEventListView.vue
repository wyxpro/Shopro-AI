<template>
  <PageHeader title="风险事件" description="以风险事件为对象处置内容合规问题；私有自动通过内容不会进入人工队列。"/>
  <div class="panel">
    <div class="toolbar filters">
      <el-input v-model="query.keyword" clearable placeholder="事件 ID、内容、用户或规则" style="width: 220px"
                @keyup.enter="load"/>
      <el-select v-model="query.source" clearable placeholder="来源" style="width: 130px" @change="load">
        <el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value"/>
      </el-select>
      <el-select v-model="query.riskType" clearable placeholder="风险类型" style="width: 150px" @change="load">
        <el-option v-for="item in riskTypeOptions" :key="item.value" :label="item.label" :value="item.value"/>
      </el-select>
      <el-select v-model="query.severity" clearable placeholder="等级" style="width: 120px" @change="load">
        <el-option v-for="item in severityOptions" :key="item.value" :label="item.label" :value="item.value"/>
      </el-select>
      <el-select v-model="query.status" clearable placeholder="状态" style="width: 145px" @change="load">
        <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value"/>
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期"
                      end-placeholder="结束日期" @change="applyDateRange"/>
      <el-button @click="resetFilters">重置</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
    <el-table :data="rows" v-loading="loading" @row-click="openDetail" style="cursor: pointer">
      <template #empty>
        <EmptyState description="没有符合条件的风险事件"/>
      </template>
      <el-table-column prop="id" label="事件 ID" width="190"/>
      <el-table-column prop="contentTitle" label="内容" min-width="180"/>
      <el-table-column prop="userName" label="用户" width="120"/>
      <el-table-column label="来源" width="115">
        <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
      </el-table-column>
      <el-table-column label="风险类型" min-width="135">
        <template #default="{ row }">{{ riskTypeLabel(row.riskType) }}</template>
      </el-table-column>
      <el-table-column label="等级" width="95">
        <template #default="{ row }">
          <StatusTag :label="severityLabel(row.severity)" :type="severityType(row.severity)"/>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <StatusTag :label="statusLabel(row.status)" :type="statusType(row.status)"/>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="175">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="query.page" :page-size="query.pageSize" layout="total,prev,pager,next"
                   :total="total" @current-change="load"/>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {getRiskEvents} from '@/api/risk'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {usePagedQuery} from '@/composables/usePagedQuery'
import type {RiskEvent, RiskEventListItem, RiskEventListQuery} from '@/types'

const router = useRouter()
const route = useRoute()
const query = ref<RiskEventListQuery>({page: 1, pageSize: 10})
const dateRange = ref<string[]>()
const {rows, total, loading, error, load} = usePagedQuery(query, getRiskEvents)

const sourceOptions = [{label: '自动扫描', value: 'AUTO_SCAN'}, {
  label: '用户举报',
  value: 'USER_REPORT'
}, {label: '平台驳回', value: 'PLATFORM_REJECT'}, {label: '人工创建', value: 'MANUAL'}]
const riskTypeOptions = [{label: '违禁商品', value: 'PROHIBITED_GOODS'}, {
  label: '虚假宣传',
  value: 'FALSE_CLAIM'
}, {label: '版权', value: 'COPYRIGHT'}, {label: '肖像权', value: 'PORTRAIT_RIGHTS'}, {
  label: '声音授权',
  value: 'VOICE_AUTH'
}, {label: '个人数据', value: 'PERSONAL_DATA'}, {label: '其他', value: 'OTHER'}]
const severityOptions = [{label: '低', value: 'LOW'}, {label: '中', value: 'MEDIUM'}, {
  label: '高',
  value: 'HIGH'
}, {label: '严重', value: 'CRITICAL'}]
const statusOptions = [{label: '待复核', value: 'PENDING_REVIEW'}, {label: '已通过', value: 'PASSED'}, {
  label: '已驳回',
  value: 'REJECTED'
}, {label: '已升级', value: 'ESCALATED'}, {label: '申诉待审', value: 'APPEAL_PENDING'}, {
  label: '申诉通过',
  value: 'APPEAL_PASSED'
}, {label: '申诉驳回', value: 'APPEAL_REJECTED'}]

function sourceLabel(value: RiskEvent['source']): string {
  return sourceOptions.find((item) => item.value === value)?.label || value
}

function riskTypeLabel(value: RiskEvent['riskType']): string {
  return riskTypeOptions.find((item) => item.value === value)?.label || value
}

function severityLabel(value: RiskEvent['severity']): string {
  return severityOptions.find((item) => item.value === value)?.label || value
}

function statusLabel(value: RiskEvent['status']): string {
  return statusOptions.find((item) => item.value === value)?.label || value
}

function severityType(value: RiskEvent['severity']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'CRITICAL' || value === 'HIGH' ? 'danger' : value === 'MEDIUM' ? 'warning' : 'info'
}

function statusType(value: RiskEvent['status']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'PASSED' || value === 'APPEAL_PASSED' ? 'success' : value === 'REJECTED' || value === 'APPEAL_REJECTED' ? 'danger' : value === 'ESCALATED' ? 'warning' : 'info'
}

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

function applyDateRange(value?: string[]): void {
  query.value.startAt = value?.[0]
  query.value.endAt = value?.[1]
  query.value.page = 1
  void load()
}

function resetFilters(): void {
  query.value = {page: 1, pageSize: 10}
  dateRange.value = undefined
  void load()
}

function openDetail(row: RiskEventListItem): void {
  void router.push({name: 'risk-event-detail', params: {id: row.id}})
}

onMounted(() => {
  const status = route.query.status
  const keyword = route.query.keyword
  if (typeof status === 'string' && statusOptions.some((item) => item.value === status)) query.value.status = status as RiskEvent['status']
  if (typeof keyword === 'string') query.value.keyword = keyword
  void load()
})
</script>
