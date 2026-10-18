<template>
  <div class="card">
    <h1>สมัครสมาชิก</h1>
    <label>ชื่อ-นามสกุล</label><input v-model="form.name" />
    <label>แผนก</label>
    <select v-model="form.departmentId"><option value="">เลือกแผนก</option><option v-for="d in departments" :key="d.DepartmentID" :value="d.DepartmentID">{{d.DepartmentName}}</option></select>
    <label>Email (ใช้เป็น Username สำหรับสมาชิก)</label><input type="email" v-model="form.email" />
    <label>เบอร์โทรศัพท์</label><input v-model="form.phone" />
    <label>Password</label><input type="password" v-model="form.password" />
    <small>Password: ≥8 ตัว, มี A-Z, a-z, ตัวเลข และอักขระพิเศษ</small>
    <br><br><button @click="register">สมัครสมาชิก</button>
    <p class="success">{{message}}</p><p class="error">{{error}}</p>
  </div>
</template>
<script setup>
import { ref,onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
const router=useRouter();
const departments=ref([]),message=ref(''),error=ref('');
const form=ref({name:'',departmentId:'',email:'',phone:'',password:''});
onMounted(async()=>departments.value=(await api.get('/assets/departments')).data);
async function register(){
  try {
    await api.post('/auth/register',form.value);
    message.value='สมัครสมาชิกสำเร็จ กรุณา Login'; error.value='';
    setTimeout(()=>router.push('/login'),800);
  } catch(e){ error.value=e.response?.data?.message||'สมัครสมาชิกไม่สำเร็จ'; }
}
</script>
