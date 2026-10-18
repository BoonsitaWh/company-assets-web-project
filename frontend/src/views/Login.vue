
<template>
  <div class="card">
    <h1>เข้าสู่ระบบ</h1>
    <p>Admin ใช้ Username / Password ส่วนสมาชิกใช้ Email / Password</p>

    <form @submit.prevent="login">
      <label>Username / Email</label>
      <input
        v-model.trim="username"
        autocomplete="username"
        required
      />

      <label>Password</label>
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      />

      <button type="submit" :disabled="loading">
        {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'Login' }}
      </button>
    </form>

    <p>
      <router-link to="/register">สมัครสมาชิก</router-link>
      ·
      <router-link to="/forgot-password">ลืม Password</router-link>
    </p>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function login() {
  if (loading.value) return;

  loading.value = true;
  error.value = '';

  try {
    const { data } = await api.post('/auth/login', {
      username: username.value,
      password: password.value
    });

    if (!data.token || !data.user) {
      throw new Error('รูปแบบข้อมูล Login จากเซิร์ฟเวอร์ไม่ถูกต้อง');
    }

    // บันทึกข้อมูล Login ก่อนเปลี่ยนหน้า
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // เปลี่ยนหน้าโดยไม่โหลดเว็บซ้ำ
    await router.replace(
      data.user.type === 'admin' ? '/admin' : '/'
    );
  } catch (e) {
    error.value =
      e.response?.data?.message ||
      e.message ||
      'เข้าสู่ระบบไม่สำเร็จ';
  } finally {
    loading.value = false;
  }
}
</script>
