<template>
  <PageHeader title="交易与计费" description="订单金额以分存储、在界面格式化；支付、权益和退款状态独立管理。"/>
  <div class="cards">
    <div v-for="metric in metrics" :key="metric.label" class="card"><span class="kpi-label">{{ metric.label }}</span>
      <div class="kpi-value">{{ metric.value }}</div>
      <span class="trend">{{ metric.hint }}</span></div>
  </div>
  <div class="panel" style="margin-top: 16px">
    <el-tabs v-model="tab" @tab-change="onTabChange">
      <el-tab-pane label="订单" name="orders">
        <div class="toolbar filters">
          <el-input v-model="orderQuery.keyword" clearable placeholder="订单号、用户或套餐" style="width: 220px"
                    @keyup.enter="loadOrders"/>
          <el-select v-model="orderQuery.paymentStatus" clearable placeholder="支付状态" style="width: 140px"
                     @change="loadOrders">
            <el-option v-for="item in paymentOptions" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
          <el-select v-model="orderQuery.entitlementStatus" clearable placeholder="权益状态" style="width: 140px"
                     @change="loadOrders">
            <el-option v-for="item in entitlementOptions" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
          <el-button @click="resetOrderFilters">重置</el-button>
        </div>
        <el-alert v-if="orderError" :title="orderError" type="error" show-icon :closable="false"
                  style="margin-bottom: 16px"/>
        <el-table :data="orderRows" v-loading="orderLoading" @row-click="openOrder" style="cursor: pointer">
          <template #empty>
            <EmptyState description="暂无订单"/>
          </template>
          <el-table-column prop="id" label="订单号" min-width="230"/>
          <el-table-column prop="userName" label="用户" width="120"/>
          <el-table-column label="套餐快照" min-width="150">
            <template #default="{ row }">{{ row.planSnapshot.name }} v{{ row.planSnapshot.version }}</template>
          </el-table-column>
          <el-table-column label="金额" width="110">
            <template #default="{ row }">{{ formatMoney(row.amountMinor, row.currency) }}</template>
          </el-table-column>
          <el-table-column label="支付" width="120">
            <template #default="{ row }">
              <StatusTag :label="paymentLabel(row.paymentStatus)" :type="paymentType(row.paymentStatus)"/>
            </template>
          </el-table-column>
          <el-table-column label="权益" width="120">
            <template #default="{ row }">
              <StatusTag :label="entitlementLabel(row.entitlementStatus)"
                         :type="entitlementType(row.entitlementStatus)"/>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="175">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openOrder(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination v-model:current-page="orderQuery.page" :page-size="orderQuery.pageSize"
                       layout="total,prev,pager,next" :total="orderTotal" @current-change="loadOrders"/>
      </el-tab-pane>

      <el-tab-pane label="退款申请" name="refunds">
        <el-alert title="退款先进入审批；审批通过后才会模拟渠道执行及积分回收。" type="info" :closable="false"
                  style="margin-bottom: 16px"/>
        <el-table :data="refunds" v-loading="refundLoading">
          <template #empty>
            <EmptyState description="暂无退款申请"/>
          </template>
          <el-table-column prop="id" label="退款 ID" min-width="220"/>
          <el-table-column prop="orderId" label="订单" min-width="210">
            <template #default="{ row }">
              <el-button link type="primary" @click="openOrderById(row.orderId)">{{ row.orderId }}</el-button>
            </template>
          </el-table-column>
          <el-table-column label="退款金额" width="115">
            <template #default="{ row }">{{ formatMoney(row.amountMinor, 'CNY') }}</template>
          </el-table-column>
          <el-table-column prop="reclaimCredits" label="回收积分" width="100"/>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <StatusTag :label="refundLabel(row.status)" :type="refundType(row.status)"/>
            </template>
          </el-table-column>
          <el-table-column prop="ticketId" label="关联工单" min-width="180"/>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button v-if="row.status === 'PENDING_APPROVAL' && auth.hasPermission('billing:refund:approve')" link
                         type="success" @click="approve(row.id)">审批通过
              </el-button>
              <el-button v-if="row.status === 'PENDING_APPROVAL' && auth.hasPermission('billing:refund:approve')" link
                         type="danger" @click="reject(row.id)">拒绝
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="套餐版本" name="plans">
        <div class="toolbar">
          <el-button v-if="auth.hasPermission('billing:plan:manage')" type="primary" @click="openPlanDialog">
            创建套餐新版本
          </el-button>
          <span class="subtle">修改价格或权益会新增版本，历史订单仍使用其购买时快照。</span></div>
        <el-table :data="plans" v-loading="planLoading">
          <template #empty>
            <EmptyState description="暂无套餐版本"/>
          </template>
          <el-table-column prop="planId" label="套餐 ID" min-width="140"/>
          <el-table-column prop="name" label="套餐名称" min-width="130"/>
          <el-table-column prop="version" label="版本" width="80">
            <template #default="{ row }">v{{ row.version }}</template>
          </el-table-column>
          <el-table-column label="价格" width="110">
            <template #default="{ row }">{{ formatMoney(row.priceMinor, row.currency) }}</template>
          </el-table-column>
          <el-table-column prop="grantedCredits" label="赠送积分" width="100"/>
          <el-table-column prop="validityDays" label="有效期" width="95">
            <template #default="{ row }">{{ row.validityDays }} 天</template>
          </el-table-column>
          <el-table-column prop="seatLimit" label="席位" width="75"/>
          <el-table-column label="能力" min-width="180">
            <template #default="{ row }">{{ row.capabilities.join('、') }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>

  <el-dialog v-model="planDialogVisible" title="创建套餐新版本" width="540px" :close-on-click-modal="false">
    <el-form label-width="108px">
      <el-form-item label="基准套餐" required>
        <el-select v-model="planForm.planId" style="width: 100%" @change="selectPlan">
          <el-option v-for="plan in latestPlans" :key="plan.planId" :value="plan.planId"
                     :label="`${plan.name}（当前 v${plan.version}）`"/>
        </el-select>
      </el-form-item>
      <el-form-item label="版本名称" required>
        <el-input v-model="planForm.name"/>
      </el-form-item>
      <el-form-item label="价格（元）" required>
        <el-input-number v-model="planForm.priceYuan" :min="0" :precision="2" style="width: 100%"/>
      </el-form-item>
      <el-form-item label="赠送积分" required>
        <el-input-number v-model="planForm.grantedCredits" :min="0" :precision="0" style="width: 100%"/>
      </el-form-item>
      <el-form-item label="有效期（天）" required>
        <el-input-number v-model="planForm.validityDays" :min="1" :precision="0" style="width: 100%"/>
      </el-form-item>
      <el-form-item label="席位数" required>
        <el-input-number v-model="planForm.seatLimit" :min="1" :precision="0" style="width: 100%"/>
      </el-form-item>
      <el-form-item label="能力（逗号分隔）" required>
        <el-input v-model="planForm.capabilities"/>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="planDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="planSubmitting" @click="submitPlan">创建新版本</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {ElMessageBox} from 'element-plus/es/components/message-box/index.mjs'
import {approveRefund, createPlanVersion, getOrders, getPlans, getRefunds, rejectRefund} from '@/api/billing'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {usePagedQuery} from '@/composables/usePagedQuery'
import {useAuthStore} from '@/stores/auth'
import type {Order, OrderListItem, OrderListQuery, PlanSnapshot, RefundRequest} from '@/types'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const tab = ref('orders')
const orderQuery = ref<OrderListQuery>({page: 1, pageSize: 10})
const {
  rows: orderRows,
  total: orderTotal,
  loading: orderLoading,
  error: orderError,
  load: loadOrders
} = usePagedQuery(orderQuery, getOrders)
const metricOrders = ref<OrderListItem[]>([])
const refunds = ref<RefundRequest[]>([])
const refundStatus = ref<RefundRequest['status']>()
const refundLoading = ref(false)
const plans = ref<PlanSnapshot[]>([])
const planLoading = ref(false)
const planDialogVisible = ref(false)
const planSubmitting = ref(false)
const planForm = reactive({
  planId: '',
  name: '',
  priceYuan: 0,
  grantedCredits: 0,
  validityDays: 30,
  seatLimit: 1,
  capabilities: ''
})

const paymentOptions = [{label: '待支付', value: 'PENDING'}, {label: '已支付', value: 'PAID'}, {
  label: '部分退款',
  value: 'PARTIALLY_REFUNDED'
}, {label: '已退款', value: 'REFUNDED'}, {label: '已关闭', value: 'CLOSED'}]
const entitlementOptions = [{label: '待发放', value: 'PENDING'}, {
  label: '已发放',
  value: 'GRANTED'
}, {label: '发放失败', value: 'FAILED'}, {label: '已回收', value: 'RECLAIMED'}]
const latestPlans = computed(() => plans.value.filter((plan, index, list) => list.findIndex((item) => item.planId === plan.planId) === index))
const metrics = computed(() => {
  const paidOrders = metricOrders.value.filter((order) => ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.paymentStatus))
  const paidAmount = paidOrders.reduce((total, order) => total + order.amountMinor, 0)
  const successfulRefundAmount = refunds.value.filter((refund) => refund.status === 'SUCCEEDED').reduce((total, refund) => total + refund.amountMinor, 0)
  const failedEntitlements = metricOrders.value.filter((order) => order.entitlementStatus === 'FAILED').length
  return [
    {label: '累计已支付金额', value: formatMoney(paidAmount, 'CNY'), hint: '由订单支付状态计算'},
    {label: '退款成功金额', value: formatMoney(successfulRefundAmount, 'CNY'), hint: '由退款执行结果计算'},
    {
      label: '退款率',
      value: paidAmount ? `${((successfulRefundAmount / paidAmount) * 100).toFixed(1)}%` : '0.0%',
      hint: '退款成功金额 / 已支付金额'
    },
    {label: '权益异常待办', value: failedEntitlements, hint: '支付成功但权益发放失败'},
  ]
})

function formatMoney(amountMinor: number, currency: 'CNY' | 'USD'): string {
  return new Intl.NumberFormat('zh-CN', {style: 'currency', currency}).format(amountMinor / 100)
}

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

function paymentLabel(value: Order['paymentStatus']): string {
  return {
    CREATED: '已创建',
    PENDING: '待支付',
    PAID: '已支付',
    CLOSED: '已关闭',
    PARTIALLY_REFUNDED: '部分退款',
    REFUNDED: '已退款'
  }[value]
}

function entitlementLabel(value: Order['entitlementStatus']): string {
  return {PENDING: '待发放', GRANTED: '已发放', FAILED: '发放失败', RECLAIMED: '已回收'}[value]
}

function refundLabel(value: RefundRequest['status']): string {
  return {
    PENDING_APPROVAL: '待审批',
    APPROVED: '已通过',
    PROCESSING: '执行中',
    SUCCEEDED: '成功',
    FAILED: '失败',
    REJECTED: '已拒绝'
  }[value]
}

function paymentType(value: Order['paymentStatus']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'PAID' ? 'success' : value === 'REFUNDED' ? 'info' : value === 'CLOSED' ? 'danger' : 'warning'
}

function entitlementType(value: Order['entitlementStatus']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'GRANTED' ? 'success' : value === 'FAILED' ? 'danger' : value === 'RECLAIMED' ? 'info' : 'warning'
}

function refundType(value: RefundRequest['status']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'SUCCEEDED' ? 'success' : value === 'FAILED' || value === 'REJECTED' ? 'danger' : value === 'PROCESSING' ? 'warning' : 'info'
}

async function loadRefunds(): Promise<void> {
  refundLoading.value = true;
  try {
    refunds.value = (await getRefunds({page: 1, pageSize: 100, status: refundStatus.value})).data.items
  } finally {
    refundLoading.value = false
  }
}

async function loadPlans(): Promise<void> {
  planLoading.value = true;
  try {
    plans.value = (await getPlans()).data
  } finally {
    planLoading.value = false
  }
}

async function loadMetricOrders(): Promise<void> {
  metricOrders.value = (await getOrders({page: 1, pageSize: 200})).data.items
}

function resetOrderFilters(): void {
  orderQuery.value = {page: 1, pageSize: 10};
  void loadOrders()
}

function openOrder(row: OrderListItem): void {
  void router.push({name: 'billing-order-detail', params: {id: row.id}})
}

function openOrderById(id: string): void {
  void router.push({name: 'billing-order-detail', params: {id}})
}

function onTabChange(name: string | number): void {
  if (name === 'refunds') void loadRefunds();
  if (name === 'plans') void loadPlans()
}

async function askReason(title: string, placeholder: string): Promise<string | undefined> {
  try {
    const result = await ElMessageBox.prompt(placeholder, title, {
      inputPlaceholder: placeholder,
      inputValidator: (value) => value.trim() ? true : '必须填写处理意见'
    })
    return result.value.trim()
  } catch {
    return undefined
  }
}

async function approve(id: string): Promise<void> {
  const reason = await askReason('审批退款', '填写审批意见')
  if (!reason) return
  await approveRefund(id, {reason})
  ElMessage.success('已审批通过，退款将依次进入执行和完成状态')
  await loadRefunds()
  window.setTimeout(() => {
    void loadRefunds();
    void loadMetricOrders()
  }, 2200)
}

async function reject(id: string): Promise<void> {
  const reason = await askReason('拒绝退款', '填写拒绝原因')
  if (!reason) return
  await rejectRefund(id, {reason})
  ElMessage.success('退款申请已拒绝')
  await loadRefunds()
}

function openPlanDialog(): void {
  const base = latestPlans.value[0]
  if (!base) {
    ElMessage.warning('暂无可作为基准的套餐');
    return
  }
  planForm.planId = base.planId
  selectPlan()
  planDialogVisible.value = true
}

function selectPlan(): void {
  const base = latestPlans.value.find((plan) => plan.planId === planForm.planId)
  if (!base) return
  planForm.name = base.name
  planForm.priceYuan = base.priceMinor / 100
  planForm.grantedCredits = base.grantedCredits
  planForm.validityDays = base.validityDays
  planForm.seatLimit = base.seatLimit
  planForm.capabilities = base.capabilities.join(',')
}

async function submitPlan(): Promise<void> {
  const base = latestPlans.value.find((plan) => plan.planId === planForm.planId)
  const capabilities = planForm.capabilities.split(',').map((item) => item.trim()).filter(Boolean)
  if (!base || !planForm.name.trim() || capabilities.length === 0) {
    ElMessage.warning('请完整填写套餐版本信息');
    return
  }
  planSubmitting.value = true
  try {
    await createPlanVersion({
      planId: base.planId,
      version: base.version + 1,
      name: planForm.name.trim(),
      priceMinor: Math.round(planForm.priceYuan * 100),
      currency: base.currency,
      grantedCredits: planForm.grantedCredits,
      validityDays: planForm.validityDays,
      seatLimit: planForm.seatLimit,
      capabilities
    })
    ElMessage.success('已创建新套餐版本，历史订单快照未变更')
    planDialogVisible.value = false
    await loadPlans()
  } finally {
    planSubmitting.value = false
  }
}

onMounted(async () => {
  const entitlementStatus = route.query.entitlementStatus
  if (typeof entitlementStatus === 'string' && entitlementOptions.some((item) => item.value === entitlementStatus)) orderQuery.value.entitlementStatus = entitlementStatus as Order['entitlementStatus']
  const requestedTab = route.query.tab
  if (requestedTab === 'refunds' || requestedTab === 'plans' || requestedTab === 'orders') tab.value = requestedTab
  const requestedRefundStatus = route.query.status
  if (typeof requestedRefundStatus === 'string' && ['PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REJECTED'].includes(requestedRefundStatus)) refundStatus.value = requestedRefundStatus as RefundRequest['status']
  await Promise.all([loadOrders(), loadMetricOrders(), loadRefunds(), loadPlans()])
})
</script>

<style scoped>
.subtle {
  color: #909399;
  font-size: 13px;
  align-self: center;
}
</style>
