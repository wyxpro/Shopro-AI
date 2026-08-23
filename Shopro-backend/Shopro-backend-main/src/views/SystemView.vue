<template>
  <PageHeader title="系统治理" description="查看服务健康、可追溯审计、敏感操作审批和内置角色权限。">
    <template #actions>
      <el-button v-if="isDemoMode && auth.hasPermission('system:demo:reset')" type="danger" plain @click="reset">
        恢复演示数据
      </el-button>
    </template>
  </PageHeader>
  <el-tabs v-model="tab" @tab-change="onTabChange">
    <el-tab-pane label="服务健康" name="health">
      <div class="cards">
        <div v-for="item in health" :key="item.id" class="card"><span class="kpi-label">{{
            item.provider
          }} · {{ item.capability }}</span>
          <div class="kpi-value" style="font-size: 20px">
            <StatusTag :label="healthLabel(item.status)" :type="healthType(item.status)"/>
          </div>
          <span class="muted">延迟 {{ item.latencyMs }}ms · 影响 {{ item.affectedJobs }} 个任务 / {{
              item.affectedUsers
            }} 位用户</span></div>
      </div>
    </el-tab-pane>
    <el-tab-pane label="审计日志" name="audits">
      <div class="panel">
        <div class="toolbar filters">
          <el-input v-model="auditQuery.keyword" clearable placeholder="对象、动作、操作人或 trace ID"
                    style="width: 220px" @keyup.enter="loadAudits"/>
          <el-input v-model="auditQuery.targetType" clearable placeholder="对象类型" style="width: 130px"
                    @keyup.enter="loadAudits"/>
          <el-input v-model="auditQuery.action" clearable placeholder="动作关键字" style="width: 130px"
                    @keyup.enter="loadAudits"/>
          <el-input v-model="auditQuery.operatorId" clearable placeholder="操作人 ID" style="width: 130px"
                    @keyup.enter="loadAudits"/>
          <el-select v-model="auditQuery.result" clearable placeholder="结果" style="width: 110px" @change="loadAudits">
            <el-option label="成功" value="SUCCESS"/>
            <el-option label="失败" value="FAILED"/>
          </el-select>
          <el-date-picker v-model="auditDates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期"
                          end-placeholder="结束日期" @change="applyAuditDates"/>
          <el-button @click="resetAuditFilters">重置</el-button>
        </div>
        <el-alert v-if="auditError" :title="auditError" type="error" show-icon :closable="false"
                  style="margin-bottom: 16px"/>
        <el-table :data="auditRows" v-loading="auditLoading" style="cursor: pointer" @row-click="openAudit">
          <template #empty>
            <EmptyState description="没有符合条件的审计记录"/>
          </template>
          <el-table-column label="时间" width="175">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="operatorName" label="操作人" width="130"/>
          <el-table-column prop="targetType" label="对象" width="145"/>
          <el-table-column prop="action" label="动作" min-width="220"/>
          <el-table-column label="结果" width="90">
            <template #default="{ row }">
              <StatusTag :label="row.result === 'SUCCESS' ? '成功' : '失败'"
                         :type="row.result === 'SUCCESS' ? 'success' : 'danger'"/>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination v-model:current-page="auditQuery.page" :page-size="auditQuery.pageSize"
                       layout="total,prev,pager,next" :total="auditTotal" @current-change="loadAudits"/>
      </div>
    </el-tab-pane>
    <el-tab-pane v-if="auth.hasPermission('system:approvals:view')" label="审批队列" name="approvals">
      <div class="panel">
        <el-table :data="approvals" v-loading="approvalsLoading">
          <template #empty>
            <EmptyState description="当前没有待处理审批"/>
          </template>
          <el-table-column prop="id" label="审批 ID" min-width="210"/>
          <el-table-column prop="type" label="类型" width="160"/>
          <el-table-column prop="targetType" label="对象类型" width="140"/>
          <el-table-column prop="targetId" label="对象 ID" min-width="180"/>
          <el-table-column prop="reason" label="原因" min-width="180"/>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <StatusTag label="待处理" type="warning"/>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-tab-pane>
    <el-tab-pane label="管理员与角色" name="roles">
      <div class="grid2">
        <div class="panel"><h3>管理员</h3>
          <el-table :data="admins" size="small">
            <el-table-column prop="name" label="姓名"/>
            <el-table-column prop="email" label="邮箱" min-width="180"/>
            <el-table-column label="角色" min-width="130">
              <template #default="{ row }">{{ row.roleIds.join('、') }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90"/>
          </el-table>
        </div>
        <div class="panel"><h3>内置角色</h3>
          <el-table :data="roles" size="small">
            <el-table-column prop="name" label="角色" width="130"/>
            <el-table-column prop="description" label="说明" min-width="170"/>
            <el-table-column label="权限" min-width="180">
              <template #default="{ row }">{{ row.permissions.join('、') }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-tab-pane>
  </el-tabs>

  <el-drawer v-model="auditDrawerVisible" title="审计详情" size="520px">
    <template v-if="selectedAudit">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="对象">{{ selectedAudit.targetType }} · {{
            selectedAudit.targetId
          }}
        </el-descriptions-item>
        <el-descriptions-item label="动作">{{ selectedAudit.action }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{ selectedAudit.operatorName }}（{{
            selectedAudit.operatorId
          }}）
        </el-descriptions-item>
        <el-descriptions-item label="结果">{{ selectedAudit.result }}</el-descriptions-item>
        <el-descriptions-item label="原因">{{ selectedAudit.reason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工单">{{ selectedAudit.ticketId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Trace ID">{{ selectedAudit.traceId }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ formatDate(selectedAudit.createdAt) }}</el-descriptions-item>
      </el-descriptions>
      <h4>变更前</h4>
      <pre>{{ formatJson(selectedAudit.before) }}</pre>
      <h4>变更后</h4>
      <pre>{{ formatJson(selectedAudit.after) }}</pre>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {ElMessageBox} from 'element-plus/es/components/message-box/index.mjs'
import {getAdmins, getApprovals, getAuditLogs, getRoles, getSystemHealth, resetDemoData} from '@/api/system'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {usePagedQuery} from '@/composables/usePagedQuery'
import {useAuthStore} from '@/stores/auth'
import type {ApprovalRequest, AuditLog, AuditLogQuery, RoleDefinition, ServiceHealth, SystemAdmin} from '@/types'

const auth = useAuthStore()
const route = useRoute()
const tab = ref(typeof route.query.tab === 'string' && ['health', 'audits', 'approvals', 'roles'].includes(route.query.tab) ? route.query.tab : 'health')
const health = ref<ServiceHealth[]>([])
const admins = ref<SystemAdmin[]>([])
const roles = ref<RoleDefinition[]>([])
const approvals = ref<ApprovalRequest[]>([])
const approvalsLoading = ref(false)
const auditQuery = ref<AuditLogQuery>({page: 1, pageSize: 10})
const auditDates = ref<string[]>()
const {
  rows: auditRows,
  total: auditTotal,
  loading: auditLoading,
  error: auditError,
  load: loadAudits
} = usePagedQuery(auditQuery, getAuditLogs)
const auditDrawerVisible = ref(false)
const selectedAudit = ref<AuditLog>()
const isDemoMode = (import.meta.env.VITE_APP_MODE || 'demo') === 'demo'

function healthLabel(value: ServiceHealth['status']): string {
  return {HEALTHY: '运行正常', DEGRADED: '服务降级', OUTAGE: '服务中断'}[value]
}

function healthType(value: ServiceHealth['status']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'HEALTHY' ? 'success' : value === 'DEGRADED' ? 'warning' : 'danger'
}

function formatDate(value?: string): string {
  return value ? value.replace('T', ' ').slice(0, 19) : '-'
}

function formatJson(value: Record<string, unknown> | undefined): string {
  return value ? JSON.stringify(value, null, 2) : '-'
}

async function loadHealth(): Promise<void> {
  health.value = (await getSystemHealth()).data
}

async function loadRoles(): Promise<void> {
  const [adminResult, roleResult] = await Promise.all([getAdmins(), getRoles()]);
  admins.value = adminResult.data;
  roles.value = roleResult.data
}

async function loadApprovals(): Promise<void> {
  approvalsLoading.value = true;
  try {
    approvals.value = (await getApprovals({page: 1, pageSize: 100, status: 'PENDING'})).data.items
  } finally {
    approvalsLoading.value = false
  }
}

function applyAuditDates(value?: string[]): void {
  auditQuery.value.startAt = value?.[0];
  auditQuery.value.endAt = value?.[1];
  auditQuery.value.page = 1;
  void loadAudits()
}

function resetAuditFilters(): void {
  auditQuery.value = {page: 1, pageSize: 10};
  auditDates.value = undefined;
  void loadAudits()
}

function openAudit(row: AuditLog): void {
  selectedAudit.value = row;
  auditDrawerVisible.value = true
}

async function onTabChange(name: string | number): Promise<void> {
  if (name === 'audits') await loadAudits();
  if (name === 'approvals') await loadApprovals();
  if (name === 'roles') await loadRoles()
}

async function reset(): Promise<void> {
  await ElMessageBox.confirm('将清空所有演示操作并恢复初始数据，确定继续？', '恢复演示数据', {type: 'warning'});
  await resetDemoData();
  ElMessage.success('演示数据已恢复');
  await Promise.all([loadHealth(), loadAudits(), loadApprovals()])
}

onMounted(async () => {
  await Promise.all([loadHealth(), loadAudits(), loadRoles()]);
  if (auth.hasPermission('system:approvals:view')) await loadApprovals()
})
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #f7f8fa;
  padding: 12px;
  border-radius: 6px;
}
</style>
