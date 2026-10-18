<template>
  <div class="reset-page">
    <div class="card">
      <div class="icon">🔐</div>

      <h1>ตั้งรหัสผ่านใหม่</h1>
      <p class="description">
        กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ
      </p>

      <form @submit.prevent="reset">
        <label for="password">รหัสผ่านใหม่</label>

        <div class="password-wrapper">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="กรอกรหัสผ่านใหม่"
            autocomplete="new-password"
            minlength="8"
            required
            :disabled="loading"
          />

          <button
            type="button"
            class="toggle-password"
            @click="showPassword = !showPassword"
            :aria-label="showPassword ? 'ซ่อนรหัสผ่านใหม่' : 'แสดงรหัสผ่านใหม่'"
            :title="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
            :disabled="loading"
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

        <label for="confirmPassword">ยืนยันรหัสผ่านใหม่</label>

        <div class="password-wrapper">
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            autocomplete="new-password"
            minlength="8"
            required
            :disabled="loading"
          />

          <button
            type="button"
            class="toggle-password"
            @click="showConfirmPassword = !showConfirmPassword"
            :aria-label="showConfirmPassword ? 'ซ่อนรหัสผ่านยืนยัน' : 'แสดงรหัสผ่านยืนยัน'"
            :title="showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
            :disabled="loading"
          >
            <svg
              v-if="!showConfirmPassword"
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

        <p class="hint">
          รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วย
          ตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ
        </p>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน' }}
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
import { useRoute, useRouter, RouterLink } from 'vue-router';
import api from '../api';

const route = useRoute();
const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const message = ref('');
const error = ref('');
const loading = ref(false);

async function reset() {
  if (loading.value) return;

  message.value = '';
  error.value = '';

  if (password.value.length < 8) {
    error.value = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    return;
  }

  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  if (!strongPassword.test(password.value)) {
    error.value =
      'รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ';
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
    return;
  }

  const token = route.params.token;

  if (!token) {
    error.value = 'ไม่พบโทเคนรีเซ็ตรหัสผ่าน กรุณาขอลิงก์ใหม่';
    return;
  }

  loading.value = true;

  try {
    const response = await api.post('/auth/reset-password', {
      token,
      password: password.value
    });

    message.value =
      response.data?.message || 'เปลี่ยนรหัสผ่านสำเร็จ';

    password.value = '';
    confirmPassword.value = '';
    showPassword.value = false;
    showConfirmPassword.value = false;

    window.setTimeout(() => {
      router.push('/login');
    }, 1500);
  } catch (e) {
    error.value =
      e.response?.data?.message ||
      'ไม่สามารถเปลี่ยนรหัสผ่านได้ ลิงก์อาจหมดอายุหรือไม่ถูกต้อง';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.reset-page {
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
  color: #18213a;
  text-align: center;
  margin: 0 0 12px;
}

.description {
  color: #687086;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 24px;
}

label {
  display: block;
  margin: 16px 0 8px;
  font-weight: 600;
  color: #303950;
}

.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.password-wrapper input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 13px 48px 13px 14px;
  border: 1px solid #d6dbea;
  border-radius: 10px;
  font-size: 16px;
}

.password-wrapper input:focus {
  outline: 2px solid #a5b4fc;
  border-color: #6366f1;
}

.toggle-password {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.toggle-password:hover:not(:disabled) {
  color: #4f46e5;
  background: #eef2ff;
}

.toggle-password:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 1px;
}

.toggle-password:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.toggle-password svg {
  display: block;
  flex-shrink: 0;
}

.hint {
  font-size: 13px;
  color: #687086;
  line-height: 1.6;
  margin: 12px 0 18px;
}

.submit-btn {
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

.submit-btn:hover:not(:disabled) {
  background: #4338ca;
}

.submit-btn:disabled {
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
