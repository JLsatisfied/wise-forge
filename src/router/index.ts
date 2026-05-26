import { createWebHistory, createRouter } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { useStore } from '../store/index'

const routes: any = [
  {
    path: '/',
    name: 'HomePage',
    component: () => import('@/view/home/index.vue')
  },
  {
    path: '/intelligence',
    name: 'IntelligencePage',
    component: () => import('@/view/intelligence/index.vue')
  },
  {
    path: '/customer-service',
    name: 'CustomerService',
    component: () => import('@/view/customer-service/index.vue')
  },
  {
    path: '/:pathMatch',
    name: '404',
    component: () => import('@/view/error/404.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(to => {
  NProgress.start()
  const store = useStore()
  if (!store.token && to.path !== '/') {
    ElMessage.warning('请先登录')
    return { name: 'home' }
  }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
