
<template>
  <!-- ================= HERO ================= -->
  <section class="hero">
    <h1>ระบบยืมคืนทรัพย์สินบริษัท</h1>

    <p>
      ค้นหาทรัพย์สิน ตรวจสอบสถานะ
      และส่งคำขอยืมได้จากหน้าเดียว
    </p>

    <p v-if="user" class="login-user">
      เข้าสู่ระบบเป็น:
      <b>{{ user.name }}</b>
    </p>
  </section>

  <!-- ================= SEARCH ================= -->
  <div class="card search-card">
    <label for="asset-search">ค้นหาทรัพย์สิน</label>

    <input
      id="asset-search"
      v-model="q"
      @input="load"
      placeholder="ชื่อทรัพย์สิน / Serial / ประเภท"
    />
  </div>

  <!-- ================= ASSET LIST ================= -->
  <div class="grid">
    <AssetCard
      v-for="asset in assets"
      :key="asset.AssetID"
      :asset="asset"
      :is-member="user?.type === 'employee'"
      @borrow="openBorrow"
    />
  </div>

  <!-- ================= BORROW MODAL ================= -->
  <Teleport to="body">
    <div
      v-if="selected"
      class="modal-overlay"
      @click.self="closeBorrow"
      @keydown.esc="closeBorrow"
    >
      <section
        class="borrow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="borrow-modal-title"
      >
        <!-- หัวป๊อปอัป -->
        <div class="modal-header">
          <div class="modal-heading-icon">📦</div>

          <button
            type="button"
            class="close-button"
            aria-label="ปิดหน้าต่าง"
            @click="closeBorrow"
          >
            &times;
          </button>
        </div>

        <p class="modal-eyebrow">BORROW REQUEST</p>

        <h2 id="borrow-modal-title">ขอยืมทรัพย์สิน</h2>

        <p class="modal-description">
          ตรวจสอบรายการและเลือกวันที่ต้องการคืนก่อนส่งคำขอ
        </p>

        <!-- ข้อมูลทรัพย์สิน -->
        <div class="selected-asset">
          <div class="asset-icon">🖥️</div>

          <div class="asset-details">
            <span class="asset-label">ทรัพย์สินที่เลือก</span>

            <h3>{{ selected.AssetName }}</h3>

            <p v-if="selected.SerialNumber">
              Serial Number: {{ selected.SerialNumber }}
            </p>

            <p v-if="selected.CategoryName">
              ประเภท: {{ selected.CategoryName }}
            </p>
          </div>
        </div>

        <!-- วันที่กำหนดคืน -->
        <div class="date-field">
          <label for="due-date">
            วันที่กำหนดคืน <span>*</span>
          </label>

          <input
            id="due-date"
            type="date"
            v-model="dueDate"
            :min="minDueDate"
            :disabled="submitting"
            required
          />

          <small>กรุณาเลือกวันที่ต้องการคืนทรัพย์สิน</small>
        </div>

        <!-- ข้อความสำเร็จ -->
        <div v-if="message" class="success">
          <span>✓</span>
          {{ message }}
        </div>

        <!-- ข้อความผิดพลาด -->
        <div v-if="error" class="error">
          <span>!</span>
          {{ error }}
        </div>

        <!-- ปุ่ม -->
        <div class="modal-actions">
          <button
            type="button"
            class="secondary-button"
            :disabled="submitting"
            @click="closeBorrow"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            class="primary-button"
            :disabled="submitting"
            @click="borrow"
          >
            {{ submitting ? 'กำลังส่งคำขอ...' : 'ยืนยันการขอยืม' }}
          </button>
        </div>

        <p class="modal-note">
          * เมื่อส่งคำขอแล้ว ต้องรอผู้ดูแลระบบอนุมัติ
        </p>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

import api from '../api'
import AssetCard from '../components/AssetCard.vue'

// ==================================================
// DATA
// ==================================================

const assets = ref([])
const q = ref('')
const selected = ref(null)
const dueDate = ref('')
const message = ref('')
const error = ref('')
const submitting = ref(false)

// ==================================================
// USER
// ==================================================

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

const user = ref(getUser())

// วันปัจจุบัน ใช้เป็นวันต่ำสุดสำหรับกำหนดคืน
const minDueDate = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
})

// ==================================================
// LOAD ASSETS
// ==================================================

async function load() {
  try {
    const response = await api.get('/assets', {
      params: {
        q: q.value
      }
    })

    assets.value = response.data?.data ?? response.data ?? []
    error.value = ''
  } catch (e) {
    console.error('Load assets error:', e)

    error.value =
      e.response?.data?.message ||
      'ไม่สามารถโหลดรายการทรัพย์สินได้'
  }
}

// ==================================================
// OPEN BORROW MODAL
// ==================================================

function openBorrow(asset) {
  // โหลดสถานะผู้ใช้ล่าสุดจาก localStorage
  user.value = getUser()

  // ถ้ายังไม่ได้เข้าสู่ระบบ
  if (!user.value || !localStorage.getItem('token')) {
    window.location.href = '/login'
    return
  }

  // ตรวจสอบสิทธิ์พนักงาน
  if (user.value.type !== 'employee') {
    window.alert('เฉพาะพนักงานเท่านั้นที่สามารถขอยืมทรัพย์สินได้')
    return
  }

  selected.value = asset
  dueDate.value = ''
  message.value = ''
  error.value = ''
  submitting.value = false

  // ป้องกันการเลื่อนหน้าด้านหลังเมื่อเปิดป๊อปอัป
  document.body.style.overflow = 'hidden'
}

// ==================================================
// CLOSE BORROW MODAL
// ==================================================

function closeBorrow() {
  if (submitting.value) return

  selected.value = null
  dueDate.value = ''
  message.value = ''
  error.value = ''

  document.body.style.overflow = ''
}

// ==================================================
// BORROW
// ==================================================

async function borrow() {
  if (submitting.value) return

  error.value = ''
  message.value = ''

  // ตรวจสอบวันกำหนดคืน
  if (!dueDate.value) {
    error.value = 'กรุณาเลือกวันที่กำหนดคืน'
    return
  }

  if (dueDate.value < minDueDate.value) {
    error.value = 'วันที่กำหนดคืนต้องไม่เป็นวันที่ผ่านมาแล้ว'
    return
  }

  // ตรวจสอบทรัพย์สิน
  if (!selected.value) {
    error.value = 'กรุณาเลือกทรัพย์สิน'
    return
  }

  submitting.value = true

  try {
    // ใช้ API เดิม
    await api.post('/borrow', {
      assetId: selected.value.AssetID,
      dueDate: dueDate.value
    })

    message.value = 'ส่งคำขอยืมสำเร็จ รอผู้ดูแลระบบอนุมัติ'

    // โหลดรายการทรัพย์สินใหม่
    await load()

    // ปิดป๊อปอัปหลังส่งคำขอสำเร็จ
    selected.value = null
    dueDate.value = ''
    document.body.style.overflow = ''
  } catch (e) {
    console.error('Borrow error:', e)

    error.value =
      e.response?.data?.message ||
      'เกิดข้อผิดพลาดในการส่งคำขอยืม กรุณาลองใหม่อีกครั้ง'
  } finally {
    submitting.value = false
  }
}

// ==================================================
// KEYBOARD
// ==================================================

function handleKeydown(event) {
  if (event.key === 'Escape' && selected.value) {
    closeBorrow()
  }
}

// ==================================================
// LIFECYCLE
// ==================================================

onMounted(() => {
  load()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ================= GENERAL ================= */

.card {
  padding: 25px;
  margin-bottom: 20px;
  background: #ffffff;
  border: 1px solid #e5eaf2;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

/* ================= HERO ================= */

.hero {
  padding: 45px 20px 30px;
  text-align: center;
}

.hero h1 {
  margin: 0 0 12px;
  color: #172554;
  font-size: 32px;
  font-weight: 800;
}

.hero p {
  margin: 8px 0;
  color: #6b7280;
  font-size: 16px;
  line-height: 1.8;
}

.hero .login-user {
  margin-top: 15px;
  color: #2563eb;
}

/* ================= SEARCH ================= */

.search-card {
  margin-bottom: 25px;
}

.search-card label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 16px;
}

.search-card input {
  box-sizing: border-box;
  width: 100%;
  padding: 13px 15px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-card input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* ================= ASSET GRID ================= */

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

/* ================= MODAL OVERLAY ================= */

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 24px;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  animation: overlay-in 0.2s ease-out;
}

/* ================= MODAL ================= */

.borrow-modal {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
  animation: modal-in 0.25s ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-heading-icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border-radius: 16px;
  background: #dbeafe;
  font-size: 28px;
}

.close-button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  font-size: 28px;
  cursor: pointer;
  transition: background 0.2s;
}

.close-button:hover {
  background: #e2e8f0;
}

.modal-eyebrow {
  margin: 20px 0 6px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
}

.borrow-modal h2 {
  margin: 0 0 8px;
  color: #172554;
  font-size: 27px;
}

.modal-description {
  margin: 0 0 22px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.8;
}

/* ================= SELECTED ASSET ================= */

.selected-asset {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 18px;
  margin-bottom: 24px;
  border: 1px solid #dbeafe;
  border-radius: 15px;
  background: #f8faff;
}

.asset-icon {
  display: grid;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 12px;
  background: #e0eaff;
  font-size: 25px;
}

.asset-details {
  min-width: 0;
}

.asset-label {
  color: #64748b;
  font-size: 12px;
}

.asset-details h3 {
  margin: 5px 0 8px;
  color: #1e293b;
  font-size: 17px;
  overflow-wrap: anywhere;
}

.asset-details p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  overflow-wrap: anywhere;
}

/* ================= DATE FIELD ================= */

.date-field {
  margin-bottom: 20px;
}

.date-field label {
  display: block;
  margin-bottom: 9px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.date-field label span {
  color: #dc2626;
}

.date-field input {
  box-sizing: border-box;
  width: 100%;
  padding: 13px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 11px;
  background: #ffffff;
  color: #1e293b;
  font-size: 15px;
  outline: none;
}

.date-field input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.date-field small {
  display: block;
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}

/* ================= MESSAGES ================= */

.success,
.error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 14px;
  margin: 15px 0;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.success {
  background: #dcfce7;
  color: #15803d;
}

.error {
  background: #fee2e2;
  color: #b91c1c;
}

/* ================= MODAL BUTTONS ================= */

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.primary-button,
.secondary-button {
  flex: 1;
  min-height: 46px;
  padding: 12px 16px;
  border: none;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.primary-button {
  background: #2563eb;
  color: #ffffff;
}

.primary-button:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.secondary-button {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
}

.secondary-button:hover:not(:disabled) {
  background: #e2e8f0;
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-note {
  margin: 17px 0 0;
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
  line-height: 1.7;
}

/* ================= ANIMATIONS ================= */

@keyframes overlay-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ================= RESPONSIVE ================= */

@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .hero {
    padding-top: 30px;
  }

  .hero h1 {
    font-size: 25px;
  }

  .hero p {
    font-size: 14px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .modal-overlay {
    align-items: center;
    padding: 12px;
  }

  .borrow-modal {
    max-height: calc(100vh - 24px);
    padding: 22px;
    border-radius: 18px;
  }

  .borrow-modal h2 {
    font-size: 23px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-overlay,
  .borrow-modal {
    animation: none;
  }
}
</style>
