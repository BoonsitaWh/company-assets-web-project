<template>
  <div class="card">
    <h1>Reset Password</h1>
    <p>กรอก Email ที่ลงทะเบียนไว้ ระบบจะส่งลิงก์สำหรับตั้ง Password ใหม่</p>
    <input type="email" v-model="email" placeholder="email@company.com" />
    <button @click="send">ส่งลิงก์</button>
    <p class="success">{{message}}</p><p class="error">{{error}}</p>
  </div>
</template>
<script setup>
import {ref} from 'vue'; import api from '../api';
const email=ref(''),message=ref(''),error=ref('');
async function send(){try{const r=await api.post('/auth/forgot-password',{email:email.value});message.value=r.data.message;error.value=''}catch(e){error.value=e.response?.data?.message||'เกิดข้อผิดพลาด'}}
</script>
