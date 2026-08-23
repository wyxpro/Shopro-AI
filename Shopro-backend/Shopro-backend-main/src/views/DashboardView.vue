<template>
  <PageHeader title="运营工作台" description="指标、趋势和待办均由订单、任务、风险事件及服务健康数据实时聚合。">
    <template #actions>
      <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期"
                      end-placeholder="结束日期" @change="load"/>
      <el-button type="primary" :loading="loading" @click="load">刷新</el-button>
    </template>
  </PageHeader>
  <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom: 16px"/>
  <template v-if="data">
    <div class="cards">
      <div v-for="metric in data.metrics" :key="metric.key" class="card"><span class="kpi-label">{{
          metric.label
        }}</span>
        <div class="kpi-value">{{ formatMetric(metric.value, metric.format) }}</div>
        <span :class="metric.delta >= 0 ? 'trend-positive' : 'trend-negative'">环比 {{
            metric.delta >= 0 ? '+' : ''
          }}{{ metric.delta.toFixed(1) }}% · 基准 {{ formatMetric(metric.previousValue, metric.format) }}</span></div>
    </div>
    <p class="period">统计周期：{{ data.period.startAt }} 至 {{
        data.period.endAt
      }}；环比基准：{{ data.period.compareStartAt }} 至 {{ data.period.compareEndAt }}</p>
    <div class="grid2">
      <div class="panel"><h3>AI 履约趋势</h3>
        <div ref="trendElement" style="height: 280px"></div>
      </div>
      <div class="panel"><h3>任务状态分布</h3>
        <div ref="distributionElement" style="height: 280px"></div>
      </div>
    </div>
    <div class="panel" style="margin-top: 16px">
      <div class="section-heading"><h3>当前待办</h3><span class="subtle">处理后刷新即可看到聚合数据同步变化</span></div>
      <el-empty v-if="data.todos.length === 0" description="当前没有待办"/>
      <div v-else class="todo-grid">
        <button v-for="todo in data.todos" :key="todo.id" class="todo-card" type="button" @click="goTodo(todo.route)">
          <StatusTag :label="severityLabel(todo.severity)" :type="severityType(todo.severity)"/>
          <b>{{ todo.title }}</b><span>{{ todoCategory(todo.category) }} · {{ todo.status }}</span><small>进入已筛选列表
          →</small></button>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import {nextTick, onBeforeUnmount, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {type ECharts, init, use} from 'echarts/core'
import {LineChart, PieChart} from 'echarts/charts'
import {GridComponent, TooltipComponent} from 'echarts/components'
import {CanvasRenderer} from 'echarts/renderers'
import type {DashboardData, DashboardMetric, DashboardTodo} from '@/api/dashboard'
import {getDashboard} from '@/api/dashboard'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'

use([LineChart, PieChart, GridComponent, TooltipComponent, CanvasRenderer])

const router = useRouter()
const data = ref<DashboardData>()
const loading = ref(false)
const error = ref<string>()
const dateRange = ref<string[]>()
const trendElement = ref<HTMLElement>()
const distributionElement = ref<HTMLElement>()
let trendChart: ECharts | undefined
let distributionChart: ECharts | undefined

function formatMetric(value: number, format: DashboardMetric['format']): string {
  if (format === 'money') return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(value / 100)
  if (format === 'percent') return `${value.toFixed(2)}%`
  return new Intl.NumberFormat('zh-CN').format(value)
}

function severityLabel(value: DashboardTodo['severity']): string {
  return {LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '严重'}[value]
}

function severityType(value: DashboardTodo['severity']): 'success' | 'warning' | 'danger' | 'info' {
  return value === 'HIGH' || value === 'CRITICAL' ? 'danger' : value === 'MEDIUM' ? 'warning' : 'info'
}

function todoCategory(value: DashboardTodo['category']): string {
  return {WORKFLOW: 'AI 履约', BILLING: '交易计费', RISK: '风险治理', SERVICE: '服务健康'}[value]
}

function renderCharts(): void {
  if (!data.value || !trendElement.value || !distributionElement.value) return
  trendChart ||= init(trendElement.value)
  distributionChart ||= init(distributionElement.value)
  trendChart.setOption({
    color: ['#6259d9'],
    tooltip: {trigger: 'axis'},
    xAxis: {type: 'category', data: data.value.trend.map((item) => item.date.slice(5))},
    yAxis: {type: 'value', minInterval: 1},
    series: [{
      name: '创建任务',
      type: 'line',
      smooth: true,
      areaStyle: {opacity: 0.12},
      data: data.value.trend.map((item) => item.jobs)
    }],
  })
  distributionChart.setOption({
    color: ['#36b37e', '#6259d9', '#ef6b73', '#909399'],
    tooltip: {trigger: 'item'},
    series: [{type: 'pie', radius: ['50%', '72%'], data: data.value.distribution}],
  })
}

async function load(): Promise<void> {
  loading.value = true
  error.value = undefined
  try {
    data.value = (await getDashboard({startAt: dateRange.value?.[0], endAt: dateRange.value?.[1]})).data
    await nextTick()
    renderCharts()
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : '加载工作台失败'
  } finally {
    loading.value = false
  }
}

function resizeCharts(): void {
  trendChart?.resize();
  distributionChart?.resize()
}

function goTodo(route: string): void {
  void router.push(route)
}

onMounted(() => {
  window.addEventListener('resize', resizeCharts);
  void load()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  trendChart?.dispose();
  distributionChart?.dispose();
  trendChart = undefined;
  distributionChart = undefined
})
</script>

<style scoped>
.period, .subtle {
  color: #909399;
  font-size: 13px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.todo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.todo-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  padding: 14px;
  display: grid;
  gap: 8px;
  cursor: pointer;
  color: inherit;
}

.todo-card:hover {
  border-color: #6259d9;
  box-shadow: 0 4px 12px rgb(98 89 217 / 10%);
}

.todo-card span, .todo-card small {
  color: #909399;
}

.trend-positive {
  color: #36b37e;
}

.trend-negative {
  color: #ef6b73;
}
</style>
