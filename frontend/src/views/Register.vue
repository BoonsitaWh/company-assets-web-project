<template>
  <div class="card">
    <h1>สมัครสมาชิก</h1>

    <label>ชื่อ-นามสกุล</label>
    <input
      v-model="form.name"
      autocomplete="name"
      required
    />

    <label>แผนก</label>
    <select v-model="form.departmentId" required>
      <option value="">เลือกแผนก</option>
      <option
        v-for="d in departments"
        :key="d.DepartmentID"
        :value="d.DepartmentID"
      >
        {{ d.DepartmentName }}
      </option>
    </select>

    <label>Email (ใช้เป็น Username สำหรับสมาชิก)</label>
    <input
      type="email"
      v-model="form.email"
      autocomplete="email"
      required
    />

    <label>เบอร์โทรศัพท์</label>
    <input
      v-model="form.phone"
      type="tel"
      autocomplete="tel"
      required
    />

    <label>Password</label>

    <div class="password-wrapper">
      <input
        v-model="form.password"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
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

    <small>
      Password: ≥8 ตัว, มี A-Z, a-z, ตัวเลข และอักขระพิเศษ
    </small>

    <br />
    <br />

    <button
      type="button"
      @click="register"
      :disabled="loading"
    >
      {{ loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก' }}
    </button>

    <p v-if="message" class="success">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
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
    departments.value = data;
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

  // ตรวจสอบข้อมูลที่จำเป็น
  if (
    !form.value.name.trim() ||
    !form.value.departmentId ||
    !form.value.email.trim() ||
    !form.value.phone.trim() ||
    !form.value.password
  ) {
    error.value = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
    return;
  }

  // ตรวจสอบรูปแบบรหัสผ่านให้ตรงกับ Backend
  const passwordPolicy =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

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
      'สมัครสมาชิกไม่สำเร็จ';
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
