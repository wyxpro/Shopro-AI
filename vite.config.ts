import { defineConfig } from "vite";
import { miaodaDevPlugin } from "miaoda-sc-plugin";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    miaodaDevPlugin(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/gmicloud-api': {
        target: 'https://console.gmicloud.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gmicloud-api/, ''),
        secure: false,
      },
      '/dxkp-api': {
        target: 'https://ai.dxkp.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dxkp-api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/siliconflow-api': {
        target: 'https://api.siliconflow.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/siliconflow-api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/glm-api': {
        target: 'https://www.sophnet.com',
        changeOrigin: true,
        // GLM-5.3-Flash (Sophnet) 真实路径前缀为 /api/open-apis：
        // /glm-api/v1/chat/completions → https://www.sophnet.com/api/open-apis/v1/chat/completions
        // 若仅剔除前缀会被 nginx 拒绝（405 Not Allowed）导致前端 GLM 直连降级通道全部失效
        rewrite: (path) => path.replace(/^\/glm-api/, '/api/open-apis'),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/tokendance-api': {
        target: 'https://tokendance.space',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tokendance-api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
});
