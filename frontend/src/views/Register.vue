
<template>
  <div class="card">
    <h1>สมัครสมาชิก</h1>

    <form @submit.prevent="register" novalidate>
      <label for="name">
        ชื่อ-นามสกุล <span class="required-star">*</span>
      </label>
      <input
        id="name"
        v-model="form.name"
        type="text"
        autocomplete="name"
        placeholder="กรอกชื่อ-นามสกุล"
        maxlength="100"
        required
      />

      <label for="department">
        แผนก <span class="required-star">*</span>
      </label>
      <select
        id="department"
        v-model="form.departmentId"
        required
      >
        <option value="" disabled>เลือกแผนก</option>
        <option
          v-for="d in departments"
          :key="d.DepartmentID"
          :value="d.DepartmentID"
        >
          {{ d.DepartmentName }}
        </option>
      </select>

      <label for="email">
        Email (ใช้เป็น Username สำหรับสมาชิก)
        <span class="required-star">*</span>
      </label>
      <input
        id="email"
        v-model="form.email"
        type="email"
        autocomplete="email"
        placeholder="กรอก Email"
        maxlength="254"
        required
      />

      <label for="phone">
        เบอร์โทรศัพท์ <span class="required-star">*</span>
      </label>
      <input
        id="phone"
        v-model="form.phone"
        type="tel"
        autocomplete="tel"
        placeholder="กรอกเบอร์โทรศัพท์"
        maxlength="20"
        required
      />

      <label for="password">
        Password <span class="required-star">*</span>
      </label>

      <div class="password-wrapper">
        <input
          id="password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="กรอกรหัสผ่าน"
          minlength="8"
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

      <small class="password-hint">
        Password: อย่างน้อย 8 ตัว มี A-Z, a-z, ตัวเลข และอักขระพิเศษ
      </small>

      <p class="required-note">
        <span class="required-star">*</span>
        จำเป็นต้องกรอกข้อมูล
      </p>

      <button
        type="submit"
        class="submit-button"
        :disabled="loading"
      >
        {{ loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก' }}
      </button>

      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();

const departments = ref([]);
const message = ref('');
const error = ref('');
const loading = ref(false);
const showPassword = ref(false);

const form = ref({
  name: '',
  departmentId: '',
  email: '',
  phone: '',
  password: ''
});

onMounted(async () => {
  try {
    const { data } = await api.get('/assets/departments');
    departments.value = Array.isArray(data) ? data : [];
  } catch (e) {
    error.value =
      e.response?.data?.message ||
      'ไม่สามารถโหลดรายชื่อแผนกได้';
  }
});

async function register() {
  if (loading.value) return;

  message.value = '';
  error.value = '';

  // ตรวจสอบว่ากรอกครบทุกช่อง
  if (
    !form.value.name.trim() ||
    !form.value.departmentId ||
    !form.value.email.trim() ||
    !form.value.phone.trim() ||
    !form.value.password.trim()
  ) {
    error.value = 'กรุณากรอกข้อมูลให้ครบทุกช่องที่มีเครื่องหมาย *';
    return;
  }

  // ตรวจสอบรูปแบบอีเมล
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(form.value.email.trim())) {
    error.value = 'กรุณากรอก Email ให้ถูกต้อง';
    return;
  }

  // ตรวจสอบรหัสผ่าน
  const passwordPolicy =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/;

  if (!passwordPolicy.test(form.value.password)) {
    error.value =
      'รหัสผ่านต้องมีอย่างน้อย 8 ตัว ประกอบด้วย A-Z, a-z, ตัวเลข และอักขระพิเศษ';
    return;
  }

  loading.value = true;

  try {
    await api.post('/auth/register', {
      ...form.value,
      name: form.value.name.trim(),
      departmentId: form.value.departmentId,
      email: form.value.email.trim()
    });

    message.value = 'สมัครสมาชิกสำเร็จ กรุณา Login';
    error.value = '';

    setTimeout(() => {
      router.push('/login');
    }, 800);
  } catch (e) {
    error.value =
      e.response?.data?.message ||
      'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.card {
  box-sizing: border-box;
}

form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  display: block;
  margin-top: 5px;
}

.required-star {
  color: #dc2626;
  font-weight: 700;
}

input,
select {
  box-sizing: border-box;
  width: 100%;
}

input:focus,
select:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}

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

.password-hint {
  display: block;
  margin-top: 4px;
  color: #334155;
  line-height: 1.6;
}

.required-note {
  margin: 8px 0;
  color: #64748b;
  font-size: 13px;
}

.submit-button {
  align-self: flex-start;
  cursor: pointer;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  color: #15803d;
}

.error {
  color: #dc2626;
}
</style>
