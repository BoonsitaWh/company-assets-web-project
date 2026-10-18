
<template>
  <div class="card">
    <!-- รูปภาพทรัพย์สิน -->
    <div class="asset-image">
      <img
        v-if="asset.ImagePath && !imageError"
        :src="imageUrl(asset.ImagePath)"
        :alt="asset.AssetName"
        @error="imageError = true"
      />

      <div v-else class="no-image">
        <span>📦</span>
        <p>ไม่มีรูปภาพ</p>
      </div>
    </div>

    <!-- รายละเอียดทรัพย์สิน -->
    <div class="card-content">
      <h3>{{ asset.AssetName }}</h3>

      <p>ประเภท: {{ asset.CategoryName || '-' }}</p>
      <p>Serial: {{ asset.SerialNumber || '-' }}</p>
      <p>สถานที่เก็บ: {{ asset.Location || '-' }}</p>

      <div class="quantity-box">
        <p>
          จำนวนทั้งหมด:
          <strong>{{ asset.TotalQuantity ?? 1 }}</strong> ชิ้น
        </p>

        <p>
          กำลังยืม:
          <strong>{{ asset.BorrowedQuantity ?? 0 }}</strong> ชิ้น
        </p>

        <p>
          คงเหลือ:
          <strong class="available-quantity">
            {{ asset.AvailableQuantity ?? asset.TotalQuantity ?? 1 }}
          </strong>
          ชิ้น
        </p>
      </div>

      <p>
        <span class="badge" :class="asset.Status">
          {{ statusText(asset.Status) }}
        </span>
      </p>

      <button
        v-if="isMember && availableQuantity > 0"
        @click="$emit('borrow', asset)"
      >
        ขอยืม
      </button>

      <p v-else-if="isMember" class="unavailable">
        ไม่มีทรัพย์สินคงเหลือ
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  asset: {
    type: Object,
    required: true
  },
  isMember: {
    type: Boolean,
    default: false
  }
})

defineEmits(['borrow'])

const imageError = ref(false)

watch(
  () => props.asset.ImagePath,
  () => {
    imageError.value = false
  }
)

const availableQuantity = computed(() => {
  return Number(
    props.asset.AvailableQuantity ??
    props.asset.TotalQuantity ??
    1
  )
})

function imageUrl(path) {
  if (!path) return ''

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `http://localhost:3000${path.startsWith('/') ? '' : '/'}${path}`
}

function statusText(status) {
  const labels = {
    Available: 'พร้อมใช้งาน',
    Borrowed: 'กำลังถูกยืม',
    Broken: 'ชำรุด',
    Maintenance: 'ซ่อมบำรุง'
  }

  return labels[status] || status || '-'
}
</script>

<style scoped>
.card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 9px 24px rgba(0, 0, 0, 0.12);
}

.asset-image {
  width: 100%;
  height: 210px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: #f1f5f9;
}

.asset-image img {
  width: 100%;
  height: 100%;
  padding: 8px;
  object-fit: contain;
}

.no-image {
  color: #94a3b8;
  text-align: center;
}

.no-image span {
  font-size: 42px;
}

.no-image p {
  margin: 5px 0;
  font-size: 13px;
}

.card-content {
  padding: 18px;
}

.card h3 {
  margin: 0 0 12px;
  color: #1e293b;
  font-size: 20px;
}

.card-content > p {
  margin: 9px 0;
  color: #64748b;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.quantity-box {
  margin: 14px 0;
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
}

.quantity-box p {
  margin: 7px 0;
  color: #475569;
  font-size: 14px;
}

.available-quantity {
  color: #15803d;
  font-size: 17px;
}

.badge {
  display: inline-block;
  padding: 5px 11px;
  border-radius: 20px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 600;
}

.badge.Borrowed {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge.Broken,
.badge.Maintenance {
  background: #fee2e2;
  color: #b91c1c;
}

.card button {
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  border: none;
  border-radius: 9px;
  background: #2563eb;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.card button:hover {
  background: #1d4ed8;
}

.unavailable {
  color: #dc2626 !important;
  font-weight: 600;
  text-align: center;
}
</style>
