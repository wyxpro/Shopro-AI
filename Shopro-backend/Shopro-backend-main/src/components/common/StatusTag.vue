<template>
  <el-tag :type="type">{{ label }}</el-tag>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  type?: 'success' | 'warning' | 'danger' | 'info'
}>()
</script>
