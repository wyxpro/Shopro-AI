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
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canReverse(row)" link type="warning" :disabled="!!reversingId" @click="reverse(row)">
            冲正
          </el-button>
          <span v-else-if="row.type === 'REVERSAL'" class="muted">冲正记录</span>
          <span v-else class="muted">{{ reversedIds.has(row.id) ? '已冲正' : '—' }}</span>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination layout="total,prev,pager,next" :total="total" v-model:current-page="query.page"
                   @current-change="load"/>
  </div>
  <CreditAdjustmentDialog v-if="id" v-model="dialogVisible" :user-id="id" @submitted="load"/>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {ElMessageBox} from 'element-plus/es/components/message-box/index.mjs'
import {createCreditReversal, getUserCreditLedger} from '@/api/credits'
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
const reversingId = ref<string>()

// 已被冲正的原流水 ID 集合：由列表内 REVERSAL 行的 reversedEntryId 反推，避免额外请求。
const reversedIds = computed(() => new Set(
    rows.value.filter((row) => row.reversedEntryId).map((row) => row.reversedEntryId as string),
))

function canReverse(row: CreditLedgerEntry): boolean {
  return auth.hasPermission('customers:operate')
      && row.type !== 'REVERSAL'
      && !reversedIds.value.has(row.id)
      && !reversingId.value
}

async function reverse(row: CreditLedgerEntry): Promise<void> {
  const {value} = await ElMessageBox.prompt(
      `将生成一条方向相反的冲正流水抵消「${row.direction === 'CREDIT' ? '+' : '-'}${row.amount}」积分，原流水保持不可变。请填写冲正原因。`,
      '冲正积分流水',
      {inputType: 'textarea', inputPlaceholder: '例如：误操作补偿，需撤销该笔扣减', inputValidator: (input: string) => (input && input.trim() ? true : '冲正原因不能为空')},
  )
  reversingId.value = row.id
  try {
    await createCreditReversal(row.id, {reason: value.trim(), idempotencyKey: crypto.randomUUID()})
    ElMessage.success('冲正已完成，余额与流水已更新')
    await load()
  } finally {
    reversingId.value = undefined
  }
}

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
