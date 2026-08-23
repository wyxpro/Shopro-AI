<template>
  <div class="login">
    <div class="login-card">
      <div class="logo">✦ SHOPRO AI</div>
      <h1>厂商运营后台</h1>
      <p>数据驱动的 AI 电商内容运营中心</p>
      <el-form @submit.prevent="login">
        <el-form-item>
          <el-input v-model="form.email" size="large" placeholder="管理员邮箱"/>
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" size="large" type="password" placeholder="登录密码" show-password/>
        </el-form-item>
        <el-button type="primary" size="large" native-type="submit" :loading="loading" class="full">
          {{ isDemoMode ? '一键进入演示后台' : '登录后台' }}
        </el-button>
      </el-form>
      <small v-if="isDemoMode">演示账号：admin@shopro.ai　密码任意</small></div>
  </div>
</template>
<script setup lang="ts">import {reactive, ref} from 'vue';
import {useRouter} from 'vue-router';
import {ElMessage} from 'element-plus/es/components/message/index.mjs';
import {api} from '@/api';
import {useAuthStore} from '@/stores/auth';
import type {LoginRequest} from '@/types';

const router = useRouter(), auth = useAuthStore(), loading = ref(false),
    form = reactive<LoginRequest>({
      email: (import.meta.env.VITE_APP_MODE || 'demo') === 'demo' ? 'admin@shopro.ai' : '',
      password: (import.meta.env.VITE_APP_MODE || 'demo') === 'demo' ? 'demo' : ''
    });
const isDemoMode = (import.meta.env.VITE_APP_MODE || 'demo') === 'demo'

async function login(): Promise<void> {
  loading.value = true;
  try {
    const r = await api.login(form);
    auth.setUser(r.data);
    router.push('/dashboard');
    ElMessage.success('登录成功，欢迎回来')
  } finally {
    loading.value = false
  }
}</script>
