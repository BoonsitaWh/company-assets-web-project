
<template>
  <div class="forgot-page">
    <div class="card">
      <div class="icon">🔐</div>

      <h1>ลืมรหัสผ่าน?</h1>

      <p class="description">
        กรอกอีเมลที่ใช้ลงทะเบียน ระบบจะส่งลิงก์
        สำหรับตั้งรหัสผ่านใหม่ให้คุณ
      </p>

      <form @submit.prevent="send">
        <label for="email">อีเมลของคุณ</label>

        <input
          id="email"
          v-model.trim="email"
          type="email"
          placeholder="email@company.com"
          autocomplete="email"
          required
          :disabled="loading"
        />

        <button type="submit" :disabled="loading">
          {{ loading ? 'กำลังส่งอีเมล...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน' }}
        </button>
      </form>

      <p v-if="message" class="success" role="status">
        {{ message }}
      </p>

      <p v-if="error" class="error" role="alert">
        {{ error }}
      </p>

      <RouterLink to="/login" class="back-link">
        ← กลับไปหน้าเข้าสู่ระบบ
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../api';

const email = ref('');
const message = ref('');
const error = ref('');
const loading = ref(false);

async function send() {
  if (loading.value) return;

  message.value = '';
  error.value = '';

  if (!email.value) {
    error.value = 'กรุณากรอกอีเมล';
    return;
  }

  loading.value = true;

  try {
    const response = await api.post('/auth/forgot-password', {
      email: email.value
    });

    message.value =
      response.data?.message ||
      'หากอีเมลนี้ลงทะเบียนไว้ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านให้';

    // ล้างอีเมลหลังส่งคำขอสำเร็จ
    email.value = '';
  } catch (e) {
    error.value =
      e.response?.data?.message ||
      'ไม่สามารถส่งคำขอได้ กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.forgot-page {
  min-height: 75vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: #f4f6fb;
}

.card {
  box-sizing: border-box;
  width: 100%;
  max-width: 440px;
  padding: 32px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 36px rgba(25, 35, 70, 0.1);
}

.icon {
  font-size: 42px;
  text-align: center;
  margin-bottom: 12px;
}

h1 {
  text-align: center;
  margin: 0 0 12px;
  color: #18213a;
}

.description {
  color: #687086;
  line-height: 1.7;
  text-align: center;
  margin-bottom: 24px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #303950;
}

input {
  box-sizing: border-box;
  width: 100%;
  padding: 13px 14px;
  border: 1px solid #d6dbea;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 16px;
}

input:focus {
  outline: 2px solid #a5b4fc;
  border-color: #6366f1;
}

input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

button {
  box-sizing: border-box;
  width: 100%;
  padding: 13px;
  border: 0;
  border-radius: 10px;
  background: #4f46e5;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #4338ca;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success,
.error {
  margin-top: 16px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.success {
  color: #15803d;
}

.error {
  color: #dc2626;
}

.back-link {
  display: block;
  margin-top: 24px;
  text-align: center;
  color: #4f46e5;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
