<template>
  <el-dialog :model-value="modelValue" :title="event?.parentEventId ? '申诉复核决定' : '风险审核决定'" width="560px"
             :close-on-click-modal="false" @update:model-value="emit('update:modelValue', $event)">
    <el-form label-width="108px">
      <el-form-item label="审核决定" required>
        <el-radio-group v-model="form.decision">
          <el-radio-button label="PASS">通过</el-radio-button>
          <el-radio-button label="REJECT">驳回</el-radio-button>
          <el-radio-button label="ESCALATE">升级处理</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="原因码" required>
        <el-select v-model="form.reasonCode" placeholder="请选择原因码" style="width: 100%">
          <el-option label="规则命中可豁免" value="RULE_EXCEPTION"/>
          <el-option label="证据不足" value="INSUFFICIENT_EVIDENCE"/>
          <el-option label="违规内容确认" value="POLICY_VIOLATION_CONFIRMED"/>
          <el-option label="需专家复核" value="SPECIALIST_REVIEW_REQUIRED"/>
        </el-select>
      </el-form-item>
      <el-form-item label="内部备注" required>
        <el-input v-model="form.internalNote" type="textarea" :rows="3" maxlength="500" show-word-limit
                  placeholder="记录审核依据和处置说明"/>
      </el-form-item>
      <el-form-item v-if="form.decision === 'REJECT'" label="用户可见说明" required>
        <el-input v-model="form.userMessage" type="textarea" :rows="3" maxlength="500" show-word-limit
                  placeholder="驳回时必须向用户说明原因和可采取的下一步"/>
      </el-form-item>
      <el-alert v-else title="审核只会更新内容安全状态，不会自动改变内容可见性或发布状态。" type="info"
                :closable="false"/>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交决定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {reactive, watch} from 'vue'
import {ElMessage} from 'element-plus/es/components/message/index.mjs'
import type {CreateRiskDecisionRequest, RiskEvent} from '@/types'

const props = defineProps<{ modelValue: boolean; event?: RiskEvent; submitting?: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: CreateRiskDecisionRequest]
}>()

const form = reactive<CreateRiskDecisionRequest>({
  decision: 'PASS',
  reasonCode: '',
  internalNote: '',
  userMessage: '',
})

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  form.decision = 'PASS'
  form.reasonCode = ''
  form.internalNote = ''
  form.userMessage = ''
})

function submit(): void {
  if (!form.reasonCode || !form.internalNote.trim()) {
    ElMessage.warning('请填写原因码和内部备注')
    return
  }
  if (form.decision === 'REJECT' && !form.userMessage.trim()) {
    ElMessage.warning('驳回必须填写用户可见说明')
    return
  }
  emit('submit', {...form, internalNote: form.internalNote.trim(), userMessage: form.userMessage.trim()})
}
</script>
