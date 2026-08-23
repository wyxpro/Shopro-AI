<template>
  <PageHeader title="客户工单" description="客诉和人工运营操作的关联依据">
    <template #actions>
      <el-button @click="router.push('/users')">返回客户列表</el-button>
    </template>
  </PageHeader>
  <div class="panel">
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="搜索工单号、标题或用户" clearable @keyup.enter="search"/>
      <el-select v-model="query.status" placeholder="工单状态" clearable>
        <el-option label="待处理" value="OPEN"/>
        <el-option label="处理中" value="PROCESSING"/>
        <el-option label="等待用户" value="WAITING_USER"/>
        <el-option label="已解决" value="RESOLVED"/>
        <el-option label="已关闭" value="CLOSED"/>
      </el-select>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
    <el-table :data="rows" v-loading="loading" style="cursor: pointer" @row-click="openDetail">
      <template #empty>
        <EmptyState description="暂无工单；可从用户详情创建"/>
      </template>
      <el-table-column prop="id" label="工单号" min-width="190"/>
      <el-table-column prop="title" label="标题" min-width="210"/>
      <el-table-column prop="userId" label="用户 ID" width="100"/>
      <el-table-column prop="category" label="分类" width="150"/>
      <el-table-column prop="priority" label="优先级" width="100"/>
      <el-table-column prop="status" label="状态" width="130"/>
      <el-table-column prop="updatedAt" label="更新时间" width="175">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
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
import {useRouter} from 'vue-router'
import {getTickets} from '@/api/tickets'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import {usePagedQuery} from '@/composables/usePagedQuery'
import type {ListQuery, SupportTicket} from '@/types'

const router = useRouter()
const query = ref<ListQuery>({page: 1, pageSize: 10, keyword: '', status: ''})
const {rows, total, loading, error, load} = usePagedQuery(query, getTickets)

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

function search(): void {
  query.value.page = 1
  void load()
}

function resetFilters(): void {
  query.value = {page: 1, pageSize: 10, keyword: '', status: ''}
  void load()
}

function openDetail(ticket: SupportTicket): void {
  void router.push({name: 'ticket-detail', params: {id: ticket.id}})
}

onMounted(() => void load())
</script>
