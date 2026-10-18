
<template>
  <div class="profile-page">
    <section class="profile-header">
      <div class="avatar">👤</div>
      <div>
        <p class="eyebrow">MY ACCOUNT</p>
        <h1>โปรไฟล์ของฉัน</h1>
        <p>ข้อมูลบัญชีผู้ใช้งานในระบบยืม–คืนทรัพย์สิน</p>
      </div>
    </section>

    <section class="profile-card">
      <div class="section-heading">
        <div>
          <h2>ข้อมูลส่วนตัว</h2>
          <p>ข้อมูลบัญชีที่ได้รับจากระบบ Login</p>
        </div>
        <span class="role-badge">{{ roleText }}</span>
      </div>

      <div class="profile-fields">
        <div class="field">
          <span>ชื่อผู้ใช้งาน</span>
          <strong>{{ displayValue(name) }}</strong>
        </div>

        <div class="field">
          <span>อีเมล</span>
          <strong>{{ displayValue(email) }}</strong>
        </div>

        <div class="field">
          <span>เบอร์โทรศัพท์</span>
          <strong>{{ displayValue(phone) }}</strong>
        </div>

        <div class="field">
          <span>แผนก</span>
          <strong>{{ displayValue(department) }}</strong>
        </div>

        <div class="field">
          <span>ประเภทบัญชี</span>
          <strong>{{ roleText }}</strong>
        </div>
      </div>

      <p class="notice">
        หากข้อมูลไม่ครบหรือไม่ถูกต้อง โปรดติดต่อผู้ดูแลระบบ
        การแก้ไขข้อมูลในฐานข้อมูลต้องเชื่อมกับ API ของระบบก่อน
      </p>

      <div class="actions">
        <router-link to="/" class="secondary-btn">
          กลับหน้าทรัพย์สิน
        </router-link>

        <router-link
          v-if="user?.type === 'employee'"
          to="/my-borrow"
          class="primary-btn"
        >
          ดูรายการยืมของฉัน
        </router-link>

        <router-link
          v-if="user?.type === 'admin'"
          to="/admin"
          class="primary-btn"
        >
          ไปหน้า Admin
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';

let savedUser = null;

try {
  savedUser = JSON.parse(localStorage.getItem('user') || 'null');
} catch {
  savedUser = null;
}

const user = computed(() => savedUser || {});

function firstValue(...values) {
  return values.find(
    value => value !== undefined &&
             value !== null &&
             String(value).trim() !== ''
  );
}

const name = computed(() =>
  firstValue(
    user.value.name,
    user.value.Name,
    user.value.fullName,
    user.value.FullName,
    user.value.username,
    user.value.Username
  )
);

const email = computed(() =>
  firstValue(
    user.value.email,
    user.value.Email
  )
);

const phone = computed(() =>
  firstValue(
    user.value.phone,
    user.value.Phone,
    user.value.phoneNumber,
    user.value.PhoneNumber
  )
);

const department = computed(() =>
  firstValue(
    user.value.departmentName,
    user.value.DepartmentName,
    user.value.department,
    user.value.Department
  )
);

const roleText = computed(() => {
  if (user.value.type === 'admin') return 'ผู้ดูแลระบบ';
  if (user.value.type === 'employee') return 'พนักงาน';
  return 'ผู้ใช้งาน';
});

function displayValue(value) {
  return value || 'ไม่มีข้อมูล';
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 32px;
  background: #f4f7fc;
  color: #1e293b;
}

.profile-header {
  max-width: 900px;
  margin: 0 auto 24px;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 22px;
  border-radius: 20px;
  background: linear-gradient(135deg, #172554, #2563eb);
  color: white;
}

.avatar {
  width: 78px;
  height: 78px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #dbeafe;
  font-size: 38px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #bfdbfe;
  font-size: 12px;
  letter-spacing: 2px;
}

.profile-header h1 {
  margin: 0 0 8px;
  font-size: clamp(25px, 4vw, 34px);
}

.profile-header p:last-child {
  margin: 0;
  color: #dbeafe;
  line-height: 1.7;
}

.profile-card {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: white;
  box-shadow: 0 5px 20px rgba(15, 23, 42, 0.05);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.section-heading h2 {
  margin: 0 0 6px;
}

.section-heading p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.role-badge {
  padding: 7px 13px;
  border-radius: 20px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 600;
}

.profile-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  min-width: 0;
  padding: 17px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}

.field span {
  display: block;
  margin-bottom: 8px;
  color: #64748b;
  font-size: 13px;
}

.field strong {
  display: block;
  overflow-wrap: anywhere;
  color: #1e293b;
  font-size: 15px;
}

.notice {
  margin-top: 22px;
  padding: 14px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 13px;
  line-height: 1.8;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.primary-btn,
.secondary-btn {
  display: inline-block;
  padding: 11px 16px;
  border-radius: 9px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.primary-btn {
  background: #2563eb;
  color: white;
}

.primary-btn:hover {
  background: #1d4ed8;
}

.secondary-btn {
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
}

@media (max-width: 650px) {
  .profile-page {
    padding: 16px;
  }

  .profile-header {
    padding: 22px;
    align-items: flex-start;
  }

  .avatar {
    width: 58px;
    height: 58px;
    font-size: 29px;
  }

  .profile-card {
    padding: 20px;
  }

  .profile-fields {
    grid-template-columns: 1fr;
  }
}
</style>
