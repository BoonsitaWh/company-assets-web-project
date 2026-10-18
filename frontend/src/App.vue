
<template>
  <header class="nav">
    <div class="brand" @click="goHome">
      🏢 Company Assets
    </div>

    <nav>
      <router-link to="/">ทรัพย์สิน</router-link>

      <router-link
        v-if="user?.type === 'employee'"
        to="/my-borrow"
      >
        รายการยืมของฉัน
      </router-link>

      <router-link
        v-if="user?.type === 'admin'"
        to="/admin"
      >
        Admin
      </router-link>

      <router-link v-if="user" to="/profile">
        โปรไฟล์
      </router-link>

      <router-link to="/contact">
        ติดต่อเรา
      </router-link>

      <router-link v-if="!user" to="/login">
        Login
      </router-link>

      <router-link v-if="!user" to="/register">
        สมัครสมาชิก
      </router-link>

      <button
        v-if="user"
        class="link-btn"
        type="button"
        @click="logout"
      >
        ออกจากระบบ
      </button>
    </nav>
  </header>

  <main class="container">
    <router-view />
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = ref(null);

function loadUser() {
  try {
    user.value = JSON.parse(
      localStorage.getItem('user') || 'null'
    );
  } catch {
    user.value = null;
  }
}

function goHome() {
  router.push('/');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  loadUser();
  router.replace('/login');
}

onMounted(() => {
  loadUser();
  window.addEventListener('storage', loadUser);
});

onBeforeUnmount(() => {
  window.removeEventListener('storage', loadUser);
});

router.afterEach(() => {
  loadUser();
});
</script>

<style>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 16px 28px;
  background: #172554;
  color: #fff;
}

.brand {
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.nav nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.nav a,
.link-btn {
  color: #e2e8f0;
  text-decoration: none;
  font: inherit;
  font-size: 14px;
}

.nav a:hover,
.nav a.router-link-active {
  color: #93c5fd;
}

.link-btn {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.link-btn:hover {
  color: #fca5a5;
}

.container {
  min-height: calc(100vh - 70px);
}

@media (max-width: 700px) {
  .nav {
    padding: 16px;
  }

  .nav nav {
    gap: 12px;
  }
}
</style>
