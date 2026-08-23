<template>
  <PageHeader :title="ticket ? `工单 ${ticket.id}` : '工单详情'" description="查看关联对象、处理状态与结论">
    <template #actions>
      <el-button @click="router.push('/tickets')">返回工单列表</el-button>
    </template>
  </PageHeader>
  <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
  <div v-if="ticket" class="panel" v-loading="loading">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="工单号">{{ ticket.id }}</el-descriptions-item>
      <el-descriptions-item label="用户">
        <el-button link type="primary"
                   @click="router.push({name: 'customer-user-detail', params: {id: ticket.userId}})">{{ ticket.userId }}
        </el-button>
      </el-descriptions-item>
      <el-descriptions-item label="分类">{{ ticket.category }}</el-descriptions-item>
      <el-descriptions-item label="优先级">{{ ticket.priority }}</el-descriptions-item>
      <el-descriptions-item label="关联工作流">{{ ticket.workflowId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="关联任务">{{ ticket.jobId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="关联订单">{{ ticket.orderId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ formatDate(ticket.createdAt) }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ formatDate(ticket.updatedAt) }}</el-descriptions-item>
      <el-descriptions-item label="问题描述" :span="2">{{ ticket.description }}</el-descriptions-item>
      <el-descriptions-item label="处理结论" :span="2">{{ ticket.resolution || '尚未填写' }}</el-descriptions-item>
    </el-descriptions>
    <el-divider/>
    <el-form label-width="96px" style="max-width: 640px">
      <el-form-item label="处理状态">
        <el-select v-model="form.status">
          <el-option label="待处理" value="OPEN"/>
          <el-option label="处理中" value="PROCESSING"/>
          <el-option label="等待用户" value="WAITING_USER"/>
          <el-option label="已解决" value="RESOLVED"/>
          <el-option label="已关闭" value="CLOSED"/>
        </el-select>
      </el-form-item>
      <el-form-item label="处理结论" :required="form.status === 'CLOSED'">
        <el-input v-model="form.resolution" type="textarea" :rows="4" placeholder="关闭工单前必须填写"/>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="save">保存处理结果</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import {onMounted, reactive, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {ElMessageBox} from 'element-plus/es/components/message-box/index.mjs'
import {getTicket, updateTicket} from '@/api/tickets'
import PageHeader from '@/components/common/PageHeader.vue'
import type {SupportTicket} from '@/types'

const route = useRoute()
const router = useRouter()
const ticket = ref<SupportTicket>()
const loading = ref(false)
const error = ref<string>()
const form = reactive<{ status: SupportTicket['status']; resolution: string }>({status: 'OPEN', resolution: ''})

function ticketId(): string | undefined {
  return typeof route.params.id === 'string' ? route.params.id : undefined
}

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 19)
}

async function load(): Promise<void> {
  const id = ticketId()
  if (!id) {
    error.value = '工单 ID 不正确'
    return
  }
  loading.value = true
  error.value = undefined
  try {
    ticket.value = (await getTicket(id)).data
    form.status = ticket.value.status
    form.resolution = ticket.value.resolution || ''
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : '加载工单失败'
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!ticket.value) return
  if (form.status === 'CLOSED' && !form.resolution.trim()) {
    ElMessage.warning('关闭工单前必须填写处理结论')
    return
  }
  await ElMessageBox.confirm('确认保存工单状态和处理结论？', '确认工单更新')
  await updateTicket(ticket.value.id, {status: form.status, resolution: form.resolution.trim() || undefined})
  ElMessage.success('工单已更新')
  await load()
}

onMounted(() => void load())
</script>
