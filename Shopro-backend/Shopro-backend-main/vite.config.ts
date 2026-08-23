import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath, URL} from 'node:url';

export default defineConfig({
    plugins: [vue()],
    resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return

                    if (id.includes('echarts')) return 'vendor-echarts'
                    if (id.includes('element-plus')) return 'vendor-element-plus'
                    if (id.includes('msw')) return 'vendor-msw'
                    if (id.includes('vue-router') || id.includes('pinia') || id.includes('@vue') || id.includes('/vue@')) {
                        return 'vendor-vue'
                    }
                    if (id.includes('axios') || id.includes('dayjs')) return 'vendor-utils'
                }
            }
        }
    },
    server: {port: 5175}
});
