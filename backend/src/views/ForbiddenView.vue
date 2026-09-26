<template>
  <div class="forbidden-page flex items-center justify-center min-h-[60vh] p-6 text-center">
    <div class="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl">
      <div class="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center mx-auto mb-5 text-amber-500 text-3xl font-black">
        403
      </div>
      <h2 class="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">
        访问受限 · 缺少模块权限
      </h2>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
        当前登录账号暂未被分配访问此页面所需的权限。如需访问，请联系厂商超级管理员进行角色提权或权限码配置。
      </p>

      <div v-if="missingPermission" class="mb-6 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 text-xs font-mono text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
        <span>所需权限码：</span>
        <span class="font-bold text-amber-600 dark:text-amber-400">{{ missingPermission }}</span>
      </div>

      <div class="flex items-center justify-center gap-3">
        <el-button @click="goBack" plain>返回上一页</el-button>
        <el-button type="primary" @click="goDashboard">返回运营总览</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const missingPermission = computed(() => (route.query.permission as string) || '')

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}

function goDashboard(): void {
  router.push('/dashboard')
}
</script>

<style scoped>
.forbidden-page {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
