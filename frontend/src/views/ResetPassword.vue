<template>
  <div class="card">
    <h1>ตั้ง Password ใหม่</h1>
    <input type="password" v-model="password" placeholder="Password ใหม่" />
    <button @click="reset">เปลี่ยน Password</button>
    <p class="success">{{message}}</p><p class="error">{{error}}</p>
  </div>
</template>
<script setup>
import {ref} from 'vue'; import {useRoute,useRouter} from 'vue-router'; import api from '../api';
const route=useRoute(),router=useRouter(),password=ref(''),message=ref(''),error=ref('');
async function reset(){try{const r=await api.post('/auth/reset-password',{token:route.params.token,password:password.value});message.value=r.data.message;setTimeout(()=>router.push('/login'),1000)}catch(e){error.value=e.response?.data?.message||'ไม่สำเร็จ'}}
</script>
