import { createWebHistory, createRouter } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { useStore } from '../store/index'

const DEFAULT_TITLE = '未来智匠 Wise Forge · AI 对话与创作平台'

const routes: any = [
  {
    path: '/',
    name: 'HomePage',
    component: () => import('@/view/home/index.vue'),
    meta: { title: DEFAULT_TITLE }
  },
  {
    path: '/intelligence',
    name: 'IntelligencePage',
    component: () => import('@/view/intelligence/index.vue'),
    meta: { title: 'AI 对话 · 未来智匠' }
  },
  {
    path: '/customer-service',
    name: 'CustomerService',
    component: () => import('@/view/customer-service/index.vue'),
    meta: { title: '智能客服 · 未来智匠' }
  },
  {
    path: '/adventure',
    name: 'AdventurePage',
    component: () => import('@/view/adventure/index.vue'),
    meta: { title: '冒险模式 · 未来智匠' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404Page',
    component: () => import('@/view/error/404.vue'),
    meta: { title: '页面不存在 · 未来智匠' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(to => {
  NProgress.start()
  const store = useStore()
  // 404 页面不需要登录，避免失效链接被弹回首页
  if (!store.token && to.path !== '/' && to.name !== '404Page') {
    ElMessage.warning('请先登录')
    return { name: 'home' }
  }
})

router.afterEach(to => {
  document.title = (to.meta.title as string) || DEFAULT_TITLE
  NProgress.done()
})

export default router
