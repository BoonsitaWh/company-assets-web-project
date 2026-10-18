
<template>
  <div class="my-borrow-page">
    <header class="header">
      <div>
        <h1>รายการยืมของฉัน</h1>
        <p>ตรวจสอบสถานะการยืมและการคืนทรัพย์สิน</p>
      </div>
      <button class="refresh-btn" @click="loadAll" :disabled="loading">
        {{ loading ? 'กำลังโหลด...' : '🔄 รีเฟรช' }}
      </button>
    </header>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- การแจ้งเตือน -->
    <section class="notification-section">
      <div class="notification-title">
        <div>
          <h2>🔔 การแจ้งเตือน</h2>
          <p>ข่าวสารเกี่ยวกับรายการยืมและการคืนทรัพย์สิน</p>
        </div>
        <span v-if="unreadCount > 0" class="unread-count">
          {{ unreadCount }} รายการใหม่
        </span>
      </div>

      <div v-if="notifications.length === 0" class="notification-empty">
        ยังไม่มีการแจ้งเตือน
      </div>

      <div v-else class="notification-list">
        <div
          v-for="notification in notifications"
          :key="notification.NotificationID"
          class="notification-card"
          :class="{ unread: notification.Status !== 'Read' }"
        >
          <div class="notification-icon">
            {{ notification.Status === 'Read' ? '📨' : '🔔' }}
          </div>
          <div class="notification-content">
            <p>{{ notification.Message }}</p>
            <small>
              {{ formatDateTime(notification.CreatedAt || notification.CreatedDate) }}
            </small>
          </div>
          <button
            v-if="notification.Status !== 'Read'"
            class="read-btn"
            @click="markAsRead(notification.NotificationID)"
          >
            อ่านแล้ว
          </button>
        </div>
      </div>
    </section>

    <div v-if="loading" class="loading">กำลังโหลดข้อมูล...</div>

    <div v-else-if="rows.length === 0" class="card empty">
      <h3>ยังไม่มีรายการยืม</h3>
      <p>เมื่อคุณส่งคำขอยืม รายการจะแสดงที่หน้านี้</p>
    </div>

    <div v-else class="borrow-list">
      <article
        v-for="item in rows"
        :key="item.TransactionID"
        class="card borrow-card"
      >
        <div class="borrow-header">
          <div>
            <h3>{{ item.AssetName || 'ทรัพย์สิน' }}</h3>
            <p class="serial">Serial: {{ item.SerialNumber || '-' }}</p>
          </div>
          <span class="badge" :class="item.Status">
            {{ statusText(item.Status) }}
          </span>
        </div>

        <div class="details">
          <div>
            <strong>วันที่ยืม</strong>
            <span>{{ formatDate(item.BorrowDate) }}</span>
          </div>
          <div>
            <strong>กำหนดคืน</strong>
            <span>{{ formatDate(item.DueDate) }}</span>
          </div>
          <div>
            <strong>วันที่ขอคืน</strong>
            <span>{{ formatDate(item.ReturnRequestedDate) }}</span>
          </div>
          <div>
            <strong>วันที่รับคืน</strong>
            <span>{{ formatDate(item.ReturnDate) }}</span>
          </div>
        </div>

        <div v-if="item.Status === 'PendingApproval'" class="info pending">
          ⏳ รอ Admin อนุมัติคำขอยืม
        </div>

        <!-- เลือกรูปและส่งคำขอคืน -->
        <div v-else-if="item.Status === 'Borrowed'" class="return-box">
          <div class="info borrowed">📦 กำลังยืมทรัพย์สิน</div>

          <div class="proof-upload">
            <label :for="`proof-${item.TransactionID}`">
              📷 รูปหลักฐานการคืนทรัพย์สิน
            </label>
            <p class="help-text">
              เลือกรูปทรัพย์สินที่ต้องการคืนให้เห็นสภาพชัดเจน
              รองรับ JPG, PNG และ WEBP ขนาดไม่เกิน 5 MB
            </p>

            <input
              :id="`proof-${item.TransactionID}`"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              :disabled="returningId === item.TransactionID"
              @change="handleProofChange(item.TransactionID, $event)"
            />

            <div v-if="selectedProofs[item.TransactionID]" class="selected-proof">
              <span>📎 {{ selectedProofs[item.TransactionID].name }}</span>
              <button
                type="button"
                class="clear-proof-btn"
                :disabled="returningId === item.TransactionID"
                @click="clearProof(item.TransactionID)"
              >
                ลบรูป
              </button>
            </div>

            <img
              v-if="proofPreviews[item.TransactionID]"
              :src="proofPreviews[item.TransactionID]"
              alt="ตัวอย่างรูปหลักฐาน"
              class="proof-image preview-image"
            />
          </div>

          <button
            class="return-btn"
            :disabled="returningId === item.TransactionID || !selectedProofs[item.TransactionID]"
            @click="requestReturn(item)"
          >
            {{
              returningId === item.TransactionID
                ? 'กำลังส่งคำขอ...'
                : '🔄 ส่งคำขอคืนพร้อมหลักฐาน'
            }}
          </button>
        </div>

        <!-- รอ Admin อนุมัติการคืน -->
        <div v-else-if="item.Status === 'ReturnRequested'" class="info return-requested">
          <strong>⏳ รอ Admin อนุมัติการคืน</strong>
          <p>ระบบได้รับคำขอคืนแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบรูปหลักฐาน</p>

          <div v-if="item.ReturnProofPath" class="proof-display">
            <strong>รูปหลักฐานที่ส่ง</strong>
            <a :href="assetImageUrl(item.ReturnProofPath)" target="_blank" rel="noopener noreferrer">
              <img :src="assetImageUrl(item.ReturnProofPath)" alt="รูปหลักฐานการคืน" class="proof-image" />
            </a>
          </div>
        </div>

        <!-- คืนสำเร็จหลัง Admin อนุมัติ -->
        <div v-else-if="item.Status === 'Returned'" class="info returned">
          <div class="returned-title">✅ รับการคืนทรัพย์สินแล้ว</div>
          <p>เจ้าหน้าที่อนุมัติการคืนทรัพย์สินเรียบร้อยแล้ว</p>

          <div class="return-detail">
            <div>
              <strong>ทรัพย์สิน</strong>
              <span>{{ item.AssetName || '-' }}</span>
            </div>
            <div>
              <strong>Serial</strong>
              <span>{{ item.SerialNumber || '-' }}</span>
            </div>
            <div>
              <strong>วันที่รับคืน</strong>
              <span>{{ formatDate(item.ReturnDate) }}</span>
            </div>
            <div v-if="item.AdminName">
              <strong>ผู้อนุมัติ</strong>
              <span>{{ item.AdminName }}</span>
            </div>
          </div>

          <div v-if="item.ReturnProofPath" class="proof-display">
            <strong>รูปหลักฐานการคืน</strong>
            <a :href="assetImageUrl(item.ReturnProofPath)" target="_blank" rel="noopener noreferrer">
              <img :src="assetImageUrl(item.ReturnProofPath)" alt="รูปหลักฐานการคืน" class="proof-image" />
            </a>
          </div>
        </div>

        <div v-else-if="item.Status === 'Rejected'" class="info rejected">
          ❌ คำขอยืมถูกปฏิเสธ
        </div>

        <div v-else-if="item.Status === 'Late'" class="info late">
          ⚠️ รายการยืมนี้เกินกำหนดคืน กรุณาติดต่อเจ้าหน้าที่
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api from '../api'

const rows = ref([])
const notifications = ref([])
const loading = ref(false)
const error = ref('')
const returningId = ref(null)
const selectedProofs = ref({})
const proofPreviews = ref({})

const unreadCount = computed(() =>
  notifications.value.filter(item => item.Status !== 'Read').length
)

async function loadBorrow() {
  const response = await api.get('/borrow/my')
  const data = response.data?.data ?? response.data
  rows.value = Array.isArray(data) ? data : []
}

async function loadNotifications() {
  const response = await api.get('/notifications/my')
  const data = response.data?.data ?? response.data
  notifications.value = Array.isArray(data) ? data : []
}

async function loadAll() {
  try {
    loading.value = true
    error.value = ''
    await Promise.all([loadBorrow(), loadNotifications()])
  } catch (e) {
    console.error('Load my borrow error:', e)
    error.value = e.response?.data?.message || 'ไม่สามารถโหลดข้อมูลได้'
  } finally {
    loading.value = false
  }
}

function handleProofChange(transactionId, event) {
  const file = event.target.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    alert('กรุณาเลือกไฟล์ JPG, PNG หรือ WEBP')
    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('รูปหลักฐานต้องมีขนาดไม่เกิน 5 MB')
    event.target.value = ''
    return
  }

  releasePreview(transactionId)

  selectedProofs.value = {
    ...selectedProofs.value,
    [transactionId]: file
  }

  proofPreviews.value = {
    ...proofPreviews.value,
    [transactionId]: URL.createObjectURL(file)
  }
}

function releasePreview(transactionId) {
  const url = proofPreviews.value[transactionId]
  if (url) URL.revokeObjectURL(url)

  const updated = { ...proofPreviews.value }
  delete updated[transactionId]
  proofPreviews.value = updated
}

function clearProof(transactionId) {
  const updated = { ...selectedProofs.value }
  delete updated[transactionId]
  selectedProofs.value = updated
  releasePreview(transactionId)

  const input = document.getElementById(`proof-${transactionId}`)
  if (input) input.value = ''
}

async function requestReturn(item) {
  const transactionId = item?.TransactionID
  const proof = selectedProofs.value[transactionId]

  if (!transactionId) return

  if (!proof) {
    alert('กรุณาเลือกรูปหลักฐานการคืนก่อนส่งคำขอ')
    return
  }

  if (item.Status !== 'Borrowed') {
    alert('รายการนี้ไม่อยู่ในสถานะที่สามารถขอคืนได้')
    return
  }

  const confirmed = window.confirm(
    `ต้องการส่งคำขอคืน "${item.AssetName}" พร้อมรูปหลักฐานใช่หรือไม่?`
  )
  if (!confirmed) return

  try {
    returningId.value = transactionId
    error.value = ''

    const formData = new FormData()
    formData.append('returnProof', proof)

    await api.put(
      `/borrow/${transactionId}/request-return`,
      formData
    )

    clearProof(transactionId)
    alert('ส่งคำขอคืนพร้อมรูปหลักฐานเรียบร้อยแล้ว กรุณารอ Admin อนุมัติ')
    await loadAll()
  } catch (e) {
    console.error('Request return error:', e)
    alert(
      e.response?.data?.message ||
      'ส่งคำขอคืนไม่สำเร็จ กรุณาตรวจสอบ Backend และลองอีกครั้ง'
    )
  } finally {
    returningId.value = null
  }
}

async function markAsRead(notificationId) {
  try {
    await api.put(`/notifications/${notificationId}/read`)
    const item = notifications.value.find(
      notification => notification.NotificationID === notificationId
    )
    if (item) item.Status = 'Read'
  } catch (e) {
    console.error('Mark notification read error:', e)
    alert(e.response?.data?.message || 'ไม่สามารถอัปเดตการแจ้งเตือนได้')
  }
}

function statusText(status) {
  const map = {
    PendingApproval: 'รออนุมัติการยืม',
    Borrowed: 'กำลังยืม',
    ReturnRequested: 'รออนุมัติการคืน',
    Returned: 'คืนแล้ว',
    Rejected: 'ปฏิเสธ',
    Late: 'เกินกำหนดคืน'
  }
  return map[status] || status || '-'
}

function formatDate(value) {
  if (!value) return '-'

  const text = String(value)
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    ).toLocaleDateString('th-TH')
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? text
    : date.toLocaleDateString('th-TH')
}

function formatDateTime(value) {
  if (!value) return ''

  // รองรับ DATETIME จาก MySQL รูปแบบ YYYY-MM-DD HH:mm:ss
  const text = String(value)
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
  )

  if (match) {
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] || 0)
    )
    return date.toLocaleString('th-TH', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? text
    : date.toLocaleString('th-TH', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
}

function assetImageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  // หาก backend ไม่ได้ใช้พอร์ต 3000 ให้เปลี่ยน URL ให้ตรงกับ api.js
  return `http://localhost:3000${path.startsWith('/') ? '' : '/'}${path}`
}

onMounted(loadAll)

onBeforeUnmount(() => {
  Object.values(proofPreviews.value).forEach(url => URL.revokeObjectURL(url))
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.my-borrow-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px;
  color: #1f2937;
}

.header,
.notification-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.header {
  margin-bottom: 25px;
}

.header h1 {
  margin: 0;
}

.header p,
.notification-title p {
  margin-top: 5px;
  color: #6b7280;
}

button {
  font-family: inherit;
  cursor: pointer;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.refresh-btn,
.read-btn,
.return-btn,
.clear-proof-btn {
  border: none;
  border-radius: 8px;
  padding: 10px 15px;
  font-weight: 600;
}

.refresh-btn {
  background: #2563eb;
  color: white;
}

.card,
.notification-empty,
.notification-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
}

.card {
  padding: 20px;
  margin-bottom: 15px;
}

.notification-section {
  margin-bottom: 25px;
}

.notification-title {
  margin-bottom: 12px;
}

.notification-title h2 {
  margin: 0;
  font-size: 20px;
}

.notification-title p {
  font-size: 14px;
}

.unread-count {
  background: #ef4444;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.notification-card.unread {
  border-left: 4px solid #2563eb;
  background: #f5f8ff;
}

.notification-icon {
  font-size: 22px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-content p {
  margin: 0;
  overflow-wrap: anywhere;
}

.notification-content small {
  display: block;
  margin-top: 5px;
  color: #6b7280;
}

.read-btn {
  background: #e8f0ff;
  color: #2563eb;
}

.notification-empty {
  padding: 18px;
  text-align: center;
  color: #6b7280;
}

.borrow-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
}

.borrow-header h3 {
  margin: 0 0 5px;
}

.serial {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.details {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.details div,
.return-detail div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.details strong,
.return-detail strong {
  font-size: 13px;
  color: #6b7280;
}

.details span,
.return-detail span {
  overflow-wrap: anywhere;
}

.badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.badge.PendingApproval {
  background: #fff4d6;
  color: #8a5b00;
}

.badge.Borrowed {
  background: #e8f0ff;
  color: #1d4ed8;
}

.badge.ReturnRequested {
  background: #f3e8ff;
  color: #7e22ce;
}

.badge.Returned {
  background: #e8f7ed;
  color: #18733a;
}

.badge.Rejected {
  background: #fdeaea;
  color: #b00020;
}

.badge.Late {
  background: #ffedd5;
  color: #9a3412;
}

.info {
  margin-top: 20px;
  padding: 13px;
  border-radius: 8px;
}

.info.pending {
  background: #fff8e5;
}

.info.borrowed {
  margin-top: 0;
  background: #eef4ff;
}

.info.return-requested {
  background: #fff8e5;
  color: #8a5b00;
}

.info.return-requested p {
  margin: 7px 0 0;
  font-size: 14px;
}

.info.returned {
  background: #eaf8ef;
  color: #18733a;
}

.returned-title {
  font-weight: 700;
  font-size: 16px;
}

.info.returned p {
  margin: 7px 0 15px;
}

.return-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-top: 12px;
}

.info.rejected {
  background: #fdeeee;
  color: #b00020;
}

.info.late {
  background: #fff7ed;
  color: #9a3412;
}

.return-box {
  margin-top: 20px;
}

.proof-upload {
  margin-top: 15px;
  padding: 15px;
  border: 1px dashed #93a8ce;
  border-radius: 10px;
  background: #f8faff;
}

.proof-upload label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
}

.proof-upload input {
  display: block;
  width: 100%;
  margin-top: 12px;
}

.help-text {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.selected-proof {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  overflow-wrap: anywhere;
}

.clear-proof-btn {
  background: #fee2e2;
  color: #b91c1c;
}

.return-btn {
  width: 100%;
  margin-top: 12px;
  background: #2563eb;
  color: white;
  padding: 13px 18px;
  font-size: 15px;
}

.return-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.proof-display {
  margin-top: 15px;
}

.proof-display strong {
  display: block;
  margin-bottom: 8px;
}

.proof-image {
  display: block;
  width: 180px;
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
  padding: 4px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  background: white;
}

.preview-image {
  margin-top: 12px;
}

.error {
  background: #fdeaea;
  color: #b00020;
  padding: 12px 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.loading,
.empty {
  text-align: center;
  padding: 40px;
}

.empty p {
  color: #6b7280;
}

@media (max-width: 700px) {
  .my-borrow-page {
    padding: 15px;
  }

  .header {
    align-items: flex-start;
    flex-direction: column;
  }

  .details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .borrow-header {
    flex-direction: column;
  }

  .notification-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .return-detail {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .details {
    grid-template-columns: 1fr;
  }
}
</style>
