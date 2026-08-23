<template>
  <el-dialog :model-value="modelValue" :title="title" width="420px"
             @update:model-value="emit('update:modelValue', $event)">
    <p>{{ message }}</p>
    <template #footer>
      <el-button @click="emit('cancel')">取消</el-button>
      <el-button :loading="loading" type="primary" @click="emit('confirm')">{{ confirmText }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  loading?: boolean
}>(), {
  confirmText: '确认',
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()
</script>
