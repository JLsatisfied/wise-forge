import { createApp } from 'vue'
import './style.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/theme.scss'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router).mount('#app')
