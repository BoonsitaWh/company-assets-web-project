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

      <div class="password-wrapper">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="กรอกรหัสผ่าน"
          required
        />

        <button
          type="button"
          class="toggle-password"
          @click="showPassword = !showPassword"
          :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
          :title="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
        >
          <svg
            v-if="!showPassword"
            xmlns="http://www.w3.org/2000/svg"
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>

          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.2A11 11 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.1 3.9" />
            <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3.1-.5" />
          </svg>
        </button>
      </div>

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
const showPassword = ref(false);
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

    // แยกหน้า Admin และสมาชิก โดยไม่โหลดเว็บซ้ำ
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

<style scoped>
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.password-wrapper input {
  width: 100%;
  min-width: 0;
  padding-right: 46px;
  box-sizing: border-box;
}

.toggle-password {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 8px;
}

.toggle-password:hover {
  color: #2563eb;
  background: #eff6ff;
}

.toggle-password:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.toggle-password svg {
  display: block;
  flex-shrink: 0;
}
</style>
