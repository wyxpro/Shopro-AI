# Shopro AI 厂商运营后台 Demo

基于 Vue 3、Vite、TypeScript、Vue Router、Pinia、Element Plus、Axios、ECharts、MSW、Day.js 和 pnpm 构建的运营后台演示项目。

## 安装与启动

```bash
pnpm install
pnpm dev
```

演示账号：`admin@shopro.ai`，密码可任意填写。

## 构建

```bash
pnpm build
pnpm preview
```

构建产物位于 `dist/`，可直接部署到 EdgeOne Pages、Cloudflare Pages 等静态托管平台。

## Mock 开关

默认使用 MSW Mock：

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=/api
```

生产接入 Spring Boot 时设置 `VITE_USE_MOCK=false`，并将 `VITE_API_BASE_URL` 指向后端地址。前端 API 边界统一为 `/api/admin/**`，页面无需修改。MSW 数据保存在浏览器 localStorage，系统运营页可恢复演示数据。

## Spring Boot 对接

Spring Boot 提供 `/api/admin/**` REST API，前端保持统一响应体 `{ code, message, data, traceId? }` 与分页结构 `{ items, total, page, pageSize }`。生产环境可将 `dist` 复制到 Spring Boot 的 `src/main/resources/static`，由 Spring Security 负责 JWT 与 RBAC。
