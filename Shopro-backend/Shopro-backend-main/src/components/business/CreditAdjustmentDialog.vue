<template>
  <el-dialog :model-value="modelValue" title="创建积分调整" width="520px"
             @update:model-value="emit('update:modelValue', $event)">
    <el-form label-width="96px">
      <el-form-item label="调整方向" required>
        <el-radio-group v-model="form.direction">
          <el-radio value="CREDIT">增加积分</el-radio>
          <el-radio value="DEBIT">扣减积分</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="积分数量" required>
        <el-input-number v-model="form.amount" :min="1" :precision="0" style="width: 100%"/>
      </el-form-item>
      <el-form-item label="原因码" required>
        <el-select v-model="form.reasonCode" style="width: 100%">
          <el-option label="系统事故补偿" value="SYSTEM_INCIDENT"/>
          <el-option label="客户投诉补偿" value="CUSTOMER_COMPLAINT"/>
          <el-option label="人工修正" value="MANUAL_CORRECTION"/>
          <el-option label="风险处罚" value="RISK_PENALTY"/>
        </el-select>
      </el-form-item>
      <el-form-item label="详细原因" required>
        <el-input v-model="form.reason" type="textarea" :rows="3" maxlength="200" show-word-limit/>
      </el-form-item>
      <el-form-item label="关联工单" :required="form.reasonCode === 'CUSTOMER_COMPLAINT'">
        <el-input v-model="form.ticketId" placeholder="客户投诉补偿必须填写工单号"/>
      </el-form-item>
    </el-form>
    <p class="muted">单次调整达到 1000 积分时，会进入审批队列，不会立即修改余额。</p>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确认并记录</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {reactive, ref, watch} from 'vue'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import {ElMessageBox} from 'element-plus/es/components/message-box/index.mjs'
import {createCreditAdjustment} from '@/api/credits'
import type {CreateCreditAdjustmentRequest, CreditAdjustmentResult} from '@/types'

interface AdjustmentForm {
  direction: CreateCreditAdjustmentRequest['direction']
  amount?: number
  reasonCode: CreateCreditAdjustmentRequest['reasonCode']
  reason: string
  ticketId: string
}

const props = defineProps<{
  modelValue: boolean
  userId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submitted: [result: CreditAdjustmentResult]
}>()

const form = reactive<AdjustmentForm>({
  direction: 'CREDIT',
  amount: undefined,
  reasonCode: 'CUSTOMER_COMPLAINT',
  reason: '',
  ticketId: '',
})
const submitting = ref(false)

function resetForm(): void {
  form.direction = 'CREDIT'
  form.amount = undefined
  form.reasonCode = 'CUSTOMER_COMPLAINT'
  form.reason = ''
  form.ticketId = ''
}

watch(() => props.modelValue, (visible) => {
  if (visible) resetForm()
})

async function submit(): Promise<void> {
  if (!form.amount || !Number.isInteger(form.amount) || form.amount <= 0) {
    ElMessage.warning('积分数量必须为正整数')
    return
  }
  if (!form.reason.trim()) {
    ElMessage.warning('请填写详细原因')
    return
  }
  if (form.reasonCode === 'CUSTOMER_COMPLAINT' && !form.ticketId.trim()) {
    ElMessage.warning('客户投诉补偿必须关联工单')
    return
  }

  await ElMessageBox.confirm('积分流水创建后不可编辑或删除；如需撤销应创建冲正记录。确认继续？', '确认积分调整', {type: 'warning'})
  submitting.value = true
  try {
    const result = await createCreditAdjustment(props.userId, {
      direction: form.direction,
      amount: form.amount,
      reasonCode: form.reasonCode,
      reason: form.reason.trim(),
      ticketId: form.ticketId.trim() || undefined,
      idempotencyKey: crypto.randomUUID(),
    })
    emit('submitted', result.data)
    emit('update:modelValue', false)
    ElMessage.success(result.data.status === 'APPLIED' ? '积分流水已创建' : '大额调整已提交审批')
  } finally {
    submitting.value = false
  }
}
</script>
