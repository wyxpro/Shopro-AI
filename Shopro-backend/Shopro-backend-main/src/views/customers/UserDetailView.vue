<template>
  <PageHeader :title="detail ? `${detail.user.name} 的客户全景` : '客户全景'"
              description="客户、订单、AI 履约、风险与人工操作的关联记录">
    <template #actions>
      <el-button @click="router.push('/users')">返回客户列表</el-button>
      <el-button :disabled="!detail" @click="ticketDialogVisible = true">创建工单</el-button>
      <el-button v-if="auth.hasPermission('customers:operate')" :disabled="!detail"
                 @click="capabilityDialogVisible = true">调整能力
      </el-button>
      <el-button v-if="auth.hasPermission('customers:operate')" type="primary" :disabled="!detail"
                 @click="creditDialogVisible = true">积分调整
      </el-button>
    </template>
  </PageHeader>
  <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
  <div v-loading="loading">
    <template v-if="detail">
      <div class="panel">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="用户 ID">{{ detail.user.id }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detail.user.email }}</el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <StatusTag :label="riskLabel(detail.user.riskLevel)" :type="riskType(detail.user.riskLevel)"/>
          </el-descriptions-item>
          <el-descriptions-item label="所属企业">{{ detail.organization?.name || '个人用户' }}</el-descriptions-item>
          <el-descriptions-item label="当前套餐">{{ detail.user.planName }}</el-descriptions-item>
          <el-descriptions-item label="套餐到期">{{ formatDate(detail.user.planExpiresAt) }}</el-descriptions-item>
          <el-descriptions-item label="积分余额"><strong>{{ detail.user.creditBalance }}</strong></el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(detail.user.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="最近活跃">{{ formatDate(detail.user.lastActiveAt) }}</el-descriptions-item>
        </el-descriptions>
        <div class="capability-row">
          <span>登录：<StatusTag :label="detail.user.capabilities.login === 'ENABLED' ? '已启用' : '已限制'"
                                :type="detail.user.capabilities.login === 'ENABLED' ? 'success' : 'danger'"/></span>
          <span>生成：<StatusTag :label="detail.user.capabilities.generation === 'ENABLED' ? '已启用' : '已限制'"
                                :type="detail.user.capabilities.generation === 'ENABLED' ? 'success' : 'danger'"/></span>
          <span>发布：<StatusTag :label="detail.user.capabilities.publishing === 'ENABLED' ? '已启用' : '已限制'"
                                :type="detail.user.capabilities.publishing === 'ENABLED' ? 'success' : 'danger'"/></span>
          <span>API：<StatusTag :label="detail.user.capabilities.api === 'ENABLED' ? '已启用' : '已限制'"
                               :type="detail.user.capabilities.api === 'ENABLED' ? 'success' : 'danger'"/></span>
        </div>
        <div v-if="detail.capabilityRestrictions.length" class="restriction-history">
          <strong>最近能力调整：</strong>{{
            detail.capabilityRestrictions[0].reason
          }}（{{
            formatDate(detail.capabilityRestrictions[0].createdAt)
          }}，{{ detail.capabilityRestrictions[0].notifyUser ? '已通知用户' : '未通知用户' }}）
        </div>
      </div>

      <el-tabs style="margin-top: 16px">
        <el-tab-pane label="积分流水">
          <div class="panel table-card">
            <div class="section-actions"><strong>最近积分流水</strong>
              <el-button link type="primary" @click="router.push(`/customers/users/${detail.user.id}/credits`)">
                查看全部
              </el-button>
            </div>
            <el-table :data="detail.creditLedger.slice(0, 5)">
              <template #empty>
                <EmptyState description="尚无积分流水"/>
              </template>
              <el-table-column prop="createdAt" label="时间" width="170">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column label="变动" width="100">
                <template #default="{ row }"><span
                    :class="row.direction === 'CREDIT' ? 'credit-increase' : 'credit-decrease'">{{
                    row.direction === 'CREDIT' ? '+' : '-'
                  }}{{ row.amount }}</span></template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="170"/>
              <el-table-column prop="reason" label="原因" min-width="220"/>
              <el-table-column label="余额" width="100">
                <template #default="{ row }">{{ row.balanceAfter }}</template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        <el-tab-pane label="订单与退款">
          <div class="panel table-card">
            <el-table :data="detail.orders">
              <template #empty>
                <EmptyState description="尚无历史订单"/>
              </template>
              <el-table-column prop="id" label="订单号" min-width="180"/>
              <el-table-column label="套餐" min-width="120">
                <template #default="{ row }">{{ row.planSnapshot.name }}</template>
              </el-table-column>
              <el-table-column label="金额" width="100">
                <template #default="{ row }">¥{{ (row.amountMinor / 100).toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="paymentStatus" label="支付状态" width="150"/>
              <el-table-column prop="entitlementStatus" label="权益状态" width="150"/>
            </el-table>
          </div>
        </el-tab-pane>
        <el-tab-pane label="AI 工作流">
          <div class="panel table-card">
            <el-table :data="detail.workflows">
              <template #empty>
                <EmptyState description="尚无 AI 工作流"/>
              </template>
              <el-table-column prop="id" label="工作流 ID" width="120"/>
              <el-table-column prop="productName" label="商品" min-width="150"/>
              <el-table-column prop="status" label="状态" width="150"/>
              <el-table-column prop="progress" label="进度" width="100">
                <template #default="{ row }">{{ row.progress }}%</template>
              </el-table-column>
              <el-table-column prop="totalCredits" label="消耗积分" width="110"/>
            </el-table>
            <p v-if="detail.failedJobs.length" class="muted">
              失败任务：{{ detail.failedJobs.map((job) => job.name).join('、') }}</p>
          </div>
        </el-tab-pane>
        <el-tab-pane label="风险记录">
          <div class="panel table-card">
            <el-table :data="detail.riskEvents">
              <template #empty>
                <EmptyState description="暂无内容风险记录"/>
              </template>
              <el-table-column prop="id" label="风险事件" width="160"/>
              <el-table-column prop="riskType" label="类型"/>
              <el-table-column prop="severity" label="等级"/>
              <el-table-column prop="status" label="状态"/>
            </el-table>
          </div>
        </el-tab-pane>
        <el-tab-pane label="工单与操作">
          <div class="panel table-card">
            <div class="section-actions"><strong>关联工单</strong>
              <el-button link type="primary" @click="router.push('/tickets')">工单列表</el-button>
            </div>
            <el-table :data="detail.tickets" @row-click="openTicket" style="cursor: pointer">
              <template #empty>
                <EmptyState description="暂无关联工单"/>
              </template>
              <el-table-column prop="id" label="工单号" width="170"/>
              <el-table-column prop="title" label="标题" min-width="180"/>
              <el-table-column prop="category" label="分类" width="130"/>
              <el-table-column prop="status" label="状态" width="130"/>
              <el-table-column prop="updatedAt" label="更新时间" width="170">
                <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
              </el-table-column>
            </el-table>
            <div class="audit-summary">
              <strong>最近后台操作</strong>
              <ul>
                <li v-for="item in detail.auditLogs.slice(0, 5)" :key="item.id">{{ formatDate(item.createdAt) }} ·
                  {{ item.operatorName }} · {{ item.action }}
                </li>
              </ul>
              <EmptyState v-if="detail.auditLogs.length === 0" description="暂无后台操作记录"/>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>

  <CreditAdjustmentDialog v-if="detail" v-model="creditDialogVisible" :user-id="detail.user.id"
                          @submitted="reloadAfterChange"/>

  <el-dialog v-model="capabilityDialogVisible" title="调整用户能力" width="560px">
    <el-form label-width="106px">
      <el-form-item label="登录能力">
        <el-select v-model="capabilityForm.login">
          <el-option label="启用" value="ENABLED"/>
          <el-option label="限制" value="DISABLED"/>
        </el-select>
      </el-form-item>
      <el-form-item label="生成能力">
        <el-select v-model="capabilityForm.generation">
          <el-option label="启用" value="ENABLED"/>
          <el-option label="限制" value="DISABLED"/>
        </el-select>
      </el-form-item>
      <el-form-item label="发布能力">
        <el-select v-model="capabilityForm.publishing">
          <el-option label="启用" value="ENABLED"/>
          <el-option label="限制" value="DISABLED"/>
        </el-select>
      </el-form-item>
      <el-form-item label="API 能力">
        <el-select v-model="capabilityForm.api">
          <el-option label="启用" value="ENABLED"/>
          <el-option label="限制" value="DISABLED"/>
        </el-select>
      </el-form-item>
      <el-form-item label="原因码" required>
        <el-select v-model="capabilityForm.reasonCode">
          <el-option label="风险处置" value="RISK"/>
          <el-option label="滥用处置" value="ABUSE"/>
          <el-option label="支付异常" value="PAYMENT"/>
          <el-option label="用户请求" value="USER_REQUEST"/>
          <el-option label="人工修正" value="MANUAL_CORRECTION"/>
        </el-select>
      </el-form-item>
      <el-form-item label="详细原因" required>
        <el-input v-model="capabilityForm.reason" type="textarea" :rows="3"/>
      </el-form-item>
      <el-form-item label="有效期">
        <el-date-picker v-model="capabilityForm.effectiveUntil" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss[Z]"
                        clearable/>
      </el-form-item>
      <el-form-item label="关联工单">
        <el-input v-model="capabilityForm.ticketId"/>
      </el-form-item>
      <el-form-item label="通知用户">
        <el-switch v-model="capabilityForm.notifyUser"/>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="capabilityDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submitCapabilities">确认变更</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="ticketDialogVisible" title="创建客户工单" width="560px">
    <el-form label-width="96px">
      <el-form-item label="工单标题" required>
        <el-input v-model="ticketForm.title"/>
      </el-form-item>
      <el-form-item label="分类" required>
        <el-select v-model="ticketForm.category">
          <el-option label="任务失败" value="JOB_FAILURE"/>
          <el-option label="计费问题" value="BILLING"/>
          <el-option label="内容风险" value="CONTENT_RISK"/>
          <el-option label="账号问题" value="ACCOUNT"/>
          <el-option label="发布问题" value="PUBLISHING"/>
          <el-option label="其他" value="OTHER"/>
        </el-select>
      </el-form-item>
      <el-form-item label="优先级" required>
        <el-select v-model="ticketForm.priority">
          <el-option label="低" value="LOW"/>
          <el-option label="中" value="MEDIUM"/>
          <el-option label="高" value="HIGH"/>
          <el-option label="紧急" value="URGENT"/>
        </el-select>
      </el-form-item>
      <el-form-item label="关联工作流">
        <el-select v-model="ticketForm.workflowId" clearable filterable>
          <el-option v-for="workflow in detail?.workflows" :key="workflow.id"
                     :label="`${workflow.id} · ${workflow.productName}`" :value="workflow.id"/>
        </el-select>
      </el-form-item>
      <el-form-item label="关联失败任务">
        <el-select v-model="ticketForm.jobId" clearable filterable>
          <el-option v-for="job in detail?.failedJobs" :key="job.id" :label="`${job.id} · ${job.name}`"
                     :value="job.id"/>
        </el-select>
      </el-form-item>
      <el-form-item label="关联订单">
        <el-select v-model="ticketForm.orderId" clearable filterable>
          <el-option v-for="order in detail?.orders" :key="order.id" :label="order.id" :value="order.id"/>
        </el-select>
      </el-form-item>
      <el-form-item label="问题描述" required>
        <el-input v-model="ticketForm.description" type="textarea" :rows="4"/>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="ticketDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submitTicket">创建工单</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {onMounted, reactive, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {ElMessageBox} from 'element-plus/es/components/message-box/index.mjs'
import {getCustomerUser, updateUserCapabilities} from '@/api/customers'
import {createTicket} from '@/api/tickets'
import CreditAdjustmentDialog from '@/components/business/CreditAdjustmentDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import {useAuthStore} from '@/stores/auth'
import StatusTag from '@/components/common/StatusTag.vue'
import type {
  CreateSupportTicketRequest,
  CustomerUser,
  CustomerUserDetail,
  SupportTicket,
  UpdateUserCapabilitiesRequest,
  UserCapabilities
} from '@/types'

interface CapabilityForm extends UserCapabilities {
  reasonCode: UpdateUserCapabilitiesRequest['reasonCode']
  reason: string
  effectiveUntil: string
  ticketId: string
  notifyUser: boolean
}

interface TicketForm {
  title: string
  category: CreateSupportTicketRequest['category']
  priority: CreateSupportTicketRequest['priority']
  workflowId: string
  jobId: string
  orderId: string
  description: string
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const detail = ref<CustomerUserDetail>()
const loading = ref(false)
const error = ref<string>()
const creditDialogVisible = ref(false)
const capabilityDialogVisible = ref(false)
const ticketDialogVisible = ref(false)
const capabilityForm = reactive<CapabilityForm>({
  login: 'ENABLED', generation: 'ENABLED', publishing: 'ENABLED', api: 'DISABLED',
  reasonCode: 'MANUAL_CORRECTION', reason: '', effectiveUntil: '', ticketId: '', notifyUser: true,
})
const ticketForm = reactive<TicketForm>({
  title: '',
  category: 'JOB_FAILURE',
  priority: 'MEDIUM',
  workflowId: '',
  jobId: '',
  orderId: '',
  description: ''
})

function userId(): string | undefined {
  return typeof route.params.id === 'string' ? route.params.id : undefined
}

function formatDate(value?: string): string {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}

function riskLabel(level: CustomerUser['riskLevel']): string {
  return {LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险'}[level]
}

function riskType(level: CustomerUser['riskLevel']): 'success' | 'warning' | 'danger' {
  if (level === 'LOW') return 'success'
  if (level === 'MEDIUM') return 'warning'
  return 'danger'
}

function resetCapabilityForm(): void {
  if (!detail.value) return
  Object.assign(capabilityForm, detail.value.user.capabilities, {
    reasonCode: 'MANUAL_CORRECTION', reason: '', effectiveUntil: '', ticketId: '', notifyUser: true,
  })
}

function resetTicketForm(): void {
  Object.assign(ticketForm, {
    title: '',
    category: 'JOB_FAILURE',
    priority: 'MEDIUM',
    workflowId: '',
    jobId: '',
    orderId: '',
    description: ''
  })
}

async function load(): Promise<void> {
  const id = userId()
  if (!id) {
    error.value = '用户 ID 不正确'
    return
  }
  loading.value = true
  error.value = undefined
  try {
    detail.value = (await getCustomerUser(id)).data
    resetCapabilityForm()
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : '加载用户详情失败'
  } finally {
    loading.value = false
  }
}

async function reloadAfterChange(): Promise<void> {
  await load()
}

async function submitCapabilities(): Promise<void> {
  if (!detail.value || !capabilityForm.reason.trim()) {
    ElMessage.warning('请填写能力调整原因')
    return
  }
  const capabilities: Partial<UserCapabilities> = {}
  const keys: Array<keyof UserCapabilities> = ['login', 'generation', 'publishing', 'api']
  for (const key of keys) {
    if (capabilityForm[key] !== detail.value.user.capabilities[key]) capabilities[key] = capabilityForm[key]
  }
  if (Object.keys(capabilities).length === 0) {
    ElMessage.warning('请至少调整一项能力状态')
    return
  }
  await ElMessageBox.confirm('该操作会记录原因、有效期、通知选项和审计日志。确认变更？', '确认能力调整', {type: 'warning'})
  await updateUserCapabilities(detail.value.user.id, {
    capabilities,
    reasonCode: capabilityForm.reasonCode,
    reason: capabilityForm.reason.trim(),
    effectiveUntil: capabilityForm.effectiveUntil || undefined,
    ticketId: capabilityForm.ticketId.trim() || undefined,
    notifyUser: capabilityForm.notifyUser,
  })
  capabilityDialogVisible.value = false
  ElMessage.success('用户能力已更新')
  await load()
}

async function submitTicket(): Promise<void> {
  if (!detail.value || !ticketForm.title.trim() || !ticketForm.description.trim()) {
    ElMessage.warning('请填写工单标题和问题描述')
    return
  }
  const ticket = await createTicket({
    title: ticketForm.title.trim(),
    category: ticketForm.category,
    priority: ticketForm.priority,
    userId: detail.value.user.id,
    organizationId: detail.value.user.organizationId,
    workflowId: ticketForm.workflowId || undefined,
    jobId: ticketForm.jobId || undefined,
    orderId: ticketForm.orderId || undefined,
    description: ticketForm.description.trim(),
  })
  ticketDialogVisible.value = false
  resetTicketForm()
  ElMessage.success('工单已创建')
  await load()
  void router.push({name: 'ticket-detail', params: {id: ticket.data.id}})
}

function openTicket(ticket: SupportTicket): void {
  void router.push({name: 'ticket-detail', params: {id: ticket.id}})
}

onMounted(() => void load())
</script>
