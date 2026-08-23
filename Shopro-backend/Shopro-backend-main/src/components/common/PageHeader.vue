<template>
  <div class="page-title">
    <div>
      <h2>{{ title }}</h2>
      <p v-if="description" class="muted">{{ description }}</p>
    </div>
    <slot name="actions"/>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>
