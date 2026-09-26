import {login} from './auth'
import {getDashboard} from './dashboard'
import {resetDemoData} from './system'

export * from './auth'
export * from './billing'
export * from './client'
export * from './credits'
export * from './customers'
export * from './dashboard'
export * from './risk'
export * from './system'
export * from './tickets'
export * from './workflows'

/**
 * @deprecated 旧页面的过渡出口。新增页面请从对应领域文件导入 API。
 */
export const api = {
    login,
    dashboard: getDashboard,
    reset: resetDemoData,
}
