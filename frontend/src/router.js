
import { createRouter, createWebHistory } from 'vue-router';

import Home from './views/Home.vue';
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import ForgotPassword from './views/ForgotPassword.vue';
import ResetPassword from './views/ResetPassword.vue';
import Admin from './views/Admin.vue';
import MyBorrow from './views/MyBorrow.vue';
import Contact from './views/Contact.vue';
import Profile from './views/Profile.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/forgot-password', component: ForgotPassword },
    { path: '/reset-password/:token', component: ResetPassword },

    {
      path: '/contact',
      name: 'Contact',
      component: Contact
    },

    {
      path: '/profile',
      name: 'Profile',
      component: Profile,
      meta: { auth: true }
    },

    {
      path: '/my-borrow',
      component: MyBorrow,
      meta: { auth: true }
    },

    {
      path: '/admin',
      component: Admin,
      meta: { admin: true }
    }
  ]
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    user = null;
  }

  if (to.meta.auth && (!token || !user)) {
    return '/login';
  }

  if (to.meta.admin && (!token || user?.type !== 'admin')) {
    return '/login';
  }
});

export default router;
