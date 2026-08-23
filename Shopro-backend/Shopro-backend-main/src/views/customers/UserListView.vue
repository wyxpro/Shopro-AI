<template>
  <PageHeader title="客户中心" description="查询客户、企业套餐、能力状态与风险等级">
    <template #actions>
      <el-button @click="router.push('/tickets')">查看工单</el-button>
    </template>
  </PageHeader>
  <div class="panel">
    <div class="toolbar filter-toolbar">
      <el-input v-model="query.userId" placeholder="用户 ID" clearable @keyup.enter="load"/>
      <el-input v-model="query.name" placeholder="姓名" clearable @keyup.enter="load"/>
      <el-input v-model="query.email" placeholder="邮箱" clearable @keyup.enter="load"/>
      <el-input v-model="query.organization" placeholder="企业" clearable @keyup.enter="load"/>
      <el-select v-model="query.planName" placeholder="套餐" clearable>
        <el-option label="体验套餐" value="体验套餐"/>
        <el-option label="专业套餐" value="专业套餐"/>
        <el-option label="企业套餐" value="企业套餐"/>
      </el-select>
      <el-select v-model="query.capability" placeholder="已启用能力" clearable>
        <el-option label="登录" value="login"/>
        <el-option label="生成" value="generation"/>
        <el-option label="发布" value="publishing"/>
        <el-option label="API" value="api"/>
      </el-select>
      <el-select v-model="query.riskLevel" placeholder="风险等级" clearable>
        <el-option label="低风险" value="LOW"/>
        <el-option label="中风险" value="MEDIUM"/>
        <el-option label="高风险" value="HIGH"/>
      </el-select>
      <el-date-picker v-model="query.startAt" type="date" value-format="YYYY-MM-DD" placeholder="注册开始"/>
      <el-date-picker v-model="query.endAt" type="date" value-format="YYYY-MM-DD" placeholder="注册结束"/>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
    <el-table :data="rows" v-loading="loading" style="cursor: pointer" @row-click="openDetail">
      <template #empty>
        <EmptyState/>
      </template>
      <el-table-column prop="id" label="用户 ID" width="82"/>
      <el-table-column prop="name" label="姓名" width="110"/>
      <el-table-column prop="email" label="邮箱" min-width="180"/>
      <el-table-column prop="organizationName" label="企业" min-width="160">
        <template #default="{ row }">{{ row.organizationName || '个人用户' }}</template>
      </el-table-column>
      <el-table-column prop="planName" label="套餐" width="110"/>
      <el-table-column label="能力" min-width="150">
        <template #default="{ row }">
          <StatusTag :label="row.capabilities.login === 'ENABLED' ? '可登录' : '禁登录'"
                     :type="row.capabilities.login === 'ENABLED' ? 'success' : 'danger'"/>
          <StatusTag style="margin-left: 6px" :label="row.capabilities.generation === 'ENABLED' ? '可生成' : '禁生成'"
                     :type="row.capabilities.generation === 'ENABLED' ? 'success' : 'danger'"/>
        </template>
      </el-table-column>
      <el-table-column label="风险" width="100">
        <template #default="{ row }">
          <StatusTag :label="riskLabel(row.riskLevel)" :type="riskType(row.riskLevel)"/>
        </template>
      </el-table-column>
      <el-table-column prop="creditBalance" label="积分余额" width="100"/>
      <el-table-column prop="createdAt" label="注册时间" width="150">
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
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {getCustomerUsers} from '@/api/customers'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {usePagedQuery} from '@/composables/usePagedQuery'
import type {CustomerUser, CustomerUserListItem, CustomerUserListQuery} from '@/types'

const router = useRouter()
const query = ref<CustomerUserListQuery>({page: 1, pageSize: 10})
const {rows, total, loading, error, load} = usePagedQuery(query, getCustomerUsers)

function formatDate(value: string): string {
  return value.slice(0, 10)
}

function riskLabel(level: CustomerUser['riskLevel']): string {
  return {LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险'}[level]
}

function riskType(level: CustomerUser['riskLevel']): 'success' | 'warning' | 'danger' {
  if (level === 'LOW') return 'success'
  if (level === 'MEDIUM') return 'warning'
  return 'danger'
}

function search(): void {
  query.value.page = 1
  void load()
}

function resetFilters(): void {
  query.value = {page: 1, pageSize: 10}
  void load()
}

function openDetail(row: CustomerUserListItem): void {
  void router.push({name: 'customer-user-detail', params: {id: row.id}})
}

void load()
</script>
