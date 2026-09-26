<template>
  <el-container class="shell">
    <el-aside class="sidebar" width="232px">
      <div class="brand"><b>✦ SHOPRO</b><span>AI 厂商运营后台</span></div>
      <el-menu :default-active="route.path" router background-color="#172033" text-color="#aeb9ce"
               active-text-color="#fff">
        <el-menu-item v-for="menu in visibleMenus" :key="menu.path" :index="menu.path">
          <el-icon>
            <component :is="menu.icon"/>
          </el-icon>
          {{ menu.name }}
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container class="content-shell">
      <el-header>
        <div><strong>{{ title }}</strong><small> 工作台 / {{ title }}</small></div>
        <div class="top">
          <el-autocomplete v-if="auth.hasPermission('search:use')" v-model="searchKeyword"
                           :fetch-suggestions="fetchSuggestions" placeholder="搜索用户、订单、工作流、内容、工单" clearable
                           style="width: 290px" @select="selectSearchResult">
            <template #default="{ item }">
              <div>{{ item.value }}</div>
              <small>{{ item.description }}</small></template>
          </el-autocomplete>
          <el-tag v-if="isDemoMode" type="success">Demo 数据</el-tag>
          <el-button circle :icon="Bell"/>
          <span>{{ auth.user?.name }}</span>
          <el-button link @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-main class="content-main">
        <router-view/>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Bell, DataAnalysis, DocumentChecked, Setting, ShoppingBag, User, VideoPlay} from '@element-plus/icons-vue'
import {globalSearch} from '@/api/system'
import {useAuthStore} from '@/stores/auth'
import type {SearchResult} from '@/types'

interface SearchSuggestion extends SearchResult {
  value: string
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const searchKeyword = ref('')
const isDemoMode = (import.meta.env.VITE_APP_MODE || 'demo') === 'demo'
const menus = [
  {path: '/dashboard', name: '运营总览', icon: DataAnalysis, permission: 'dashboard:view'},
  {path: '/users', name: '用户与积分', icon: User, permission: 'customers:view'},
  {path: '/ai-operations', name: 'AI 任务中心', icon: VideoPlay, permission: 'workflow:view'},
  {path: '/risk/events', name: '风险与内容治理', icon: DocumentChecked, permission: 'risk:view'},
  {path: '/billing/orders', name: '订单与套餐', icon: ShoppingBag, permission: 'billing:view'},
  {path: '/system', name: '系统运营', icon: Setting, permission: 'system:view'},
]
const visibleMenus = computed(() => menus.filter((menu) => auth.hasPermission(menu.permission)))
const title = computed(() => {
  if (route.path.startsWith('/customers/users/')) return '客户详情'
  if (route.path.startsWith('/tickets')) return '客户工单'
  if (route.path.startsWith('/ai-operations')) return 'AI 任务中心'
  if (route.path.startsWith('/risk/events')) return '风险与内容治理'
  if (route.path.startsWith('/billing/orders')) return '订单与套餐'
  return menus.find((menu) => menu.path === route.path)?.name || '运营总览'
})

function fetchSuggestions(query: string, callback: (items: SearchSuggestion[]) => void): void {
  if (query.trim().length < 2) {
    callback([]);
    return
  }
  void globalSearch(query).then((result) => callback(result.data.map((item) => ({
    ...item,
    value: `[${categoryLabel(item.category)}] ${item.title}`
  })))).catch(() => callback([]))
}

function categoryLabel(value: SearchResult['category']): string {
  return {
    USER: '用户',
    ORGANIZATION: '企业',
    ORDER: '订单',
    WORKFLOW: '工作流',
    JOB: '任务',
    CONTENT: '内容',
    TICKET: '工单'
  }[value]
}

function selectSearchResult(item: SearchSuggestion): void {
  searchKeyword.value = '';
  void router.push(item.route)
}

function logout(): void {
  auth.logout();
  void router.push('/login')
}
</script>
