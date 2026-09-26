import {ref} from 'vue'

export function useAsyncAction<Args extends unknown[], Result>(
    action: (...args: Args) => Promise<Result>,
) {
    const loading = ref(false)
    const error = ref<string>()

    async function execute(...args: Args): Promise<Result | undefined> {
        loading.value = true
        error.value = undefined
        try {
            return await action(...args)
        } catch (cause: unknown) {
            error.value = cause instanceof Error ? cause.message : '操作失败，请稍后重试'
            return undefined
        } finally {
            loading.value = false
        }
    }

    return {loading, error, execute}
}
