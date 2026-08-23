<template>
  <PageHeader title="积分流水" description="积分余额以不可编辑的账本流水为准">
    <template #actions>
      <el-button @click="router.push({name: 'customer-user-detail', params: {id: id}})">返回用户详情</el-button>
      <el-button v-if="auth.hasPermission('customers:operate')" type="primary" @click="dialogVisible = true">积分调整
      </el-button>
    </template>
  </PageHeader>
  <div class="panel">
    <div class="toolbar">
      <el-input v-model="query.keyword" placeholder="搜索原因、业务编号或操作人" clearable @keyup.enter="search"/>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
    <el-table :data="rows" v-loading="loading">
      <template #empty>
        <EmptyState description="暂无积分流水"/>
      </template>
      <el-table-column prop="id" label="流水号" min-width="210"/>
      <el-table-column prop="createdAt" label="创建时间" width="175">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="方向" width="90">
        <template #default="{ row }">
          <StatusTag :label="row.direction === 'CREDIT' ? '增加' : '扣减'"
                     :type="row.direction === 'CREDIT' ? 'success' : 'danger'"/>
        </template>
      </el-table-column>
      <el-table-column prop="amount" label="变动积分" width="100">
        <template #default="{ row }"><span :class="row.direction === 'CREDIT' ? 'credit-increase' : 'credit-decrease'">{{
            row.direction === 'CREDIT' ? '+' : '-'
          }}{{ row.amount }}</span></template>
      </el-table-column>
      <el-table-column prop="balanceBefore" label="变动前" width="90"/>
      <el-table-column prop="balanceAfter" label="变动后" width="90"/>
      <el-table-column prop="reasonCode" label="原因码" min-width="160"/>
      <el-table-column prop="reason" label="详细原因" min-width="220"/>
      <el-table-column prop="bizId" label="关联业务" min-width="150"/>
      <el-table-column prop="operatorId" label="操作人" width="100"/>
    </el-table>
    <el-pagination layout="total,prev,pager,next" :total="total" v-model:current-page="query.page"
                   @current-change="load"/>
  </div>
  <CreditAdjustmentDialog v-if="id" v-model="dialogVisible" :user-id="id" @submitted="load"/>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {getUserCreditLedger} from '@/api/credits'
import CreditAdjustmentDialog from '@/components/business/CreditAdjustmentDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import {useAuthStore} from '@/stores/auth'
import StatusTag from '@/components/common/StatusTag.vue'
import {usePagedQuery} from '@/composables/usePagedQuery'
import type {CreditLedgerEntry, ListQuery} from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const id = computed(() => typeof route.params.id === 'string' ? route.params.id : '')
const query = ref<ListQuery>({page: 1, pageSize: 10, keyword: ''})
const {rows, total, loading, error, load} = usePagedQuery<CreditLedgerEntry, ListQuery>(
    query,
    (params) => getUserCreditLedger(id.value, params),
)
const dialogVisible = ref(false)

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

function search(): void {
  query.value.page = 1
  void load()
}

function resetFilters(): void {
  query.value = {page: 1, pageSize: 10, keyword: ''}
  void load()
}

onMounted(() => void load())
</script>
