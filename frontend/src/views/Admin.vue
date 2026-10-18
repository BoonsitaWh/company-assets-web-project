
<template>
  <div class="admin-page">
    <header class="admin-header">
      <div>
        <h1>ระบบจัดการ Admin</h1>
        <p>จัดการทรัพย์สิน พนักงาน และรายการยืมคืนของบริษัท</p>
      </div>
      <button class="refresh-btn" @click="loadAll" :disabled="loading">
        {{ loading ? 'กำลังโหลด...' : '🔄 รีเฟรช' }}
      </button>
    </header>

    <!-- DASHBOARD -->
    <section class="dashboard">
      <div class="stat-card">
        <span>📦 ทรัพย์สินทั้งหมด</span>
        <strong>{{ stats.totalAssets }}</strong>
      </div>
      <div class="stat-card">
        <span>✅ พร้อมใช้งาน</span>
        <strong>{{ stats.availableAssets }}</strong>
      </div>
      <div class="stat-card">
        <span>📤 กำลังถูกยืม</span>
        <strong>{{ stats.borrowedAssets }}</strong>
      </div>
      <div class="stat-card warning">
        <span>⏳ รออนุมัติยืม</span>
        <strong>{{ stats.pendingBorrow }}</strong>
      </div>
      <div class="stat-card warning">
        <span>🔄 รออนุมัติคืน</span>
        <strong>{{ returnRequestedCount }}</strong>
      </div>
      <div class="stat-card success">
        <span>📥 คืนแล้ว</span>
        <strong>{{ stats.returned }}</strong>
      </div>
    </section>

    <!-- EMPLOYEE MANAGEMENT -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>👥 จัดการข้อมูลพนักงาน</h2>
          <p>แก้ไขชื่อ อีเมล เบอร์โทรศัพท์ และแผนก</p>
        </div>
        <button class="refresh-btn" @click="loadEmployees" :disabled="loadingEmployees">
          {{ loadingEmployees ? 'กำลังโหลด...' : 'โหลดรายชื่อใหม่' }}
        </button>
      </div>

      <div v-if="employeeMessage" class="message">
        {{ employeeMessage }}
      </div>

      <div v-if="showEmployeeForm" class="edit-form">
        <h3>✏️ แก้ไขข้อมูลพนักงาน #{{ employeeForm.EmployeeID }}</h3>

        <form @submit.prevent="saveEmployee">
          <div class="form-grid">
            <div class="form-group">
              <label>ชื่อพนักงาน *</label>
              <input v-model.trim="employeeForm.Name" maxlength="100" required />
            </div>

            <div class="form-group">
              <label>อีเมล *</label>
              <input v-model.trim="employeeForm.Email" type="email" maxlength="100" required />
            </div>

            <div class="form-group">
              <label>เบอร์โทรศัพท์</label>
              <input v-model.trim="employeeForm.Phone" maxlength="20" />
            </div>

            <div class="form-group">
              <label>แผนก *</label>
              <select v-model="employeeForm.DepartmentID" required>
                <option value="">เลือกแผนก</option>
                <option
                  v-for="department in departments"
                  :key="department.DepartmentID"
                  :value="Number(department.DepartmentID)"
                >
                  {{ department.DepartmentName }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button class="primary-btn" type="submit" :disabled="savingEmployee">
              {{ savingEmployee ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูลพนักงาน' }}
            </button>
            <button class="cancel-btn" type="button" @click="closeEmployeeForm" :disabled="savingEmployee">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ชื่อพนักงาน</th>
              <th>อีเมล</th>
              <th>เบอร์โทรศัพท์</th>
              <th>แผนก</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="employee in employees" :key="employee.EmployeeID">
              <td>{{ employee.EmployeeID }}</td>
              <td>{{ employee.Name }}</td>
              <td>{{ employee.Email }}</td>
              <td>{{ employee.Phone || '-' }}</td>
              <td>{{ employee.DepartmentName || '-' }}</td>
              <td>
                <button class="edit-btn" @click="openEmployeeForm(employee)">✏️ แก้ไข</button>
              </td>
            </tr>
            <tr v-if="!loadingEmployees && employees.length === 0">
              <td colspan="6" class="empty">ไม่พบข้อมูลพนักงาน</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ASSET MANAGEMENT -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>📦 จัดการทรัพย์สิน</h2>
          <p>เพิ่ม แก้ไข และลบทรัพย์สินของบริษัท</p>
        </div>
        <button class="primary-btn" @click="openAssetForm()" :disabled="savingAsset">
          ➕ เพิ่มทรัพย์สิน
        </button>
      </div>

      <div v-if="showAssetForm" class="edit-form">
        <h3>{{ editingAsset ? '✏️ แก้ไขทรัพย์สิน' : '➕ เพิ่มทรัพย์สิน' }}</h3>

        <form @submit.prevent="saveAsset">
          <div class="form-grid">
            <div class="form-group">
              <label>ชื่อทรัพย์สิน *</label>
              <input v-model.trim="assetForm.AssetName" maxlength="100" required />
            </div>

            <div class="form-group">
              <label>Serial Number</label>
              <input v-model.trim="assetForm.SerialNumber" maxlength="50" />
            </div>

            <div class="form-group">
              <label>หมวดหมู่ *</label>
              <select v-model="assetForm.CategoryID" required>
                <option value="">เลือกหมวดหมู่</option>
                <option
                  v-for="category in categories"
                  :key="category.CategoryID"
                  :value="Number(category.CategoryID)"
                >
                  {{ category.CategoryName }}
                </option>
                <option value="__other__">➕ อื่น ๆ — ระบุหมวดหมู่ใหม่</option>
              </select>
            </div>

            <div v-if="assetForm.CategoryID === '__other__'" class="form-group">
              <label>ชื่อหมวดหมู่ใหม่ *</label>
              <input
                v-model.trim="newCategoryName"
                maxlength="100"
                placeholder="เช่น อุปกรณ์สำนักงาน"
                required
              />
              <small>หากชื่อหมวดหมู่มีอยู่แล้ว ระบบจะใช้หมวดหมู่เดิม</small>
            </div>

            <div class="form-group full-width">
              <label>รายละเอียด / แหล่งที่มา</label>
              <textarea
                v-model.trim="assetForm.Details"
                maxlength="1000"
                rows="4"
                placeholder="เช่น ซื้อจากร้าน ABC, รับมาจากแผนก IT หรือรายละเอียดเพิ่มเติม"
              ></textarea>
              <small>ระบุรายละเอียดหรือแหล่งที่มาของทรัพย์สินได้ไม่เกิน 1,000 ตัวอักษร</small>
            </div>

            <div class="form-group">
              <label>สถานะ</label>
              <select v-model="assetForm.Status">
                <option value="Available">Available - พร้อมใช้งาน</option>
                <option value="Borrowed">Borrowed - กำลังถูกยืม</option>
                <option value="Broken">Broken - ชำรุด</option>
              </select>
              <small>ตัวเลือกสถานะต้องตรงกับ enum ในฐานข้อมูล</small>
            </div>

            <div class="form-group">
              <label>จำนวนทั้งหมด *</label>
              <input v-model.number="assetForm.TotalQuantity" type="number" min="1" step="1" required />
            </div>

            <div class="form-group">
              <label>รูปภาพ</label>
              <input
                ref="imageInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                @change="handleImageChange"
              />
              <small>รองรับ JPG, PNG, WEBP, GIF ขนาดไม่เกิน 5 MB</small>
            </div>

            <div v-if="imagePreview" class="form-group">
              <label>ตัวอย่างรูปภาพ</label>
              <img :src="imagePreview" class="image-preview" alt="ตัวอย่างรูปทรัพย์สิน" />
              <button type="button" class="cancel-btn" @click="clearSelectedImage">
                ล้างรูปที่เลือก
              </button>
            </div>
          </div>

          <div class="form-actions">
            <button class="primary-btn" type="submit" :disabled="savingAsset">
              {{ savingAsset ? 'กำลังบันทึก...' : '💾 บันทึกทรัพย์สิน' }}
            </button>
            <button class="cancel-btn" type="button" @click="closeAssetForm" :disabled="savingAsset">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>

      <!-- ASSET TABLE -->
      <div class="table-wrapper">
        <table class="asset-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>รูปภาพ</th>
              <th>ชื่อทรัพย์สิน</th>
              <th>Serial Number</th>
              <th>หมวดหมู่</th>
              <th>รายละเอียด / แหล่งที่มา</th>
              <th>ทั้งหมด</th>
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
                  class="asset-thumbnail"
                  :alt="asset.AssetName"
                />
                <span v-else>-</span>
              </td>
              <td>{{ asset.AssetName }}</td>
              <td>{{ asset.SerialNumber || '-' }}</td>
              <td>{{ asset.CategoryName || asset.CategoryID || '-' }}</td>
              <td class="details-cell">{{ asset.Details || '-' }}</td>
              <td>{{ asset.TotalQuantity ?? 1 }}</td>
              <td>{{ asset.BorrowedQuantity ?? 0 }}</td>
              <td>{{ asset.AvailableQuantity ?? asset.TotalQuantity ?? 1 }}</td>
              <td>{{ assetStatusText(asset.Status) }}</td>
              <td>
                <button class="edit-btn" @click="openAssetForm(asset)">แก้ไข</button>
                <button
                  class="delete-btn"
                  @click="deleteAsset(asset.AssetID)"
                  :disabled="isDeleting(asset.AssetID)"
                >
                  {{ isDeleting(asset.AssetID) ? 'กำลังลบ...' : 'ลบ' }}
                </button>
              </td>
            </tr>
            <tr v-if="!loading && assets.length === 0">
              <td colspan="11" class="empty">ไม่พบข้อมูลทรัพย์สิน</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- BORROW / RETURN MANAGEMENT -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>🔄 รายการยืม - คืนทรัพย์สิน</h2>
          <p>ตรวจสอบคำขอยืมและหลักฐานการคืน</p>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="borrow-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>พนักงาน</th>
              <th>แผนก</th>
              <th>เบอร์โทร</th>
              <th>อีเมล</th>
              <th>ทรัพย์สิน</th>
              <th>Serial</th>
              <th>วันที่ยืม</th>
              <th>กำหนดคืน</th>
              <th>วันที่คืน</th>
              <th>หลักฐานคืน</th>
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
                >ดูหลักฐาน</a>
                <span v-else>-</span>
              </td>
              <td>{{ borrowStatusText(item.Status) }}</td>
              <td>
                <template v-if="item.Status === 'PendingApproval'">
                  <button
                    class="primary-btn"
                    :disabled="processingBorrowIds.includes(item.TransactionID)"
                    @click="approveBorrow(item.TransactionID)"
                  >อนุมัติ</button>
                  <button
                    class="delete-btn"
                    :disabled="processingBorrowIds.includes(item.TransactionID)"
                    @click="rejectBorrow(item.TransactionID)"
                  >ปฏิเสธ</button>
                </template>

                <button
                  v-else-if="item.Status === 'ReturnRequested'"
                  class="primary-btn"
                  :disabled="processingReturnIds.includes(item.TransactionID)"
                  @click="approveReturn(item)"
                >อนุมัติคืน</button>

                <span v-else>{{ borrowStatusText(item.Status) }}</span>
              </td>
            </tr>
            <tr v-if="!loading && borrows.length === 0">
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
const employees = ref([])
const departments = ref([])

const loading = ref(false)
const loadingEmployees = ref(false)
const savingEmployee = ref(false)
const savingAsset = ref(false)
const showEmployeeForm = ref(false)
const showAssetForm = ref(false)
const employeeMessage = ref('')
const editingAsset = ref(null)
const selectedImage = ref(null)
const imagePreview = ref('')
const imageInput = ref(null)
const newCategoryName = ref('')

const processingBorrowIds = ref([])
const processingReturnIds = ref([])
const deletingAssetIds = ref([])

let previewObjectUrl = null

const stats = ref({
  totalAssets: 0,
  availableAssets: 0,
  borrowedAssets: 0,
  pendingBorrow: 0,
  returned: 0
})

const employeeForm = ref({
  EmployeeID: null,
  Name: '',
  Email: '',
  Phone: '',
  DepartmentID: ''
})

const assetForm = ref({
  AssetName: '',
  SerialNumber: '',
  CategoryID: '',
  Details: '',
  Status: 'Available',
  TotalQuantity: 1
})

const returnRequestedCount = computed(() =>
  borrows.value.filter(item => item.Status === 'ReturnRequested').length
)

function isDeleting(id) {
  return deletingAssetIds.value.some(item => String(item) === String(id))
}

async function loadAll() {
  if (loading.value) return
  loading.value = true

  try {
    await Promise.all([
      loadStats(),
      loadAssets(),
      loadCategories(),
      loadBorrows(),
      loadEmployees()
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
      totalAssets: data.totalAssets ?? data.assets ?? data.total ?? 0,
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

async function loadEmployees() {
  if (loadingEmployees.value) return
  loadingEmployees.value = true

  try {
    const [employeeResponse, departmentResponse] = await Promise.all([
      api.get('/admin/employees'),
      api.get('/assets/departments')
    ])

    const employeeData = employeeResponse.data?.data ?? employeeResponse.data
    const departmentData = departmentResponse.data?.data ?? departmentResponse.data

    employees.value = Array.isArray(employeeData) ? employeeData : []
    departments.value = Array.isArray(departmentData) ? departmentData : []
    employeeMessage.value = ''
  } catch (error) {
    console.error('Load employees error:', error)
    employeeMessage.value =
      error.response?.data?.message || 'โหลดข้อมูลพนักงานไม่สำเร็จ'
  } finally {
    loadingEmployees.value = false
  }
}

function openEmployeeForm(employee) {
  employeeMessage.value = ''
  employeeForm.value = {
    EmployeeID: employee.EmployeeID,
    Name: employee.Name || '',
    Email: employee.Email || '',
    Phone: employee.Phone || '',
    DepartmentID: Number(employee.DepartmentID)
  }
  showEmployeeForm.value = true
}

function closeEmployeeForm() {
  if (savingEmployee.value) return

  showEmployeeForm.value = false
  employeeForm.value = {
    EmployeeID: null,
    Name: '',
    Email: '',
    Phone: '',
    DepartmentID: ''
  }
}

async function saveEmployee() {
  if (savingEmployee.value) return

  const id = employeeForm.value.EmployeeID
  const name = employeeForm.value.Name.trim()
  const email = employeeForm.value.Email.trim()
  const phone = employeeForm.value.Phone.trim()
  const departmentId = Number(employeeForm.value.DepartmentID)

  if (!name || !email || !Number.isInteger(departmentId) || departmentId < 1) {
    employeeMessage.value = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ'
    return
  }

  savingEmployee.value = true
  employeeMessage.value = ''

  try {
    await api.put(`/admin/employees/${id}`, {
      Name: name,
      Email: email,
      Phone: phone || null,
      DepartmentID: departmentId
    })

    showEmployeeForm.value = false
    employeeMessage.value = 'บันทึกข้อมูลพนักงานสำเร็จ'
    await loadEmployees()
  } catch (error) {
    console.error('Save employee error:', error)
    employeeMessage.value =
      error.response?.data?.message || 'บันทึกข้อมูลพนักงานไม่สำเร็จ'
  } finally {
    savingEmployee.value = false
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
  newCategoryName.value = ''
  releasePreviewUrl()

  assetForm.value = asset
    ? {
        AssetName: asset.AssetName || '',
        SerialNumber: asset.SerialNumber || '',
        CategoryID: Number(asset.CategoryID) || '',
        Details: asset.Details || '',
        Status: asset.Status || 'Available',
        TotalQuantity: Number(asset.TotalQuantity ?? 1)
      }
    : {
        AssetName: '',
        SerialNumber: '',
        CategoryID: '',
        Details: '',
        Status: 'Available',
        TotalQuantity: 1
      }

  imagePreview.value = asset?.ImagePath
    ? assetImageUrl(asset.ImagePath)
    : ''

  if (imageInput.value) imageInput.value.value = ''
  showAssetForm.value = true
}

function handleImageChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  if (!allowed.includes(file.type)) {
    alert('รองรับเฉพาะ JPG, PNG, WEBP และ GIF')
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

  if (imageInput.value) imageInput.value.value = ''
}

function assetImageUrl(imagePath) {
  if (!imagePath) return ''
  if (/^https?:\/\//i.test(imagePath)) return imagePath

  const baseURL = String(
    api.defaults?.baseURL || 'http://localhost:3000/api'
  ).replace(/\/+$/, '')

  const serverURL = baseURL.replace(/\/api$/, '')
  return `${serverURL}/${String(imagePath).replace(/^\/+/, '')}`
}

function closeAssetForm() {
  if (savingAsset.value) return

  showAssetForm.value = false
  editingAsset.value = null
  selectedImage.value = null
  newCategoryName.value = ''
  imagePreview.value = ''
  releasePreviewUrl()

  if (imageInput.value) imageInput.value.value = ''
}

async function getCategoryIdForSaving() {
  if (assetForm.value.CategoryID !== '__other__') {
    const categoryId = Number(assetForm.value.CategoryID)

    if (!Number.isInteger(categoryId) || categoryId < 1) {
      throw new Error('กรุณาเลือกหมวดหมู่')
    }

    return categoryId
  }

  const name = newCategoryName.value.trim()

  if (!name) throw new Error('กรุณาระบุชื่อหมวดหมู่ใหม่')
  if (name.length > 100) throw new Error('ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร')

  const existing = categories.value.find(
    category =>
      String(category.CategoryName).trim().toLowerCase() === name.toLowerCase()
  )

  if (existing) return Number(existing.CategoryID)

  const response = await api.post('/assets/categories', {
    categoryName: name
  })

  const result = response.data?.data ?? response.data
  let categoryId =
    result?.CategoryID ??
    result?.categoryId ??
    result?.insertId

  if (!categoryId) {
    await loadCategories()

    const created = categories.value.find(
      category =>
        String(category.CategoryName).trim().toLowerCase() === name.toLowerCase()
    )

    categoryId = created?.CategoryID
  }

  if (!categoryId) {
    throw new Error('เพิ่มหมวดหมู่แล้ว แต่ไม่พบรหัสหมวดหมู่ กรุณาโหลดหมวดหมู่ใหม่')
  }

  await loadCategories()
  return Number(categoryId)
}

async function saveAsset() {
  if (savingAsset.value) return

  const name = assetForm.value.AssetName.trim()
  const quantity = Number(assetForm.value.TotalQuantity)

  if (!name) {
    alert('กรุณากรอกชื่อทรัพย์สิน')
    return
  }

  if (
    assetForm.value.CategoryID === '' ||
    assetForm.value.CategoryID === null
  ) {
    alert('กรุณาเลือกหมวดหมู่')
    return
  }

  if (
    assetForm.value.CategoryID === '__other__' &&
    !newCategoryName.value.trim()
  ) {
    alert('กรุณาระบุชื่อหมวดหมู่ใหม่')
    return
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    alert('จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป')
    return
  }

  // เก็บสถานะก่อนปิดฟอร์ม เพื่อแสดงข้อความให้ถูกต้อง
  const isEditing = Boolean(editingAsset.value)
  savingAsset.value = true

  try {
    const categoryId = await getCategoryIdForSaving()
    const formData = new FormData()

    formData.append('AssetName', name)
    formData.append('SerialNumber', assetForm.value.SerialNumber.trim())
    formData.append('CategoryID', String(categoryId))
    formData.append('Details', assetForm.value.Details.trim())
    formData.append('Status', assetForm.value.Status)
    formData.append('TotalQuantity', String(quantity))

    if (selectedImage.value) {
      formData.append('image', selectedImage.value)
    }

    if (isEditing) {
      await api.put(`/assets/${editingAsset.value.AssetID}`, formData)
    } else {
      await api.post('/assets', formData)
    }

    // ปิดฟอร์มและโหลดข้อมูลใหม่หลัง API สำเร็จเท่านั้น
    showAssetForm.value = false
    editingAsset.value = null
    selectedImage.value = null
    imagePreview.value = ''
    newCategoryName.value = ''
    releasePreviewUrl()

    if (imageInput.value) imageInput.value.value = ''

    await Promise.all([loadAssets(), loadStats(), loadCategories()])

    alert(isEditing ? 'แก้ไขทรัพย์สินสำเร็จ' : 'เพิ่มทรัพย์สินสำเร็จ')
  } catch (error) {
    console.error('Save asset error:', error)

    alert(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'บันทึกทรัพย์สินไม่สำเร็จ'
    )
  } finally {
    savingAsset.value = false
  }
}

async function deleteAsset(id) {
  if (isDeleting(id)) return

  const asset = assets.value.find(
    item => String(item.AssetID) === String(id)
  )

  const assetName = asset?.AssetName || `ID ${id}`

  if (!confirm(
    `ยืนยันการลบทรัพย์สิน "${assetName}" หรือไม่?\n\n` +
    'หากมีประวัติการยืมคืน ระบบอาจไม่อนุญาตให้ลบ'
  )) {
    return
  }

  deletingAssetIds.value.push(id)

  try {
    const response = await api.delete(`/assets/${encodeURIComponent(id)}`)

    // เอาออกจากหน้าจอทันทีหลัง API ตอบว่าสำเร็จ
    assets.value = assets.value.filter(
      item => String(item.AssetID) !== String(id)
    )

    alert(response.data?.message || 'ลบทรัพย์สินสำเร็จ')

    await Promise.all([loadAssets(), loadStats(), loadBorrows()])
  } catch (error) {
    console.error('Delete asset error:', error)

    const status = error.response?.status
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'ลบทรัพย์สินไม่สำเร็จ'

    alert(`${status ? `HTTP ${status}: ` : ''}${message}`)
  } finally {
    deletingAssetIds.value = deletingAssetIds.value.filter(
      item => String(item) !== String(id)
    )
  }
}

async function approveBorrow(id) {
  if (processingBorrowIds.value.includes(id)) return
  if (!confirm('ยืนยันอนุมัติการยืมหรือไม่?')) return

  processingBorrowIds.value.push(id)

  try {
    await api.put(`/borrow/${id}/approve`)
    alert('อนุมัติการยืมสำเร็จ')
    await loadAll()
  } catch (error) {
    alert(error.response?.data?.message || 'อนุมัติการยืมไม่สำเร็จ')
  } finally {
    processingBorrowIds.value = processingBorrowIds.value.filter(item => item !== id)
  }
}

async function rejectBorrow(id) {
  if (processingBorrowIds.value.includes(id)) return
  if (!confirm('ยืนยันปฏิเสธคำขอยืมหรือไม่?')) return

  processingBorrowIds.value.push(id)

  try {
    await api.put(`/borrow/${id}/reject`)
    alert('ปฏิเสธคำขอยืมสำเร็จ')
    await loadAll()
  } catch (error) {
    alert(error.response?.data?.message || 'ปฏิเสธคำขอยืมไม่สำเร็จ')
  } finally {
    processingBorrowIds.value = processingBorrowIds.value.filter(item => item !== id)
  }
}

async function approveReturn(item) {
  const id = item.TransactionID

  if (processingReturnIds.value.includes(id)) return

  if (!item.ReturnProofPath) {
    alert('ไม่พบรูปหลักฐานการคืน')
    return
  }

  if (!confirm('ยืนยันอนุมัติการคืนทรัพย์สินหรือไม่?')) return

  processingReturnIds.value.push(id)

  try {
    await api.put(`/borrow/${id}/approve-return`)
    alert('อนุมัติการคืนสำเร็จ')
    await loadAll()
  } catch (error) {
    alert(error.response?.data?.message || 'อนุมัติการคืนไม่สำเร็จ')
  } finally {
    processingReturnIds.value = processingReturnIds.value.filter(item => item !== id)
  }
}

function formatDate(date) {
  if (!date) return '-'

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return String(date)

  return parsed.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function assetStatusText(status) {
  return ({
    Available: 'พร้อมใช้งาน',
    Borrowed: 'กำลังถูกยืม',
    Broken: 'ชำรุด',
    Maintenance: 'ซ่อมบำรุง'
  })[status] || status || '-'
}

function borrowStatusText(status) {
  return ({
    PendingApproval: 'รออนุมัติการยืม',
    Borrowed: 'กำลังยืม',
    ReturnRequested: 'รออนุมัติการคืน',
    Returned: 'คืนแล้ว',
    Rejected: 'ปฏิเสธ',
    Late: 'เกินกำหนดคืน'
  })[status] || status || '-'
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
  margin-bottom: 25px;
}

.admin-header h1 {
  margin: 0 0 8px;
}

.admin-header p,
.panel-header p {
  color: #6b7280;
  margin: 0;
}

.dashboard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 25px;
}

.stat-card,
.panel {
  background: white;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.stat-card span {
  display: block;
  color: #6b7280;
  margin-bottom: 8px;
}

.stat-card strong {
  font-size: 25px;
}

.warning {
  border-left: 4px solid #f59e0b;
}

.success {
  border-left: 4px solid #16a34a;
}

.panel {
  margin-bottom: 25px;
}

.panel-header {
  margin-bottom: 20px;
}

.panel-header h2 {
  margin-top: 0;
}

button {
  border: 0;
  border-radius: 8px;
  padding: 10px 13px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  margin: 2px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn {
  background: #111827;
  color: white;
}

.primary-btn {
  background: #2563eb;
  color: white;
}

.edit-btn {
  background: #dbeafe;
  color: #1d4ed8;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.cancel-btn {
  background: #e5e7eb;
  color: #374151;
}

.edit-form {
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 7px;
  font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 11px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 90px;
}

.form-group small {
  display: block;
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
}

.full-width {
  grid-column: 1 / -1;
}

.form-actions {
  margin-top: 18px;
}

.message {
  padding: 12px;
  margin-bottom: 15px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  overflow-wrap: anywhere;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}

.asset-table {
  min-width: 1250px;
}

.borrow-table {
  min-width: 1500px;
}

th,
td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

th {
  background: #f9fafb;
  color: #4b5563;
}

td {
  font-size: 14px;
}

.details-cell {
  white-space: normal;
  min-width: 220px;
  max-width: 320px;
  overflow-wrap: anywhere;
  line-height: 1.5;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 25px;
}

.asset-thumbnail {
  width: 55px;
  height: 45px;
  object-fit: cover;
  border-radius: 6px;
}

.image-preview {
  display: block;
  width: 180px;
  max-height: 150px;
  object-fit: contain;
  margin-bottom: 10px;
}

@media (max-width: 800px) {
  .admin-page {
    padding: 15px;
  }

  .admin-header,
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .full-width {
    grid-column: auto;
  }
}

@media (max-width: 500px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
}
</style>
