
<template>
  <div class="admin-page">
    <header class="admin-header">
      <div>
        <h1>ระบบจัดการ Admin</h1>
        <p>จัดการทรัพย์สินและรายการยืมคืนของบริษัท</p>
      </div>
      <button class="refresh-btn" @click="loadAll" :disabled="loading">
        {{ loading ? '⏳ กำลังโหลด...' : '🔄 รีเฟรช' }}
      </button>
    </header>

    <!-- DASHBOARD -->
    <section class="dashboard">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div><span>ทรัพย์สินทั้งหมด</span><strong>{{ stats.totalAssets }}</strong></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div><span>พร้อมใช้งาน</span><strong>{{ stats.availableAssets }}</strong></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📤</div>
        <div><span>กำลังถูกยืม</span><strong>{{ stats.borrowedAssets }}</strong></div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">⏳</div>
        <div><span>รออนุมัติยืม</span><strong>{{ stats.pendingBorrow }}</strong></div>
      </div>
      <div class="stat-card return-warning">
        <div class="stat-icon">🔄</div>
        <div><span>รออนุมัติคืน</span><strong>{{ returnRequestedCount }}</strong></div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">📥</div>
        <div><span>คืนแล้ว</span><strong>{{ stats.returned }}</strong></div>
      </div>
    </section>

    <!-- ASSET MANAGEMENT -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>จัดการทรัพย์สิน</h2>
          <p>เพิ่ม แก้ไข และลบทรัพย์สินของบริษัท</p>
        </div>
        <button class="primary-btn" @click="openAssetForm()" :disabled="savingAsset">
          ➕ เพิ่มทรัพย์สิน
        </button>
      </div>

      <div v-if="showAssetForm" class="asset-form">
        <h3>{{ editingAsset ? '✏️ แก้ไขทรัพย์สิน' : '➕ เพิ่มทรัพย์สิน' }}</h3>

        <div class="form-grid">
          <div class="form-group">
            <label>ชื่อทรัพย์สิน *</label>
            <input v-model="assetForm.AssetName" type="text" placeholder="เช่น Notebook Dell" />
          </div>

          <div class="form-group">
            <label>Serial Number</label>
            <input v-model="assetForm.SerialNumber" type="text" placeholder="กรอก Serial Number ถ้ามี" />
            <small>ถ้าเป็นทรัพย์สินหลายชิ้นชนิดเดียวกัน สามารถเว้นว่างได้</small>
          </div>

          <div class="form-group">
            <label>หมวดหมู่ *</label>
            <select v-model="assetForm.CategoryID">
              <option value="">เลือกหมวดหมู่</option>
              <option v-for="category in categories" :key="category.CategoryID" :value="category.CategoryID">
                {{ category.CategoryName }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>สถานะ</label>
            <select v-model="assetForm.Status">
              <option value="Available">Available - พร้อมใช้งาน</option>
              <option value="Borrowed">Borrowed - กำลังถูกยืม</option>
              <option value="Maintenance">Maintenance - ซ่อมบำรุง</option>
            </select>
            <small>ระบบยืมคืนอาจคำนวณสถานะใหม่ตามจำนวนคงเหลือ</small>
          </div>

          <div class="form-group">
            <label>จำนวนทรัพย์สินทั้งหมด *</label>
            <input v-model.number="assetForm.TotalQuantity" type="number" min="1" step="1" placeholder="เช่น 10" />
            <small>ตัวอย่าง Notebook 10 เครื่อง ให้กรอก 10</small>
          </div>

          <div class="form-group">
            <label>รูปภาพทรัพย์สิน</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              @change="handleImageChange"
            />
            <small>รองรับ JPG, PNG, WEBP, GIF ขนาดไม่เกิน 5 MB</small>
          </div>

          <div v-if="imagePreview" class="form-group image-preview-group">
            <label>ตัวอย่างรูปภาพ</label>
            <img :src="imagePreview" alt="ตัวอย่างรูปทรัพย์สิน" class="image-preview" />
            <button type="button" class="cancel-btn" @click="clearSelectedImage">
              ล้างรูปที่เลือก
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button class="primary-btn" @click="saveAsset" :disabled="savingAsset">
            {{ savingAsset ? '⏳ กำลังบันทึก...' : '💾 บันทึก' }}
          </button>
          <button class="cancel-btn" @click="closeAssetForm" :disabled="savingAsset">
            ยกเลิก
          </button>
        </div>
      </div>

      <!-- ASSET TABLE -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>รูปภาพ</th>
              <th>ชื่อทรัพย์สิน</th>
              <th>Serial Number</th>
              <th>หมวดหมู่</th>
              <th>จำนวนทั้งหมด</th>
              <th>กำลังยืม</th>
              <th>คงเหลือ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in assets" :key="asset.AssetID">
              <td>{{ asset.AssetID }}</td>
              <td>
                <img
                  v-if="asset.ImagePath"
                  :src="assetImageUrl(asset.ImagePath)"
                  :alt="asset.AssetName"
                  class="asset-thumbnail"
                />
                <span v-else class="no-image">ไม่มีรูป</span>
              </td>
              <td><strong>{{ asset.AssetName }}</strong></td>
              <td>{{ asset.SerialNumber || '-' }}</td>
              <td>{{ asset.CategoryName || asset.CategoryID || '-' }}</td>
              <td>{{ asset.TotalQuantity ?? 1 }}</td>
              <td>{{ asset.BorrowedQuantity ?? 0 }}</td>
              <td>{{ asset.AvailableQuantity ?? asset.TotalQuantity ?? 1 }}</td>
              <td>
                <span class="status" :class="asset.Status">
                  {{ assetStatusText(asset.Status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="edit-btn" @click="openAssetForm(asset)" :disabled="savingAsset">
                    ✏️ แก้ไข
                  </button>
                  <button class="delete-btn" @click="deleteAsset(asset.AssetID)" :disabled="deletingAssetIds.includes(asset.AssetID)">
                    {{ deletingAssetIds.includes(asset.AssetID) ? 'กำลังลบ...' : '🗑️ ลบ' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="assets.length === 0">
              <td colspan="10" class="empty">ไม่พบข้อมูลทรัพย์สิน</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- BORROW / RETURN MANAGEMENT -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>รายการยืม - คืนทรัพย์สิน</h2>
          <p>ตรวจสอบข้อมูลพนักงาน คำขอยืม และหลักฐานการคืน</p>
        </div>
      </div>

      <div v-if="returnRequestedCount > 0" class="return-alert">
        🔔 มีคำขอคืนทรัพย์สิน
        <strong>{{ returnRequestedCount }}</strong>
        รายการ รอการอนุมัติจาก Admin
      </div>

      <div class="table-wrapper">
        <table class="borrow-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>ชื่อพนักงาน</th>
              <th>แผนก</th>
              <th>เบอร์โทรศัพท์</th>
              <th>อีเมล</th>
              <th>ทรัพย์สิน</th>
              <th>Serial Number</th>
              <th>วันที่ยืม</th>
              <th>กำหนดคืน</th>
              <th>วันที่คืน</th>
              <th>หลักฐานการคืน</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in borrows" :key="item.TransactionID">
              <td>{{ item.TransactionID }}</td>
              <td>{{ item.EmployeeName || item.Name || '-' }}</td>
              <td>{{ item.DepartmentName || item.Department || '-' }}</td>
              <td>{{ item.EmployeePhone || item.Phone || item.PhoneNumber || '-' }}</td>
              <td>{{ item.EmployeeEmail || item.Email || '-' }}</td>
              <td>{{ item.AssetName || '-' }}</td>
              <td>{{ item.SerialNumber || '-' }}</td>
              <td>{{ formatDate(item.BorrowDate) }}</td>
              <td>{{ formatDate(item.DueDate) }}</td>
              <td>{{ formatDate(item.ReturnDate) }}</td>

              <td>
                <a
                  v-if="item.ReturnProofPath"
                  :href="assetImageUrl(item.ReturnProofPath)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="proof-link"
                >
                  <img
                    :src="assetImageUrl(item.ReturnProofPath)"
                    alt="หลักฐานการคืน"
                    class="proof-thumbnail"
                  />
                  <span>🔍 ดูหลักฐาน</span>
                </a>
                <span v-else class="no-image">ยังไม่มีหลักฐาน</span>
              </td>

              <td>
                <span class="status" :class="item.Status">
                  {{ borrowStatusText(item.Status) }}
                </span>
              </td>

              <td>
                <div class="borrow-actions">
                  <template v-if="item.Status === 'PendingApproval'">
                    <button
                      class="approve-btn"
                      @click="approveBorrow(item.TransactionID)"
                      :disabled="processingBorrowIds.includes(item.TransactionID)"
                    >
                      {{ processingBorrowIds.includes(item.TransactionID) ? 'กำลังดำเนินการ...' : '✅ อนุมัติยืม' }}
                    </button>
                    <button
                      class="reject-btn"
                      @click="rejectBorrow(item.TransactionID)"
                      :disabled="processingBorrowIds.includes(item.TransactionID)"
                    >
                      ❌ ปฏิเสธ
                    </button>
                  </template>

                  <template v-else-if="item.Status === 'Borrowed'">
                    <span class="waiting-text">⏳ รอผู้ยืมกดขอคืน</span>
                  </template>

                  <template v-else-if="item.Status === 'ReturnRequested'">
                    <button
                      class="approve-return-btn"
                      @click="approveReturn(item)"
                      :disabled="processingReturnIds.includes(item.TransactionID)"
                    >
                      {{ processingReturnIds.includes(item.TransactionID) ? '⏳ กำลังอนุมัติ...' : '✅ อนุมัติการคืนสำเร็จ' }}
                    </button>
                  </template>

                  <template v-else-if="item.Status === 'Returned'">
                    <span class="returned-text">✅ คืนเรียบร้อยแล้ว</span>
                  </template>

                  <template v-else-if="item.Status === 'Rejected'">
                    <span class="rejected-text">❌ รายการถูกปฏิเสธ</span>
                  </template>

                  <template v-else>
                    <span>-</span>
                  </template>
                </div>
              </td>
            </tr>

            <tr v-if="borrows.length === 0">
              <td colspan="13" class="empty">ไม่พบรายการยืมคืน</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api from '../api'

const assets = ref([])
const categories = ref([])
const borrows = ref([])

const loading = ref(false)
const savingAsset = ref(false)
const processingBorrowIds = ref([])
const processingReturnIds = ref([])
const deletingAssetIds = ref([])

const stats = ref({
  totalAssets: 0,
  availableAssets: 0,
  borrowedAssets: 0,
  pendingBorrow: 0,
  returned: 0
})

const showAssetForm = ref(false)
const editingAsset = ref(null)
const selectedImage = ref(null)
const imagePreview = ref('')
let previewObjectUrl = null

const assetForm = ref({
  AssetName: '',
  SerialNumber: '',
  CategoryID: '',
  Status: 'Available',
  TotalQuantity: 1
})

const returnRequestedCount = computed(() =>
  borrows.value.filter(item => item.Status === 'ReturnRequested').length
)

async function loadAll() {
  if (loading.value) return

  loading.value = true
  try {
    await Promise.all([
      loadStats(),
      loadAssets(),
      loadCategories(),
      loadBorrows()
    ])
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const response = await api.get('/admin/stats')
    const data = response.data?.data ?? response.data ?? {}

    stats.value = {
      totalAssets: data.totalAssets ?? data.total ?? 0,
      availableAssets: data.availableAssets ?? data.available ?? 0,
      borrowedAssets: data.borrowedAssets ?? data.borrowed ?? 0,
      pendingBorrow: data.pendingBorrow ?? data.pending ?? 0,
      returned: data.returned ?? 0
    }
  } catch (error) {
    console.error('Load stats error:', error)
  }
}

async function loadAssets() {
  try {
    const response = await api.get('/assets')
    const data = response.data?.data ?? response.data
    assets.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Load assets error:', error)
    assets.value = []
  }
}

async function loadCategories() {
  try {
    const response = await api.get('/assets/categories')
    const data = response.data?.data ?? response.data
    categories.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Load categories error:', error)
    categories.value = []
  }
}

async function loadBorrows() {
  try {
    const response = await api.get('/borrow')
    const data = response.data?.data ?? response.data
    borrows.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Load borrow error:', error)
    borrows.value = []
  }
}

function releasePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
}

function openAssetForm(asset = null) {
  editingAsset.value = asset
  selectedImage.value = null
  releasePreviewUrl()

  if (asset) {
    assetForm.value = {
      AssetName: asset.AssetName || '',
      SerialNumber: asset.SerialNumber || '',
      CategoryID: asset.CategoryID ?? '',
      Status: asset.Status || 'Available',
      TotalQuantity: Number(asset.TotalQuantity ?? 1)
    }

    imagePreview.value = asset.ImagePath
      ? assetImageUrl(asset.ImagePath)
      : ''
  } else {
    assetForm.value = {
      AssetName: '',
      SerialNumber: '',
      CategoryID: '',
      Status: 'Available',
      TotalQuantity: 1
    }
    imagePreview.value = ''
  }

  showAssetForm.value = true
}

function handleImageChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]

  if (!allowedTypes.includes(file.type)) {
    alert('กรุณาเลือกไฟล์ JPG, PNG, WEBP หรือ GIF')
    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB')
    event.target.value = ''
    return
  }

  releasePreviewUrl()
  selectedImage.value = file
  previewObjectUrl = URL.createObjectURL(file)
  imagePreview.value = previewObjectUrl
}

function clearSelectedImage() {
  selectedImage.value = null
  releasePreviewUrl()

  imagePreview.value = editingAsset.value?.ImagePath
    ? assetImageUrl(editingAsset.value.ImagePath)
    : ''

  const fileInput = document.querySelector('.asset-form input[type="file"]')
  if (fileInput) fileInput.value = ''
}

function assetImageUrl(imagePath) {
  if (!imagePath) return ''
  if (/^https?:\/\//i.test(imagePath)) return imagePath

  return `http://localhost:3000${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
}

function closeAssetForm() {
  if (savingAsset.value) return

  showAssetForm.value = false
  editingAsset.value = null
  selectedImage.value = null
  imagePreview.value = ''
  releasePreviewUrl()
}

async function saveAsset() {
  if (savingAsset.value) return

  if (!assetForm.value.AssetName.trim()) {
    alert('กรุณากรอกชื่อทรัพย์สิน')
    return
  }

  if (!assetForm.value.CategoryID) {
    alert('กรุณาเลือกหมวดหมู่ทรัพย์สิน')
    return
  }

  const quantity = Number(assetForm.value.TotalQuantity)
  if (!Number.isInteger(quantity) || quantity < 1) {
    alert('จำนวนทรัพย์สินต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป')
    return
  }

  savingAsset.value = true

  try {
    const formData = new FormData()
    formData.append('AssetName', assetForm.value.AssetName.trim())
    formData.append('SerialNumber', assetForm.value.SerialNumber.trim())
    formData.append('CategoryID', String(assetForm.value.CategoryID))
    formData.append('Status', assetForm.value.Status)
    formData.append('TotalQuantity', String(quantity))

    if (selectedImage.value) {
      formData.append('image', selectedImage.value)
    }

    if (editingAsset.value) {
      await api.put(`/assets/${editingAsset.value.AssetID}`, formData)
      alert('แก้ไขทรัพย์สินเรียบร้อยแล้ว')
    } else {
      await api.post('/assets', formData)
      alert('เพิ่มทรัพย์สินเรียบร้อยแล้ว')
    }

    showAssetForm.value = false
    editingAsset.value = null
    selectedImage.value = null
    imagePreview.value = ''
    releasePreviewUrl()

    await loadAll()
  } catch (error) {
    console.error('Save asset error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถบันทึกทรัพย์สินได้')
  } finally {
    savingAsset.value = false
  }
}

async function deleteAsset(assetId) {
  if (deletingAssetIds.value.includes(assetId)) return
  if (!confirm('คุณต้องการลบทรัพย์สินรายการนี้หรือไม่?')) return

  deletingAssetIds.value.push(assetId)

  try {
    await api.delete(`/assets/${assetId}`)
    alert('ลบทรัพย์สินเรียบร้อยแล้ว')
    await loadAll()
  } catch (error) {
    console.error('Delete asset error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถลบทรัพย์สินได้')
  } finally {
    deletingAssetIds.value = deletingAssetIds.value.filter(id => id !== assetId)
  }
}

async function approveBorrow(transactionId) {
  if (processingBorrowIds.value.includes(transactionId)) return
  if (!confirm('ยืนยันการอนุมัติการยืมทรัพย์สินรายการนี้หรือไม่?')) return

  processingBorrowIds.value.push(transactionId)

  try {
    await api.put(`/borrow/${transactionId}/approve`)
    alert('อนุมัติการยืมเรียบร้อยแล้ว')
    await loadAll()
  } catch (error) {
    console.error('Approve borrow error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถอนุมัติการยืมได้')
  } finally {
    processingBorrowIds.value = processingBorrowIds.value.filter(id => id !== transactionId)
  }
}

async function rejectBorrow(transactionId) {
  if (processingBorrowIds.value.includes(transactionId)) return
  if (!confirm('ยืนยันการปฏิเสธคำขอยืมรายการนี้หรือไม่?')) return

  processingBorrowIds.value.push(transactionId)

  try {
    await api.put(`/borrow/${transactionId}/reject`)
    alert('ปฏิเสธคำขอยืมเรียบร้อยแล้ว')
    await loadAll()
  } catch (error) {
    console.error('Reject borrow error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถปฏิเสธการยืมได้')
  } finally {
    processingBorrowIds.value = processingBorrowIds.value.filter(id => id !== transactionId)
  }
}

async function approveReturn(item) {
  const transactionId = item.TransactionID

  if (processingReturnIds.value.includes(transactionId)) return

  if (!item.ReturnProofPath) {
    alert('ไม่พบรูปหลักฐานการคืน กรุณาตรวจสอบก่อนอนุมัติ')
    return
  }

  const confirmed = confirm(
    `ยืนยันการคืนทรัพย์สินรายการนี้หรือไม่?\n\n` +
    `พนักงาน: ${item.EmployeeName || item.Name || '-'}\n` +
    `แผนก: ${item.DepartmentName || item.Department || '-'}\n` +
    `ทรัพย์สิน: ${item.AssetName || '-'}\n` +
    `Serial Number: ${item.SerialNumber || '-'}\n\n` +
    `เมื่ออนุมัติ สถานะจะเปลี่ยนเป็น "คืนแล้ว" ` +
    `และระบบจะคำนวณสต็อกใหม่`
  )

  if (!confirmed) return

  processingReturnIds.value.push(transactionId)

  try {
    await api.put(`/borrow/${transactionId}/approve-return`)
    alert('อนุมัติการคืนสำเร็จ')
    await loadAll()
  } catch (error) {
    console.error('Approve return error:', error)
    alert(error.response?.data?.message || 'ไม่สามารถอนุมัติการคืนได้')
  } finally {
    processingReturnIds.value = processingReturnIds.value.filter(id => id !== transactionId)
  }
}

function formatDate(date) {
  if (!date) return '-'

  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return String(date)

  return parsedDate.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function assetStatusText(status) {
  const map = {
    Available: 'พร้อมใช้งาน',
    Borrowed: 'กำลังถูกยืม',
    Maintenance: 'ซ่อมบำรุง'
  }

  return map[status] || status || '-'
}

function borrowStatusText(status) {
  const map = {
    PendingApproval: 'รออนุมัติการยืม',
    Borrowed: 'กำลังยืม',
    ReturnRequested: 'รออนุมัติการคืน',
    Returned: 'คืนแล้ว',
    Rejected: 'ปฏิเสธ'
  }

  return map[status] || status || '-'
}

onMounted(loadAll)
onBeforeUnmount(releasePreviewUrl)
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.admin-page {
  min-height: 100vh;
  padding: 30px;
  background: #f5f7fb;
  color: #1f2937;
}

.admin-header,
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.admin-header {
  margin-bottom: 30px;
}

.admin-header h1 {
  margin: 0 0 8px;
  font-size: 30px;
}

.admin-header p,
.panel-header p {
  margin: 0;
  color: #6b7280;
}

button {
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: 0.2s;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.refresh-btn,
.primary-btn,
.cancel-btn,
.edit-btn,
.delete-btn,
.approve-btn,
.reject-btn,
.approve-return-btn {
  padding: 10px 14px;
  border-radius: 9px;
  font-weight: 600;
}

.refresh-btn {
  background: #111827;
  color: white;
}

.primary-btn {
  background: #2563eb;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.cancel-btn {
  background: #e5e7eb;
  color: #374151;
}

.edit-btn {
  background: #dbeafe;
  color: #1d4ed8;
}

.delete-btn,
.reject-btn {
  background: #fee2e2;
  color: #dc2626;
}

.approve-btn {
  background: #dcfce7;
  color: #15803d;
}

.approve-return-btn {
  background: #16a34a;
  color: white;
  min-width: 175px;
}

.approve-return-btn:hover:not(:disabled) {
  background: #15803d;
}

.dashboard {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.stat-card {
  min-width: 0;
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  font-size: 30px;
}

.stat-card span {
  display: block;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 5px;
}

.stat-card strong {
  display: block;
  font-size: 25px;
}

.stat-card.warning {
  border-left: 5px solid #f59e0b;
}

.stat-card.return-warning {
  border-left: 5px solid #7c3aed;
}

.stat-card.success {
  border-left: 5px solid #16a34a;
}

.panel {
  background: white;
  border-radius: 18px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
}

.panel-header {
  margin-bottom: 20px;
}

.panel-header h2 {
  margin: 0 0 6px;
}

.asset-form {
  background: #f9fafb;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 20px;
}

.asset-form h3 {
  margin-top: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 7px;
  font-weight: 600;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 11px 13px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  outline: none;
  background: white;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #2563eb;
}

.form-group small {
  display: block;
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
}

.image-preview-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.image-preview {
  width: 180px;
  height: 130px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: white;
  padding: 5px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1250px;
  border-collapse: collapse;
}

.borrow-table {
  min-width: 1800px;
}

th,
td {
  padding: 13px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

th {
  background: #f9fafb;
  font-size: 13px;
  color: #4b5563;
}

td {
  font-size: 14px;
}

.asset-thumbnail {
  width: 58px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.proof-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}

.proof-link:hover {
  text-decoration: underline;
}

.proof-thumbnail {
  width: 65px;
  height: 50px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
}

.no-image {
  color: #9ca3af;
  font-size: 12px;
}

.status {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status.Available,
.status.Returned {
  background: #dcfce7;
  color: #15803d;
}

.status.Borrowed {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.Maintenance,
.status.PendingApproval {
  background: #fef3c7;
  color: #92400e;
}

.status.ReturnRequested {
  background: #f3e8ff;
  color: #7e22ce;
}

.status.Rejected {
  background: #fee2e2;
  color: #dc2626;
}

.action-buttons,
.borrow-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.borrow-actions {
  flex-wrap: wrap;
  min-width: 175px;
}

.return-alert {
  background: #f3e8ff;
  color: #6b21a8;
  border: 1px solid #d8b4fe;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 20px;
}

.waiting-text {
  color: #6b7280;
  font-size: 13px;
}

.returned-text {
  color: #15803d;
  font-weight: 600;
  font-size: 13px;
}

.rejected-text {
  color: #dc2626;
  font-weight: 600;
  font-size: 13px;
}

.empty {
  text-align: center;
  padding: 30px;
  color: #9ca3af;
}

@media (max-width: 1400px) {
  .dashboard {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .admin-page {
    padding: 15px;
  }

  .admin-header,
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 16px;
  }
}

@media (max-width: 500px) {
  .dashboard {
    grid-template-columns: 1fr;
  }

  .admin-header h1 {
    font-size: 24px;
  }

  .form-actions {
    flex-wrap: wrap;
  }
}
</style>
