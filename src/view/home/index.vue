<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, User, VideoCameraFilled, Key, Message, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { userApi } from '@/api/user.ts'
import forge from 'node-forge'
import { useStore } from '@/store/index.ts'
import useFileUpload from '@/composables/useFileUpload.ts'
import ThemeToggle from '@/components/ThemeToggle.vue'

defineOptions({
  name: 'HomePage'
})

const isUiModule = ref('login')
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const text = ref<string>('时空旅者：现实与幻想的双重奏')
const currentTextIndex = ref(0)
const router = useRouter()
const fileInput = ref<null | HTMLInputElement>(null)
const freeLogin = ref(false)
const svgSrc = ref('')
const isInvoke = ref(false)
const pubKey = ref('') // rsa公钥

const features = [
  {
    icon: 'fas fa-comments',
    title: 'AI 魔法对话',
    desc: '多模型智能问答',
    color: '#4f6ef7',
    bg: 'rgba(79, 110, 247, 0.1)'
  },
  {
    icon: 'fas fa-layer-group',
    title: '模板工坊',
    desc: '百变角色预设',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.1)'
  },
  {
    icon: 'fas fa-headset',
    title: '智能客服',
    desc: '一键嵌入站点',
    color: '#0ea5e9',
    bg: 'rgba(14, 165, 233, 0.1)'
  }
]

const typedText = computed(() => {
  return text.value.slice(0, currentTextIndex.value)
})

const typingTimer = setInterval(() => {
  if (currentTextIndex.value < text.value.length) {
    currentTextIndex.value++
  } else {
    clearInterval(typingTimer)
  }
}, 100)

onUnmounted(() => {
  clearInterval(typingTimer)
})

const loginData = reactive({
  // 登录数据
  user: '',
  password: ''
})

const registerForm = reactive({
  // 注册数据
  name: '',
  user: '',
  email: '',
  password: '',
  img_url: '',
  confirmPassword: '',
  // characterClass: '',
  captcha: ''
})

// 密码强度检测
const passwordStrength = computed(() => {
  const pwd = registerForm.password
  if (!pwd) return { level: 0, label: '', color: '', width: '0%' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[a-z]/.test(pwd)) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  const levels = [
    { level: 0, label: '', color: '', width: '0%' },
    { level: 1, label: '弱不禁风', color: '#dc2626', width: '20%' },
    { level: 2, label: '初入江湖', color: '#d97706', width: '40%' },
    { level: 3, label: '勇者之盾', color: '#4f6ef7', width: '65%' },
    { level: 4, label: '史诗护符', color: '#2563eb', width: '85%' },
    { level: 5, label: '传说结界', color: '#16a34a', width: '100%' }
  ]
  return levels[Math.min(score, 5)]
})

const { selectFile, upImg } = useFileUpload(fileInput, registerForm, 0)

const changeData = reactive({
  // 修改密码数据
  user: '',
  password: '',
  newPassword: ''
})

const resetData = reactive({
  // 重置密码数据
  user: '',
  email: ''
})

const loginRules = reactive<FormRules>({
  user: [
    { required: true, message: '请输入冒险者账号或者邮箱', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (/[\u4e00-\u9fa5]/g.test(value)) {
          callback(new Error('冒险者账号或邮箱不能使用中文'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入通行密令', trigger: 'blur' },
    { min: 6, message: '密令长度不能小于6位', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (/[\u4e00-\u9fa5]/g.test(value)) {
          callback(new Error('密令不能使用中文'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

const registerRules = reactive<FormRules>({
  name: [
    { required: true, message: '请输入冒险者名称', trigger: 'blur' },
    { min: 2, message: '名称长度不能小于2位', trigger: 'blur' }
  ],
  user: [
    { required: true, message: '请输入冒险者账号', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (/[\u4e00-\u9fa5]/g.test(value)) {
          callback(new Error('冒险者账号不能使用中文'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  email: [
    { required: true, message: '请输入冒险者邮箱', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          callback()
        } else {
          callback(new Error('邮箱格式错误'))
        }
      },
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请设置通行密令', trigger: 'blur' },
    { min: 6, message: '密令长度不能小于6位', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (/[\u4e00-\u9fa5]/g.test(value)) {
          callback(new Error('密令不能使用中文'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认通行密令', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密令不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (/[\u4e00-\u9fa5]/g.test(value)) {
          callback(new Error('验证码不能使用中文'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

const changeRules = reactive<FormRules>({
  user: [{ required: true, message: '请输入冒险者账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入原通行密令', trigger: 'blur' },
    { min: 6, message: '密令长度不能小于6位', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新通行密令', trigger: 'blur' },
    { min: 6, message: '密令长度不能小于6位', trigger: 'blur' }
  ]
})

const resetRules = reactive<FormRules>({
  user: [{ required: true, message: '请输入冒险者账号', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入冒险者邮箱', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          callback()
        } else {
          callback(new Error('邮箱格式错误'))
        }
      },
      trigger: 'blur'
    }
  ]
})

const store = useStore()
const pubKeyLoading = ref(true)

// rsa加密
const encrypt = (value: string) => {
  try {
    const { pki, util } = forge
    const publicKeyObj = pki.publicKeyFromPem(pubKey.value)
    const encryptedData = publicKeyObj.encrypt(util.encodeUtf8(value), 'RSA-OAEP')
    return forge.util.encode64(encryptedData)
  } catch (err) {
    return err
  }
}

// 注册或者登录
const handleSubmit = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  if (pubKeyLoading.value) {
    ElMessage({
      message: '密钥加载中，请稍后再试',
      type: 'warning',
      offset: 200,
      plain: true
    })
    return
  }
  await formEl.validate(valid => {
    if (valid) {
      if (isUiModule.value == 'login') {
        isInvoke.value = true
        const data = {
          user: encrypt(loginData.user),
          password: encrypt(loginData.password),
          freeLogin: freeLogin.value
        }
        userApi.login(data).then(res => {
          if (res.data.code == 0) {
            ElNotification({
              title: '冒险开始!',
              message: '欢迎进入未来智匠AI世界，勇敢的冒险者！',
              type: 'success',
              customClass: 'pixel-notify'
            })
            store.setToken(res.data.token, freeLogin.value)
            router.push('/intelligence')
            isInvoke.value = false
          } else if (res.data.code == 1) {
            ElMessage({
              message: '冒险者账号或者邮箱不存在',
              type: 'warning',
              offset: 200,
              plain: true
            })
            isInvoke.value = false
          } else if (res.data.code == 2) {
            ElMessage({
              message: '冒险者账号或者密令不正确',
              type: 'warning',
              offset: 200,
              plain: true
            })
            isInvoke.value = false
          } else {
            ElMessage({
              message: res.data.msg,
              type: 'error',
              offset: 200,
              plain: true
            })
            isInvoke.value = false
          }
        })
      } else if (isUiModule.value == 'register') {
        if (!registerForm.img_url) {
          ElMessage({
            message: '请上传头像',
            type: 'warning',
            offset: 200,
            plain: true
          })
          return
        }
        isInvoke.value = true
        userApi.register(registerForm).then(res => {
          isInvoke.value = false
          if (res.data.code == 0) {
            ElMessage({
              message: '你已成功拥有冒险账册！',
              type: 'success',
              offset: 200,
              plain: true
            })
            isUiModule.value = 'login'
          } else if (res.data.code == 1) {
            ElMessage({
              message: '冒险者账号已存在',
              type: 'warning',
              offset: 200,
              plain: true
            })
          } else {
            ElMessage({
              message: res.data.msg,
              type: 'error',
              offset: 200,
              plain: true
            })
            refreshImg()
          }
        })
      } else if (isUiModule.value == 'newCode') {
        isInvoke.value = true
        const newData = {
          user: encrypt(changeData.user),
          password: encrypt(changeData.password),
          newPassword: encrypt(changeData.newPassword)
        }
        userApi.changePassword(newData).then(res => {
          isInvoke.value = false
          if (res.data.code == 0) {
            ElMessage({
              message: '通行密令修改成功',
              type: 'success',
              offset: 200,
              plain: true
            })
            changeData.user = ''
            changeData.password = ''
            changeData.newPassword = ''
            if (formRef.value) formRef.value.resetFields()
            isUiModule.value = 'login'
          } else {
            isInvoke.value = false
            ElMessage({
              message: res.data.msg,
              type: 'error',
              offset: 200,
              plain: true
            })
          }
        })
      } else {
        isInvoke.value = true
        userApi.resetPassword(resetData).then(res => {
          isInvoke.value = false
          if (res.data.code == 0) {
            ElMessage({
              message: '通行密令重置成功，请前往邮箱查看',
              type: 'success',
              offset: 200,
              plain: true
            })
            isUiModule.value = 'login'
          } else {
            isInvoke.value = false
            ElMessage({
              message: res.data.msg,
              type: 'error',
              offset: 200,
              plain: true
            })
          }
        })
      }
    }
  })
}

const switchMode = (module: string) => {
  isUiModule.value = module
  if (isUiModule.value == 'register') {
    refreshImg()
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 验证码生成
const refreshImg = () => {
  userApi.captcha().then(res => {
    if (res.data.code == 0) {
      svgSrc.value = res.data.imgData
    } else {
      ElMessage({
        message: res.data.msg,
        type: 'error',
        offset: 200,
        plain: true
      })
    }
  })
}

const openDialog = () => {
  dialogVisible.value = true
}

// 密码修改或重置
const editCipher = (type: string) => {
  isUiModule.value = type
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

onMounted(() => {
  if (store.token && store.freeEntry == 'true') {
    router.replace('/intelligence')
    return
  }
  userApi
    .publicKey()
    .then(res => {
      pubKey.value = res.data.key
    })
    .finally(() => {
      pubKeyLoading.value = false
    })
})
</script>

<template>
  <div class="home">
    <div class="home-glow home-glow--1"></div>
    <div class="home-glow home-glow--2"></div>

    <header class="home-header">
      <div class="brand">
        <span class="brand-mark"><i class="fas fa-compass"></i></span>
        <div class="brand-copy">
          <span class="brand-name">未来智匠</span>
          <span class="brand-sub">WISE FORGE</span>
        </div>
      </div>
      <div class="home-header-right">
        <span class="status-pill"><span class="status-dot"></span>AI 服务在线</span>
        <ThemeToggle />
      </div>
    </header>

    <main class="home-main">
      <section class="hero">
        <span class="hero-eyebrow">AI 冒险创作平台</span>
        <h1 class="title">冒险纪元</h1>
        <p class="hero-text">
          <span class="typed">{{ typedText }}</span><span class="caret"></span>
        </p>
        <p class="hero-desc">
          与 AI 一起构建角色、续写故事、探索未知世界。简洁、专注、随时启程。
        </p>
        <div class="hero-actions">
          <button class="primary-btn" type="button" @click="openDialog">
            开启旅途 <i class="fas fa-arrow-right"></i>
          </button>
          <span class="hero-note"><i class="fas fa-circle-check"></i> 注册即可免费体验</span>
        </div>

        <div class="features">
          <div v-for="(feat, i) in features" :key="i" class="feature-card">
            <span class="feature-icon" :style="{ color: feat.color, background: feat.bg }">
              <i :class="feat.icon"></i>
            </span>
            <div class="feature-info">
              <span class="feature-title">{{ feat.title }}</span>
              <span class="feature-desc">{{ feat.desc }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="hero-visual" aria-hidden="true">
        <div class="visual-card">
          <img src="./images/Serendale.png" alt="" />
          <div class="visual-meta">
            <span class="meta-dot"></span>
            <div class="meta-copy">
              <p class="meta-title">Serendale</p>
              <p class="meta-sub">你的冒险，从这里开始</p>
            </div>
          </div>
        </div>
        <div class="float-card float-card--top">
          <i class="fas fa-wand-magic-sparkles"></i>
          <div>
            <strong>AI 生成</strong>
            <span>即时续写</span>
          </div>
        </div>
        <div class="float-card float-card--bottom">
          <i class="fas fa-shield-halved"></i>
          <div>
            <strong>隐私优先</strong>
            <span>本地存储</span>
          </div>
        </div>
      </section>
    </main>

    <footer class="bottom-bar">
      <span class="bar-item">未来智匠</span>
      <span class="bar-divider"></span>
      <span class="bar-item">AI 冒险世界</span>
      <span class="bar-divider"></span>
      <span class="bar-item">静候勇者</span>
      <span class="copyright">© 2026 Wise Forge</span>
    </footer>
    <el-dialog
      v-model="dialogVisible"
      :width="
        isUiModule == 'login' || isUiModule == 'resetPassword' || isUiModule == 'newCode'
          ? '400px'
          : '500px'
      "
      center
      :show-close="false"
      class="adventurer-auth-dialog app-dialog"
      align-center
    >
      <div class="auth-container">
        <div class="auth-header">
          <div class="header-content">
            <div class="auth-icon" aria-hidden="true">
              <i class="fas fa-compass"></i>
            </div>
            <div class="pixel-decoration">
              <span class="pixel-gem"></span>
              <span class="pixel-gem"></span>
              <span class="pixel-gem"></span>
            </div>
            <h2>
              {{
                isUiModule == 'login'
                  ? '冒险者归来'
                  : isUiModule == 'register'
                    ? '开启冒险之旅'
                    : isUiModule == 'newCode'
                      ? '修改密令'
                      : '重置密令'
              }}
            </h2>
            <p>
              {{
                isUiModule == 'login'
                  ? '欢迎回到这片神奇的大陆'
                  : isUiModule == 'register'
                    ? '准备好开始你的传奇了吗？'
                    : '请输入你的信息'
              }}
            </p>
          </div>
        </div>

        <!-- 登录表单 -->
        <el-form
          v-if="isUiModule == 'login'"
          ref="formRef"
          :model="loginData"
          :rules="loginRules"
          class="auth-form"
          @keyup.enter="handleSubmit(formRef)"
        >
          <el-form-item prop="user">
            <el-input v-model="loginData.user" :prefix-icon="User" placeholder="冒险者账号或邮箱" />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginData.password"
              :prefix-icon="Lock"
              type="password"
              placeholder="通行密令"
              show-password
            />
          </el-form-item>

          <div class="form-footer">
            <div class="free-login-toggle" @click="freeLogin = !freeLogin">
              <span class="toggle-track" :class="{ 'toggle-on': freeLogin }">
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-text">30日内记住冒险者</span>
            </div>
            <div>
              <a class="forgot-link amend" @click="editCipher('newCode')">修改密令！</a>
              <a class="forgot-link" @click="editCipher('resetPassword')">遗失密令？</a>
            </div>
          </div>

          <el-button
            type="primary"
            @click="handleSubmit(formRef)"
            class="submit-button pixel-submit"
            :loading="isInvoke"
          >
            进入世界
          </el-button>

          <div class="switch-mode">
            初来乍到？<a @click="switchMode('register')" class="switch-link">创建冒险者档案</a>
          </div>
        </el-form>

        <!-- 注册表单 -->
        <el-form
          v-else-if="isUiModule == 'register'"
          ref="formRef"
          :model="registerForm"
          :rules="registerRules"
          class="auth-form"
          @keyup.enter="handleSubmit(formRef)"
        >
          <div class="portrait">
            <div class="avatar">头像</div>
            <div class="avatar-img" @click="selectFile">
              <el-icon :size="20" v-if="!registerForm.img_url"><Plus /></el-icon>
              <img v-else :src="registerForm.img_url" alt="" />
              <input type="file" ref="fileInput" @change="upImg" />
            </div>
          </div>
          <el-form-item prop="name">
            <el-input
              v-model="registerForm.name"
              :prefix-icon="VideoCameraFilled"
              placeholder="为你的冒险者取个名字"
            />
          </el-form-item>

          <el-form-item prop="user">
            <el-input
              v-model="registerForm.user"
              :prefix-icon="User"
              placeholder="为你的冒险者想个账号"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              :prefix-icon="Lock"
              type="password"
              placeholder="设置通行密令"
              show-password
              :class="{ 'has-strength': registerForm.password }"
            />
            <!-- 密码强度 -->
            <div v-if="registerForm.password" class="password-strength">
              <div class="strength-bar-track">
                <div
                  class="strength-bar-fill"
                  :style="{
                    width: passwordStrength.width,
                    background: passwordStrength.color
                  }"
                ></div>
              </div>
              <span class="strength-label" :style="{ color: passwordStrength.color }">
                {{ passwordStrength.label }}
              </span>
            </div>
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              :prefix-icon="Lock"
              type="password"
              placeholder="确认通行密令"
              show-password
            />
          </el-form-item>

          <el-form-item prop="email">
            <el-input
              v-model="registerForm.email"
              :prefix-icon="Message"
              placeholder="为你的冒险者绑定邮箱"
            />
          </el-form-item>

          <el-form-item prop="captcha" class="custom-form-item">
            <el-input
              style="width: 260px"
              maxlength="6"
              v-model="registerForm.captcha"
              :prefix-icon="Key"
              placeholder="验证码"
            />
            <div class="svg-img" v-html="svgSrc" @click="refreshImg"></div>
          </el-form-item>

          <el-button
            type="primary"
            @click="handleSubmit(formRef)"
            class="submit-button pixel-submit"
            :loading="isInvoke"
          >
            开启冒险
          </el-button>

          <div class="switch-mode">
            已有账册？<a @click="switchMode('login')" class="switch-link">返回登录</a>
          </div>
        </el-form>

        <!-- 修改密码表单 -->
        <el-form
          v-if="isUiModule == 'newCode'"
          ref="formRef"
          :model="changeData"
          :rules="changeRules"
          class="auth-form"
          @keyup.enter="handleSubmit(formRef)"
        >
          <el-form-item prop="user">
            <el-input v-model="changeData.user" :prefix-icon="User" placeholder="冒险者账号" />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="changeData.password"
              :prefix-icon="Lock"
              type="password"
              placeholder="原通行密令"
              show-password
            />
          </el-form-item>

          <el-form-item prop="newPassword">
            <el-input
              v-model="changeData.newPassword"
              :prefix-icon="Lock"
              type="password"
              placeholder="新通行密令"
              show-password
            />
          </el-form-item>

          <el-button
            type="primary"
            @click="handleSubmit(formRef)"
            class="submit-button pixel-submit mt-15"
            :loading="isInvoke"
          >
            确认修改
          </el-button>

          <div class="switch-mode">
            <a @click="switchMode('login')" class="switch-link">返回登录</a>
          </div>
        </el-form>

        <!-- 重置密码表单 -->
        <el-form
          v-if="isUiModule == 'resetPassword'"
          ref="formRef"
          :model="resetData"
          :rules="resetRules"
          class="auth-form"
          @keyup.enter="handleSubmit(formRef)"
        >
          <el-form-item prop="user">
            <el-input v-model="resetData.user" :prefix-icon="User" placeholder="冒险者账号" />
          </el-form-item>

          <el-form-item prop="email">
            <el-input v-model="resetData.email" :prefix-icon="Message" placeholder="邮箱账号" />
          </el-form-item>

          <el-button
            type="primary"
            @click="handleSubmit(formRef)"
            class="submit-button pixel-submit mt-15"
            :loading="isInvoke"
          >
            重置密码
          </el-button>

          <div class="switch-mode">
            <a @click="switchMode('login')" class="switch-link">返回登录</a>
          </div>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.home {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0 clamp(20px, 5vw, 64px);
  background: var(--bg);
  overflow: clip;
}

.home-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  opacity: 0.5;

  &--1 {
    width: 460px;
    height: 460px;
    top: -180px;
    right: -80px;
    background: var(--accent-soft);
  }

  &--2 {
    width: 380px;
    height: 380px;
    bottom: -160px;
    left: -120px;
    background: rgba(14, 165, 233, 0.1);
  }
}

.home-header {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  height: 76px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--accent);
  color: #fff;
  font-size: 16px;
  box-shadow: 0 6px 16px var(--accent-ring);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text);
}

.brand-sub {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 2.4px;
  color: var(--text-3);
}

.home-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 11px;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px var(--success-soft);
}

.home-main {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 44px 0 56px;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  align-items: center;
  gap: clamp(32px, 6vw, 72px);
}

.hero {
  max-width: 560px;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--accent-soft);
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.title {
  margin: 22px 0 12px;
  font-size: clamp(46px, 6.4vw, 74px);
  line-height: 1.04;
  letter-spacing: -0.035em;
  font-weight: 700;
  color: var(--text);
}

.hero-text {
  min-height: 28px;
  margin: 0;
  color: var(--text-2);
  font-size: 17px;
  letter-spacing: 0.2px;
}

.caret {
  display: inline-block;
  width: 2px;
  height: 1.05em;
  margin-left: 3px;
  vertical-align: -2px;
  background: var(--accent);
  animation: caret-blink 1s step-end infinite;
}

@keyframes caret-blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

.hero-desc {
  max-width: 460px;
  margin: 18px 0 30px;
  color: var(--text-3);
  font-size: 14.5px;
  line-height: 1.85;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 46px;
  padding: 0 24px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 24px var(--accent-ring);
  transition:
    transform 0.18s var(--ease),
    background-color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);

  i {
    font-size: 12px;
    transition: transform 0.18s var(--ease);
  }

  &:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 14px 28px var(--accent-ring);

    i {
      transform: translateX(3px);
    }
  }

  &:active {
    background: var(--accent-active);
    transform: translateY(0);
  }
}

.hero-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-3);
  font-size: 12px;

  i {
    color: var(--success);
  }
}

.features {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 46px;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 13px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  transition:
    transform 0.18s var(--ease),
    border-color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);

  &:hover {
    transform: translateY(-2px);
    border-color: var(--border-strong);
    box-shadow: var(--shadow-sm);
  }
}

.feature-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 14px;
}

.feature-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.feature-title {
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.feature-desc {
  color: var(--text-3);
  font-size: 11px;
  white-space: nowrap;
}

.hero-visual {
  position: relative;
  display: flex;
  justify-content: center;
}

.visual-card {
  position: relative;
  width: min(100%, 420px);
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  transform: rotate(-1.4deg);
  transition: transform 0.3s var(--ease);

  &:hover {
    transform: rotate(0deg);
  }

  > img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 520px;
    object-fit: cover;
    border-radius: 15px;
    background: var(--surface-2);
  }
}

.visual-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 6px 3px;
}

.meta-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.meta-copy {
  min-width: 0;
}

.meta-title {
  margin: 0;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.meta-sub {
  margin: 2px 0 0;
  color: var(--text-3);
  font-size: 11px;
}

.float-card {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 10px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-md);

  i {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 12px;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  strong {
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
  }

  span {
    color: var(--text-3);
    font-size: 10px;
  }

  &--top {
    top: 48px;
    right: -10px;
  }

  &--bottom {
    bottom: 84px;
    left: -18px;
  }
}

.bottom-bar {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 0 26px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 12px;
  flex-shrink: 0;
}

.bar-divider {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border-strong);
}

.copyright {
  margin-left: auto;
  color: var(--text-3);
}

/* ---------- 登录 / 注册弹窗 ---------- */
.auth-container {
  padding: 4px 8px 8px;
}

.auth-header {
  margin-bottom: 20px;
  text-align: center;
}

.auth-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  border: 1px solid var(--accent-ring);
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 22px;
  box-shadow:
    0 0 0 4px var(--surface-2),
    var(--shadow-xs);
}

.pixel-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 14px;
}

.pixel-gem {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.3;

  &:nth-child(2) {
    opacity: 0.6;
  }

  &:nth-child(3) {
    opacity: 1;
  }
}

.auth-header h2 {
  margin: 0 0 6px;
  color: var(--text);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.auth-header p {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

.auth-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-input__wrapper) {
    min-height: 40px;
  }
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 2px 0 20px;
  font-size: 12px;
}

.free-login-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-3);
  cursor: pointer;
  user-select: none;
}

.toggle-track {
  position: relative;
  width: 32px;
  height: 18px;
  flex-shrink: 0;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--surface-3);
  transition:
    background-color 0.18s var(--ease),
    border-color 0.18s var(--ease);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  transition: transform 0.18s var(--ease);
}

.toggle-on {
  background: var(--accent);
  border-color: var(--accent);

  .toggle-thumb {
    transform: translateX(14px);
    background: #fff;
  }
}

.forgot-link {
  color: var(--text-3);
  cursor: pointer;
  transition: color 0.15s var(--ease);

  & + & {
    margin-left: 10px;
  }

  &:hover {
    color: var(--accent);
  }
}

.submit-button {
  width: 100%;
  height: 42px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
}

.switch-mode {
  margin-top: 16px;
  color: var(--text-3);
  font-size: 12px;
  text-align: center;
}

.switch-link {
  color: var(--accent);
  cursor: pointer;
  font-weight: 500;
}

.portrait {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
}

.avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 500;
}

.avatar-img {
  position: relative;
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--border-strong);
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text-3);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease);

  &:hover {
    border-color: var(--accent);
    background: var(--accent-softer);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  input {
    display: none;
  }
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 6px;
}

.strength-bar-track {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
}

.strength-bar-fill {
  height: 100%;
  border-radius: inherit;
  transition:
    width 0.25s var(--ease),
    background-color 0.25s var(--ease);
}

.strength-label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.custom-form-item {
  :deep(.el-form-item__content) {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: nowrap;
  }
}

.svg-img {
  width: 118px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  cursor: pointer;
  overflow: hidden;

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}

.mt-15 {
  margin-top: 4px;
}

:global(.adventurer-auth-dialog) {
  max-width: calc(100vw - 28px);
  overflow: hidden;
}

@media (width <= 980px) {
  .home-main {
    grid-template-columns: 1fr;
    gap: 40px;
    padding-top: 24px;
  }

  .hero {
    max-width: 640px;
  }

  .hero-visual {
    order: 2;
    max-width: 440px;
    margin: 0 auto;
    width: 100%;
  }

  .float-card {
    display: none;
  }

  .visual-card {
    width: 100%;
    transform: none;
  }
}

@media (width <= 640px) {
  .home {
    padding: 0 18px;
  }

  .home-header {
    height: 66px;
  }

  .status-pill {
    display: none;
  }

  .home-main {
    padding: 20px 0 40px;
  }

  .title {
    font-size: 48px;
  }

  .hero-text {
    font-size: 15px;
  }

  .features {
    grid-template-columns: 1fr;
    margin-top: 32px;
  }

  .feature-desc {
    white-space: normal;
  }

  .bottom-bar {
    flex-wrap: wrap;
    gap: 10px;
    padding-bottom: 20px;
  }

  .copyright {
    width: 100%;
    margin-left: 0;
  }

  .svg-img {
    width: 96px;
  }

  .form-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .caret {
    animation: none;
  }
}
</style>
