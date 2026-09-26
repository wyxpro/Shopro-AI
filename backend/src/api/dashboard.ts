import {request} from './client'
import type {ApiResponse} from '@/types'

export interface DashboardQuery {
    startAt?: string
    endAt?: string
}

export interface DashboardMetric {
    key: 'AI_FULFILLMENT' | 'NET_REVENUE' | 'RISK_TODOS' | 'SERVICE_IMPACT'
    label: string
    value: number
    previousValue: number
    delta: number
    format: 'number' | 'percent' | 'money'
}

export interface DashboardTrendPoint {
    date: string
    jobs: number
}

export interface DashboardTodo {
    id: string
    title: string
    category: 'WORKFLOW' | 'BILLING' | 'RISK' | 'SERVICE'
    status: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    route: string
}

export interface DashboardData {
    period: { startAt: string; endAt: string; compareStartAt: string; compareEndAt: string }
    metrics: DashboardMetric[]
    trend: DashboardTrendPoint[]
    distribution: Array<{ name: string; value: number }>
    todos: DashboardTodo[]
}

export function getDashboard(params: DashboardQuery = {}): Promise<ApiResponse<DashboardData>> {
    return request<DashboardData>({method: 'GET', url: '/admin/dashboard', params})
}

export function getDashboardTodos(params: DashboardQuery = {}): Promise<ApiResponse<DashboardTodo[]>> {
    return request<DashboardTodo[]>({method: 'GET', url: '/admin/dashboard/todos', params})
}
