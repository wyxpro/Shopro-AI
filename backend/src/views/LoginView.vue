<template>
  <div class="login-wrapper">
    <!-- 动态科技星云与微光背景 -->
    <div class="ambient-glow glow-left" />
    <div class="ambient-glow glow-right" />
    <div class="cyber-grid" />

    <!-- 浮动星光粒子 -->
    <div class="particles-layer">
      <div v-for="i in 16" :key="i" :class="`particle particle-${i}`" />
    </div>

    <!-- 居中核心登录卡片 -->
    <div class="login-card-container">
      <!-- 细腻顺时针流光边框环 -->
      <div class="card-shimmer-border" />

      <!-- 卡片主体（玻璃拟态深色） -->
      <div class="login-card">
        <!-- 头部 Logo 胶囊 -->
        <div class="logo-badge">
          <span class="sparkle-icon">✦</span>
          <span class="logo-text">SHOPRO AI</span>
          <span class="badge-dot" />
          <span class="badge-tag">v4.0 Hub</span>
        </div>

        <!-- 标题组 -->
        <div class="header-section">
          <h1 class="main-title">厂商运营后台</h1>
          <p class="sub-title">数据驱动的 AI 电商内容运营中心</p>
        </div>

        <!-- 登录表单 -->
        <el-form class="login-form" @submit.prevent="login">
          <!-- 账号输入 -->
          <div class="form-group">
            <label class="form-label">管理员邮箱</label>
            <el-input
              v-model="form.email"
              size="large"
              placeholder="admin@shopro.ai"
              class="custom-input"
              :prefix-icon="User"
            />
          </div>

          <!-- 密码输入 -->
          <div class="form-group">
            <div class="label-row">
              <label class="form-label">管理安全密码</label>
              <span v-if="isDemoMode" class="fill-hint" @click="fillDemoAccount">一键自动填充</span>
            </div>
            <el-input
              v-model="form.password"
              size="large"
              type="password"
              placeholder="••••••••"
              show-password
              class="custom-input"
              :prefix-icon="Lock"
              @keyup.enter="login"
            />
          </div>

          <!-- 登录按钮 -->
          <button
            type="submit"
            class="submit-btn"
            :disabled="loading"
            :class="{ 'is-loading': loading }"
          >
            <span class="btn-content">
              <span v-if="loading" class="spinner" />
              <span>{{ isDemoMode ? '一键进入演示后台' : '登录后台' }}</span>
              <el-icon v-if="!loading" class="arrow-icon"><ArrowRight /></el-icon>
            </span>
            <div class="btn-shine" />
          </button>
        </el-form>

        <!-- 演示账号高亮引导卡片（完全契合要求文案并提供点击填入交互） -->
        <div v-if="isDemoMode" class="demo-card" @click="fillDemoAccount">
          <div class="demo-header">
            <span class="demo-tag">
              <span class="tag-pulse" />
              演示环境免密访问
            </span>
            <span class="demo-action">点击快速填入</span>
          </div>
          <div class="demo-body">
            <div class="demo-row">
              <span class="demo-label">演示账号：</span>
              <span class="demo-code">admin@shopro.ai</span>
            </div>
            <div class="demo-row">
              <span class="demo-label">登录密码：</span>
              <span class="demo-code-val">密码任意</span>
            </div>
          </div>
        </div>

        <!-- 底部安全保障微标 -->
        <div class="security-footer">
          <div class="sec-item">
            <span class="sec-dot" />
            <span>多租户数据隔离</span>
          </div>
          <div class="sec-item">
            <span class="sec-dot" />
            <span>智能风控审计</span>
          </div>
          <div class="sec-item">
            <span class="sec-dot" />
            <span>全链路加密</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部版权声明 -->
    <div class="login-footer">
      <p>© 2026 SHOPRO AI · Enterprise Content Operations Center · All Rights Reserved</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus/es/components/message/index.mjs';
import { User, Lock, ArrowRight } from '@element-plus/icons-vue';
import { api } from '@/api';
import { useAuthStore } from '@/stores/auth';
import type { LoginRequest } from '@/types';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);

const isDemoMode = (import.meta.env.VITE_APP_MODE || 'demo') === 'demo';

const form = reactive<LoginRequest>({
  email: isDemoMode ? 'admin@shopro.ai' : '',
  password: isDemoMode ? 'admin888' : ''
});

function fillDemoAccount() {
  form.email = 'admin@shopro.ai';
  form.password = 'admin888';
  ElMessage.info('已成功填入演示账号');
}

async function login(): Promise<void> {
  if (!form.email) {
    ElMessage.warning('请输入管理员邮箱');
    return;
  }
  loading.value = true;
  try {
    const r = await api.login(form);
    auth.setUser(r.data);
    router.push('/dashboard');
    ElMessage.success('登录成功，欢迎回来运营中心');
  } catch (err: any) {
    ElMessage.error(err?.message || '登录遇到问题，请重试');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrapper {
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #090c13;
  background-image: radial-gradient(circle at 50% 20%, #151a28 0%, #090c13 70%);
  overflow: hidden;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #fff;
  box-sizing: border-box;
}

/* ── 动态星云与科技网格 ── */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  opacity: 0.35;
  animation: glow-breathe 8s ease-in-out infinite alternate;
}
.glow-left {
  top: 15%;
  left: 10%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #ff6b00 0%, #ff3b00 40%, transparent 70%);
}
.glow-right {
  bottom: 15%;
  right: 10%;
  width: 550px;
  height: 550px;
  background: radial-gradient(circle, #6366f1 0%, #00e599 45%, transparent 75%);
  animation-delay: -4s;
}

.cyber-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
}

@keyframes glow-breathe {
  0% { transform: scale(0.9) translate(0, 0); opacity: 0.25; }
  100% { transform: scale(1.1) translate(20px, 20px); opacity: 0.45; }
}

/* ── 粒子微星 ── */
.particles-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #fff;
  border-radius: 50%;
  opacity: 0.2;
}
.particle-1 { top: 20%; left: 15%; animation: twinkle 3s infinite 0.2s; }
.particle-2 { top: 35%; left: 80%; animation: twinkle 4s infinite 0.7s; }
.particle-3 { top: 75%; left: 25%; animation: twinkle 3.5s infinite 1.2s; }
.particle-4 { top: 60%; left: 88%; animation: twinkle 5s infinite 0.4s; }
.particle-5 { top: 15%; left: 70%; animation: twinkle 4.2s infinite 1.8s; }
.particle-6 { top: 82%; left: 65%; animation: twinkle 3.8s infinite 0.9s; }

@keyframes twinkle {
  0%, 100% { opacity: 0.1; transform: scale(0.8); }
  50% { opacity: 0.7; transform: scale(1.4); }
}

/* ── 居中登录卡片容器 ── */
.login-card-container {
  position: relative;
  width: 100%;
  max-width: 440px;
  border-radius: 24px;
  padding: 1.5px;
  overflow: hidden;
  box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.7), 0 0 50px -15px rgba(255, 107, 0, 0.15);
  z-index: 10;
}

/* 顺时针流光微边框 */
.card-shimmer-border {
  position: absolute;
  width: 280%;
  height: 280%;
  top: -90%;
  left: -90%;
  background: conic-gradient(from 0deg, #ff6b00 0deg, rgba(255, 107, 0, 0.05) 75deg, #6366f1 150deg, rgba(99, 102, 241, 0.05) 225deg, #00e599 300deg, #ff6b00 360deg);
  animation: spin-clockwise 8s linear infinite;
  pointer-events: none;
}

@keyframes spin-clockwise {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 卡片内部磨砂黑 */
.login-card {
  position: relative;
  background: rgba(18, 22, 34, 0.92);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-radius: 22.5px;
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
}

/* Logo 胶囊 */
.logo-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(255, 107, 0, 0.1);
  border: 1px solid rgba(255, 107, 0, 0.3);
  margin-bottom: 20px;
}
.sparkle-icon {
  color: #ff6b00;
  font-size: 13px;
  animation: spin-clockwise 10s linear infinite;
}
.logo-text {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.5px;
  background: linear-gradient(135deg, #ffffff 0%, #ffd0b0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.badge-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}
.badge-tag {
  font-size: 10px;
  color: #00e599;
  font-weight: 700;
  font-family: monospace;
}

/* 标题 */
.header-section {
  margin-bottom: 28px;
}
.main-title {
  margin: 0 0 8px 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #ffffff;
  line-height: 1.2;
}
.sub-title {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
}

/* 表单结构 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.form-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}
.fill-hint {
  font-size: 11px;
  color: #ff6b00;
  cursor: pointer;
  transition: opacity 0.2s;
}
.fill-hint:hover {
  text-decoration: underline;
  opacity: 0.8;
}

/* Element Plus Input 深度定制 */
:deep(.custom-input .el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.04) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  box-shadow: none !important;
  padding: 6px 14px !important;
  transition: all 0.25s ease !important;
}
:deep(.custom-input .el-input__wrapper:hover) {
  border-color: rgba(255, 107, 0, 0.4) !important;
  background-color: rgba(255, 255, 255, 0.06) !important;
}
:deep(.custom-input .el-input__wrapper.is-focus) {
  border-color: #ff6b00 !important;
  background-color: rgba(255, 107, 0, 0.05) !important;
  box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.18) !important;
}
:deep(.custom-input .el-input__inner) {
  color: #ffffff !important;
  font-size: 14px !important;
}
:deep(.custom-input .el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.25) !important;
}
:deep(.custom-input .el-input__prefix-inner) {
  color: rgba(255, 255, 255, 0.45) !important;
  font-size: 16px !important;
}

/* 提交按钮 */
.submit-btn {
  position: relative;
  width: 100%;
  margin-top: 6px;
  padding: 13px 20px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 60%, #ff5500 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(255, 107, 0, 0.35);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1.5px);
  box-shadow: 0 12px 30px rgba(255, 107, 0, 0.48);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0.5px);
}
.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.arrow-icon {
  font-size: 15px;
  transition: transform 0.2s ease;
}
.submit-btn:hover .arrow-icon {
  transform: translateX(3px);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin-clockwise 0.7s linear infinite;
}

/* 按钮微扫光 */
.btn-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}
.submit-btn:hover .btn-shine {
  transform: translateX(100%);
}

/* 演示账号专属高亮卡片 */
.demo-card {
  margin-top: 22px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 107, 0, 0.4);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}
.demo-card:hover {
  background: rgba(255, 107, 0, 0.06);
  border-color: #ff6b00;
  transform: translateY(-1px);
}
.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.demo-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #ff8c00;
}
.tag-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff6b00;
  box-shadow: 0 0 8px #ff6b00;
  animation: pulse-dot 1.5s infinite;
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.5; }
}

.demo-action {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}
.demo-card:hover .demo-action {
  color: #00e599;
}

.demo-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.demo-row {
  display: flex;
  align-items: center;
  font-size: 11px;
}
.demo-label {
  color: rgba(255, 255, 255, 0.5);
  width: 65px;
}
.demo-code {
  color: #ffffff;
  font-weight: 600;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
}
.demo-code-val {
  color: #00e599;
  font-weight: 500;
}

/* 底部安全特性 */
.security-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
.sec-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.sec-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #00e599;
}

/* 页面底部版权 */
.login-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  z-index: 10;
}
</style>
