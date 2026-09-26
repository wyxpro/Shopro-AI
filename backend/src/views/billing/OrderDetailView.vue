<template>
  <PageHeader :title="detail ? `订单 ${detail.order.id}` : '订单详情'"
              description="支付状态、权益状态和退款状态独立记录，所有金额均由最小货币单位格式化展示。">
    <template #actions>
      <el-button @click="router.push('/billing/orders')">返回订单列表</el-button>
    </template>
  </PageHeader>
  <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
  <div v-if="detail" v-loading="loading">
    <el-alert v-if="detail.order.paymentStatus === 'PAID' && detail.order.entitlementStatus === 'FAILED'" type="warning"
              show-icon style="margin-bottom: 16px">
      <template #title>支付已成功且回调已处理，但套餐权益发放失败。可执行幂等补发，不会重复增加积分。
        <el-button v-if="auth.hasPermission('billing:entitlement:grant')" link type="warning" @click="regrant">
          重新发放权益
        </el-button>
      </template>
    </el-alert>
    <div class="panel">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="用户">
          <el-button link type="primary"
                     @click="router.push({name: 'customer-user-detail', params: {id: detail.user.id}})">
            {{ detail.user.name }}（{{ detail.user.id }}）
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="企业">{{ detail.organization?.name || '个人用户' }}</el-descriptions-item>
        <el-descriptions-item label="支付渠道">{{ detail.order.channel }}</el-descriptions-item>
        <el-descriptions-item label="套餐快照">{{ detail.order.planSnapshot.name }}
          v{{ detail.order.planSnapshot.version }}
        </el-descriptions-item>
        <el-descriptions-item label="订单金额">{{
            formatMoney(detail.order.amountMinor, detail.order.currency)
          }}
        </el-descriptions-item>
        <el-descriptions-item label="赠送积分">{{ detail.order.planSnapshot.grantedCredits }}</el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <StatusTag :label="paymentLabel(detail.order.paymentStatus)" :type="paymentType(detail.order.paymentStatus)"/>
        </el-descriptions-item>
        <el-descriptions-item label="权益状态">
          <StatusTag :label="entitlementLabel(detail.order.entitlementStatus)"
                     :type="entitlementType(detail.order.entitlementStatus)"/>
        </el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ formatDate(detail.order.paidAt) }}</el-descriptions-item>
      </el-descriptions>
      <div class="actions">
        <el-button v-if="canRequestRefund && auth.hasPermission('billing:refund:create')" type="primary"
                   @click="openRefundDialog">发起退款申请
        </el-button>
      </div>
    </div>

    <div class="grid2" style="margin-top: 16px">
      <div class="panel"><h3>支付事件与权益时间线</h3>
        <el-timeline>
          <el-timeline-item v-for="event in detail.paymentEvents" :key="event.id"
                            :timestamp="formatDate(event.createdAt)"
                            :type="event.type === 'ENTITLEMENT_FAILED' || event.type === 'REFUND_FAILED' ? 'danger' : event.type === 'ENTITLEMENT_GRANTED' || event.type === 'REFUND_SUCCEEDED' ? 'success' : 'info'">
            <b>{{ eventLabel(event.type) }}</b>
            <div class="subtle">{{ event.payloadSummary }} · 幂等键：{{ event.idempotencyKey }}</div>
          </el-timeline-item>
        </el-timeline>
        <EmptyState v-if="detail.paymentEvents.length === 0" description="暂无支付事件"/>
      </div>
      <div class="panel"><h3>积分流水</h3>
        <el-table :data="detail.creditLedger" size="small">
          <template #empty>
            <EmptyState description="暂无关联积分流水"/>
          </template>
          <el-table-column prop="type" label="类型" min-width="140"/>
          <el-table-column label="变动" width="95">
            <template #default="{ row }">{{ row.direction === 'CREDIT' ? '+' : '-' }}{{ row.amount }}</template>
          </el-table-column>
          <el-table-column prop="balanceAfter" label="余额" width="85"/>
          <el-table-column label="时间" width="165">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="grid2" style="margin-top: 16px">
      <div class="panel"><h3>退款申请</h3>
        <el-table :data="detail.refunds" size="small">
          <template #empty>
            <EmptyState description="暂无退款申请"/>
          </template>
          <el-table-column prop="id" label="退款 ID" min-width="170"/>
          <el-table-column label="金额" width="100">
            <template #default="{ row }">{{ formatMoney(row.amountMinor, detail.order.currency) }}</template>
          </el-table-column>
          <el-table-column prop="reclaimCredits" label="回收积分" width="95"/>
          <el-table-column label="状态" width="115">
            <template #default="{ row }">
              <StatusTag :label="refundLabel(row.status)" :type="refundType(row.status)"/>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="panel"><h3>操作审计</h3>
        <el-timeline>
          <el-timeline-item v-for="audit in detail.auditLogs" :key="audit.id" :timestamp="formatDate(audit.createdAt)"
                            :type="audit.result === 'FAILED' ? 'danger' : 'info'">{{ audit.operatorName }} ·
            {{ audit.action }}
            <div v-if="audit.reason" class="subtle">{{ audit.reason }}</div>
          </el-timeline-item>
        </el-timeline>
        <EmptyState v-if="detail.auditLogs.length === 0" description="暂无关联审计"/>
      </div>
    </div>

    <el-dialog v-model="refundDialogVisible" title="发起退款申请" width="520px" :close-on-click-modal="false">
      <el-alert title="退款申请必须关联该订单的工单；审批通过后才会调用渠道并回收积分。" type="info" :closable="false"
                style="margin-bottom: 16px"/>
      <el-form label-width="108px">
        <el-form-item label="退款金额（元）" required>
          <el-input-number v-model="refundForm.amountYuan" :min="0.01" :max="detail.order.amountMinor / 100"
                           :precision="2" style="width: 100%"/>
        </el-form-item>
        <el-form-item label="回收积分" required>
          <el-input-number v-model="refundForm.reclaimCredits" :min="0" :max="detail.order.planSnapshot.grantedCredits"
                           :precision="0" style="width: 100%"/>
        </el-form-item>
        <el-form-item label="原因码" required>
          <el-select v-model="refundForm.reasonCode" style="width: 100%">
            <el-option label="服务未使用" value="SERVICE_NOT_USED"/>
            <el-option label="重复支付" value="DUPLICATE_PAYMENT"/>
            <el-option label="渠道异常（模拟失败）" value="CHANNEL_FAILURE_DEMO"/>
          </el-select>
        </el-form-item>
        <el-form-item label="退款原因" required>
          <el-input v-model="refundForm.reason" type="textarea" :rows="3" maxlength="300" show-word-limit/>
        </el-form-item>
        <el-form-item label="关联工单" required>
          <el-select v-model="refundForm.ticketId" placeholder="选择当前订单工单" style="width: 100%">
            <el-option v-for="ticket in orderTickets" :key="ticket.id" :value="ticket.id"
                       :label="`${ticket.id} · ${ticket.title}`"/>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="refundSubmitting" @click="submitRefund">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {ElMessageBox} from 'element-plus/es/components/message-box/index.mjs'
import {createRefund, getOrder, regrantEntitlement} from '@/api/billing'
import {getTickets} from '@/api/tickets'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {useAuthStore} from '@/stores/auth'
import type {Order, OrderDetail, PaymentEvent, RefundRequest, SupportTicket} from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const detail = ref<OrderDetail>()
const tickets = ref<SupportTicket[]>([])
const loading = ref(false)
const error = ref<string>()
const refundDialogVisible = ref(false)
const refundSubmitting = ref(false)
const refundForm = reactive({
  amountYuan: 0,
  reclaimCredits: 0,
  reasonCode: 'SERVICE_NOT_USED',
  reason: '',
  ticketId: ''
})

const canRequestRefund = computed(() => detail.value && ['PAID', 'PARTIALLY_REFUNDED'].includes(detail.value.order.paymentStatus))
const orderTickets = computed(() => detail.value ? tickets.value.filter((ticket) => ticket.orderId === detail.value?.order.id) : [])

function orderId(): string | undefined {
  return typeof route.params.id === 'string' ? route.params.id : undefined
}

function formatMoney(amountMinor: number, currency: 'CNY' | 'USD'): string {
  return new Intl.NumberFormat('zh-CN', {style: 'currency', currency}).format(amountMinor / 100)
}

function formatDate(value?: string): string {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
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

function eventLabel(value: PaymentEvent['type']): string {
  return {
    PAYMENT_CREATED: '支付单创建',
    CALLBACK_RECEIVED: '接收支付回调',
    PAYMENT_CONFIRMED: '支付确认',
    ENTITLEMENT_GRANTED: '权益发放成功',
    ENTITLEMENT_FAILED: '权益发放失败',
    REFUND_REQUESTED: '退款申请已创建',
    REFUND_SUCCEEDED: '退款执行成功',
    REFUND_FAILED: '退款执行失败'
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

async function load(): Promise<void> {
  const id = orderId()
  if (!id) {
    error.value = '订单 ID 不正确';
    return
  }
  loading.value = true
  error.value = undefined
  try {
    detail.value = (await getOrder(id)).data
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : '加载订单详情失败'
  } finally {
    loading.value = false
  }
}

async function loadTickets(): Promise<void> {
  tickets.value = (await getTickets({page: 1, pageSize: 100})).data.items
}

async function regrant(): Promise<void> {
  const result = await ElMessageBox.confirm('将根据支付成功事件幂等补发套餐权益；重复操作不会再次增加积分。确认继续？', '确认重新发放权益', {type: 'warning'})
  if (result !== 'confirm') return
  const id = orderId()
  if (!id) return
  const granted = (await regrantEntitlement(id)).data
  ElMessage.success(granted.alreadyGranted ? '权益已发放，本次操作命中幂等记录' : '权益已重新发放，已写入积分流水')
  await load()
}

function openRefundDialog(): void {
  if (!detail.value) return
  refundForm.amountYuan = detail.value.order.amountMinor / 100
  refundForm.reclaimCredits = detail.value.order.planSnapshot.grantedCredits
  refundForm.reasonCode = 'SERVICE_NOT_USED'
  refundForm.reason = ''
  refundForm.ticketId = orderTickets.value[0]?.id || ''
  refundDialogVisible.value = true
}

async function submitRefund(): Promise<void> {
  if (!detail.value || !refundForm.reason.trim() || !refundForm.ticketId) {
    ElMessage.warning('请填写退款原因并关联当前订单工单');
    return
  }
  refundSubmitting.value = true
  try {
    await createRefund({
      orderId: detail.value.order.id,
      amountMinor: Math.round(refundForm.amountYuan * 100),
      reclaimCredits: refundForm.reclaimCredits,
      reasonCode: refundForm.reasonCode,
      reason: refundForm.reason.trim(),
      ticketId: refundForm.ticketId
    })
    ElMessage.success('退款申请已创建，等待审批')
    refundDialogVisible.value = false
    await load()
  } finally {
    refundSubmitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([load(), loadTickets()])
})
</script>

<style scoped>
.actions {
  margin-top: 16px;
}

.subtle {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
</style>
