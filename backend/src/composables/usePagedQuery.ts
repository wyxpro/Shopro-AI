import {ref, type Ref} from 'vue'
import type {ApiResponse, ListQuery, PageResult} from '@/types'

export interface PagedQueryState<T> {
    rows: Ref<T[]>
    total: Ref<number>
    loading: Ref<boolean>
    error: Ref<string | undefined>
    load: () => Promise<void>
}

export function usePagedQuery<T, Q extends ListQuery>(
    query: Ref<Q>,
    fetchPage: (params: Q) => Promise<ApiResponse<PageResult<T>>>,
): PagedQueryState<T> {
    const rows = ref<T[]>([]) as Ref<T[]>
    const total = ref(0)
    const loading = ref(false)
    const error = ref<string>()

    async function load(): Promise<void> {
        loading.value = true
        error.value = undefined
        try {
            const result = await fetchPage(query.value)
            rows.value = result.data.items
            total.value = result.data.total
        } catch (cause: unknown) {
            error.value = cause instanceof Error ? cause.message : '加载数据失败，请稍后重试'
        } finally {
            loading.value = false
        }
    }

    return {rows, total, loading, error, load}
}
