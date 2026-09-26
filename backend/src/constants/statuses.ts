import type {LegacyJob, LegacyUser} from '@/types'

export interface StatusPresentation {
    label: string
    type: 'success' | 'warning' | 'danger' | 'info'
}

export const legacyUserStatus: Record<LegacyUser['status'], StatusPresentation> = {
    active: {label: '正常', type: 'success'},
    disabled: {label: '已禁用', type: 'info'},
}

export const legacyJobStatus: Record<LegacyJob['status'], StatusPresentation> = {
    pending: {label: '排队中', type: 'warning'},
    running: {label: '生成中', type: 'warning'},
    success: {label: '成功', type: 'success'},
    failed: {label: '失败', type: 'danger'},
    cancelled: {label: '已取消', type: 'info'},
}
