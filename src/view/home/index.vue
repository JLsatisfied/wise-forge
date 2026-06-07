<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, User, VideoCameraFilled, Key, Message, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { userApi } from '@/api/user.ts'
import forge from 'node-forge'
import { useStore } from '@/store/index.ts'
import useFileUpload from '@/composables/useFileUpload.ts'

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
const stars = ref(
  Array.from({ length: 20 }, () => ({
    left: Math.random() * 100 + '%',
    top: Math.random() * 60 + '%',
    delay: Math.random() * 2 + 's'
  }))
)

const features = [
  { icon: '◇', title: 'AI 魔法对话', desc: '多模型智能问答', color: '#7dd8c7' },
  { icon: '◆', title: '模板工坊', desc: '百变角色预设', color: '#d8a657' },
  { icon: '◈', title: '智能客服', desc: '一键嵌入站点', color: '#6d7fb6' }
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
    { level: 1, label: '弱不禁风', color: '#c97b7b', width: '20%' },
    { level: 2, label: '初入江湖', color: '#f3c766', width: '40%' },
    { level: 3, label: '勇者之盾', color: '#7dd8c7', width: '65%' },
    { level: 4, label: '史诗护符', color: '#d8a657', width: '85%' },
    { level: 5, label: '传说结界', color: '#c9fff2', width: '100%' }
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
    <!-- 像素风格背景装饰 -->
    <div class="pixel-bg">
      <div class="pixel-grid"></div>
      <div class="pixel-stars">
        <span
          v-for="(star, i) in stars"
          :key="i"
          class="star"
          :style="{
            left: star.left,
            top: star.top,
            animationDelay: star.delay
          }"
        ></span>
      </div>
    </div>

    <div class="character">
      <img src="./images/Serendale.png" alt="" />
    </div>
    <div class="middle pt-65 ml-120">
      <h1 class="title">冒险纪元</h1>
      <span class="text">{{ typedText }}</span>
    </div>
    <div class="btn ml-120">
      <div class="btn-default login pixel-btn" @click="openDialog">开启旅途</div>
    </div>
    <div class="features ml-120">
      <div
        v-for="(feat, i) in features"
        :key="i"
        class="feature-card"
        :style="{
          '--feat-color': feat.color,
          animationDelay: 0.3 + i * 0.2 + 's'
        }"
      >
        <span class="feature-icon">{{ feat.icon }}</span>
        <div class="feature-info">
          <span class="feature-title">{{ feat.title }}</span>
          <span class="feature-desc">{{ feat.desc }}</span>
        </div>
      </div>
    </div>
    <div class="bottom-bar">
      <span class="bar-item"> <span class="bar-icon">◆</span> 未来智匠 </span>
      <span class="bar-divider">◇</span>
      <span class="bar-item"> <span class="bar-icon">◆</span> AI 冒险世界 </span>
      <span class="bar-divider">◇</span>
      <span class="bar-item"> <span class="bar-icon">◆</span> 静候勇者 </span>
    </div>
    <el-dialog
      v-model="dialogVisible"
      :width="
        isUiModule == 'login' || isUiModule == 'resetPassword' || isUiModule == 'newCode'
          ? '400px'
          : '500px'
      "
      center
      :show-close="false"
      class="adventurer-auth-dialog pixel-dialog"
      align-center
    >
      <div class="auth-container">
        <div class="auth-header">
          <div class="header-content">
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
              <el-icon :size="20" color="#4a7c3f" v-if="!registerForm.img_url"><Plus /></el-icon>
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
                    background: passwordStrength.color,
                    boxShadow: `0 0 8px ${passwordStrength.color}`
                  }"
                ></div>
              </div>
              <span
                class="strength-label"
                :style="{
                  color: passwordStrength.color,
                  textShadow: `0 0 6px ${passwordStrength.color}`
                }"
              >
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
@use 'sass:color';

/* 精致奇幻像素游戏风格配色 */
$neon-cyan: #7dd8c7;
$neon-cyan-dark: #3f9f91;
$neon-cyan-light: #c9fff2;
$neon-magenta: #d8a657;
$neon-magenta-dark: #9b6a2d;
$neon-magenta-light: #ffe0a0;
$neon-purple: #6d7fb6;
$neon-purple-dark: #37446f;
$neon-orange: #c87941;
$neon-yellow: #f3c766;
$pixel-bg-dark: #07111f;
$pixel-bg: #101c2e;
$pixel-dialog-bg: rgba(13, 22, 36, 0.96);
$pixel-text: #f7ead0;
$pixel-text-muted: #b6a989;
$pixel-border: #31415b;

h1,
h2 {
  margin: 0;
}

.home {
  width: 100vw;
  height: 100vh;
  background:
    radial-gradient(ellipse at 20% 80%, rgba($neon-magenta, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba($neon-cyan, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($neon-purple, 0.1) 0%, transparent 70%),
    linear-gradient(180deg, #0a0a12 0%, #12121f 50%, #0a0a12 100%);
  position: relative;
  overflow: hidden;
}

/* 像素背景 */
.pixel-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;

  .pixel-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba($neon-cyan, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba($neon-cyan, 0.03) 1px, transparent 1px);
    background-size: 4px 4px;
  }

  .pixel-stars {
    position: absolute;
    inset: 0;

    .star {
      position: absolute;
      width: 2px;
      height: 2px;
      background: #fff;
      animation: neon-twinkle 2s ease-in-out infinite;

      &::before {
        content: '';
        position: absolute;
        width: 6px;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba($neon-cyan, 0.8), transparent);
        top: 0;
        left: -2px;
      }

      &::after {
        content: '';
        position: absolute;
        width: 2px;
        height: 6px;
        background: linear-gradient(180deg, transparent, rgba($neon-cyan, 0.8), transparent);
        left: 0;
        top: -2px;
      }

      &:nth-child(odd) {
        &::before {
          background: linear-gradient(90deg, transparent, rgba($neon-magenta, 0.8), transparent);
        }

        &::after {
          background: linear-gradient(180deg, transparent, rgba($neon-magenta, 0.8), transparent);
        }
      }
    }
  }
}

@keyframes neon-twinkle {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1.5);
  }
}

@keyframes text-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-20px);
  }
}

@keyframes neon-flicker {
  0%,
  19%,
  21%,
  23%,
  25%,
  54%,
  56%,
  100% {
    text-shadow:
      0 0 10px currentcolor,
      0 0 20px currentcolor,
      0 0 40px currentcolor,
      0 0 80px currentcolor;
  }

  20%,
  24%,
  55% {
    text-shadow: none;
  }
}

.character {
  position: absolute;
  top: 30%;
  left: 2%;

  img {
    image-rendering: pixelated;
    filter: drop-shadow(0 0 10px rgba($neon-cyan, 0.5))
      drop-shadow(0 0 20px rgba($neon-magenta, 0.3));
  }
}

.middle {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-family: myFirstFont;
  font-size: 50px;
  font-weight: bold;
  color: #fff;
  animation: text-float 3s infinite;
  letter-spacing: 20px;
  background: linear-gradient(135deg, $neon-cyan, $neon-magenta, $neon-cyan);
  background-size: 200% 200%;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 30px rgba($neon-cyan, 0.5));
  animation:
    text-float 3s infinite,
    gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }
}

.text {
  color: $neon-cyan-light;
  font-family: myFirstFont, 'Clash Grotesk';
  font-size: 30px;
  font-weight: 500;
  text-align: center;
  padding-top: 60px;
  text-shadow:
    0 0 10px rgba($neon-cyan, 0.8),
    0 0 20px rgba($neon-cyan, 0.4);
}

.text::after {
  display: inline-block;
  content: '▮';
  color: $neon-magenta;
  animation: cursor-blink 0.8s step-end infinite;
  margin-left: 4px;
  text-shadow:
    0 0 10px $neon-magenta,
    0 0 20px $neon-magenta;
}

@keyframes cursor-blink {
  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

.btn {
  display: flex;
  justify-content: center;
  margin-top: 90px;
  font-family: myFirstFont;
}

.btn-default {
  width: 200px;
  height: 60px;
  line-height: 60px;
  text-align: center;
  cursor: pointer;
  color: #fff;
  font-size: 20px;
  transition: all 0.2s ease;
}

/* 现代像素风格按钮 - 霓虹发光 */
.pixel-btn {
  margin-left: -1rem;
  animation: card-fade-in 0.6s ease forwards;
  background: linear-gradient(
    180deg,
    rgba($neon-purple, 0.35) 0%,
    rgba($neon-purple, 0.18) 50%,
    rgba($neon-purple, 0.08) 100%
  );
  border: 2px solid $neon-purple;
  position: relative;
  letter-spacing: 20px;
  text-indent: 20px;
  backdrop-filter: blur(10px);

  /* 霓虹发光效果 */
  box-shadow:
    0 0 10px rgba($neon-purple, 0.5),
    0 0 20px rgba($neon-purple, 0.3),
    0 0 40px rgba($neon-purple, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  text-shadow: 0 0 10px $neon-purple;

  /* 像素角效果 */
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover {
    background: linear-gradient(
      180deg,
      rgba($neon-purple, 0.55) 0%,
      rgba($neon-purple, 0.3) 50%,
      rgba($neon-purple, 0.15) 100%
    );
    border-color: color.adjust($neon-purple, $lightness: 15%);
    transform: translateY(-2px);
    box-shadow:
      0 0 15px rgba($neon-purple, 0.7),
      0 0 30px rgba($neon-purple, 0.5),
      0 0 60px rgba($neon-purple, 0.3),
      0 5px 20px rgba($neon-purple, 0.4);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(1px);
    box-shadow:
      0 0 10px rgba($neon-purple, 0.5),
      0 0 20px rgba($neon-purple, 0.3);
  }
}

/* 功能特色卡片 */
.features {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 56px;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  background: rgba($pixel-bg, 0.7);
  border: 1px solid rgba($neon-cyan, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  opacity: 0;
  animation: card-fade-in 0.6s ease forwards;
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );

  &:hover {
    border-color: var(--feat-color);
    transform: translateY(-3px);
    box-shadow:
      0 0 15px color-mix(in srgb, var(--feat-color) 30%, transparent),
      0 5px 20px rgba(0, 0, 0, 0.3);
    background: rgba($pixel-bg, 0.85);

    .feature-icon {
      text-shadow: 0 0 12px var(--feat-color);
      transform: scale(1.15);
    }
  }
}

@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feature-icon {
  font-size: 24px;
  color: var(--feat-color);
  transition: all 0.3s ease;
  text-shadow: 0 0 6px var(--feat-color);
}

.feature-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feature-title {
  color: $pixel-text;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 2px;
}

.feature-desc {
  color: $pixel-text-muted;
  font-size: 12px;
  letter-spacing: 1px;
}

/* 像素风格对话框 - 玻璃态霓虹边框 */
.adventurer-auth-dialog {
  &.pixel-dialog {
    :deep(.el-dialog) {
      border-radius: 0;
      background: $pixel-dialog-bg;
      border: 2px solid transparent;
      position: relative;
      backdrop-filter: blur(20px);

      /* 像素角 */
      clip-path: polygon(
        0 8px,
        8px 8px,
        8px 0,
        calc(100% - 8px) 0,
        calc(100% - 8px) 8px,
        100% 8px,
        100% calc(100% - 8px),
        calc(100% - 8px) calc(100% - 8px),
        calc(100% - 8px) 100%,
        8px 100%,
        8px calc(100% - 8px),
        0 calc(100% - 8px)
      );

      /* 霓虹边框效果 */
      &::before {
        content: '';
        position: absolute;
        inset: -2px;
        background: linear-gradient(135deg, $neon-cyan, $neon-magenta, $neon-purple, $neon-cyan);
        background-size: 300% 300%;
        animation: border-glow 4s ease infinite;
        z-index: -1;
        clip-path: polygon(
          0 8px,
          8px 8px,
          8px 0,
          calc(100% - 8px) 0,
          calc(100% - 8px) 8px,
          100% 8px,
          100% calc(100% - 8px),
          calc(100% - 8px) calc(100% - 8px),
          calc(100% - 8px) 100%,
          8px 100%,
          8px calc(100% - 8px),
          0 calc(100% - 8px)
        );
      }

      /* 内部遮罩 */
      &::after {
        content: '';
        position: absolute;
        inset: 2px;
        background: $pixel-dialog-bg;
        z-index: -1;
        clip-path: polygon(
          0 6px,
          6px 6px,
          6px 0,
          calc(100% - 6px) 0,
          calc(100% - 6px) 6px,
          100% 6px,
          100% calc(100% - 6px),
          calc(100% - 6px) calc(100% - 6px),
          calc(100% - 6px) 100%,
          6px 100%,
          6px calc(100% - 6px),
          0 calc(100% - 6px)
        );
      }

      box-shadow:
        0 0 30px rgba($neon-cyan, 0.3),
        0 0 60px rgba($neon-magenta, 0.2),
        0 25px 50px rgba(0, 0, 0, 0.5);
    }

    :deep(.el-dialog__header) {
      display: none;
    }

    :deep(.el-dialog__body) {
      padding: 40px;
      position: relative;
      background: 
        /* 扫描线效果 */ repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba($neon-cyan, 0.01) 2px,
        rgba($neon-cyan, 0.01) 4px
      );
    }
  }
}

@keyframes border-glow {
  0%,
  100% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }
}

.auth-container {
  .auth-header {
    text-align: center;
    margin-bottom: 32px;
    position: relative;

    .pixel-decoration {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 20px;

      .pixel-gem {
        width: 8px;
        height: 8px;
        background: $neon-cyan;
        animation: gem-glow 1.5s ease-in-out infinite;
        box-shadow:
          0 0 10px $neon-cyan,
          0 0 20px $neon-cyan;

        &:nth-child(2) {
          animation-delay: 0.3s;
          background: $neon-magenta;
          box-shadow:
            0 0 10px $neon-magenta,
            0 0 20px $neon-magenta;
        }

        &:nth-child(3) {
          animation-delay: 0.6s;
        }
      }
    }

    .header-content {
      position: relative;
      z-index: 1;
      padding: 0 20px;

      &::before,
      &::after {
        content: '══════════════';
        display: block;
        background: linear-gradient(
          90deg,
          transparent,
          $neon-cyan,
          $neon-magenta,
          $neon-cyan,
          transparent
        );
        background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-family: monospace;
        letter-spacing: -2px;
        opacity: 0.8;
      }

      &::before {
        margin-bottom: 16px;
      }

      &::after {
        margin-top: 16px;
      }
    }

    h2 {
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 8px;
      background: linear-gradient(135deg, $neon-cyan, #fff, $neon-magenta);
      background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 10px rgba($neon-cyan, 0.5));
      font-family: 'Noto Sans JP', sans-serif;
    }

    p {
      color: $pixel-text-muted;
      margin: 0;
      font-size: 14px;
    }
  }

  .auth-form {
    :deep(.el-input) {
      .el-input__wrapper {
        border-radius: 0;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba($neon-cyan, 0.3);
        transition: all 0.2s;
        backdrop-filter: blur(5px);

        /* 像素角 */
        // clip-path: polygon(
        //   0 3px, 3px 3px, 3px 0,
        //   calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
        //   100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
        //   3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
        // );

        box-shadow:
          inset 0 0 10px rgba(0, 0, 0, 0.5),
          0 0 5px rgba($neon-cyan, 0.1) !important;

        &:hover {
          border-color: rgba($neon-cyan, 0.6);
          box-shadow:
            inset 0 0 10px rgba(0, 0, 0, 0.5),
            0 0 10px rgba($neon-cyan, 0.2) !important;
        }

        &.is-focus {
          border-color: $neon-cyan;
          box-shadow:
            inset 0 0 10px rgba(0, 0, 0, 0.3),
            0 0 15px rgba($neon-cyan, 0.4),
            0 0 30px rgba($neon-cyan, 0.2) !important;
        }
      }

      .el-input__prefix-icon {
        font-size: 18px;
        color: $neon-cyan;
        filter: drop-shadow(0 0 5px $neon-cyan);
      }
    }

    .form-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      .free-login-toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select: none;
        transition: filter 0.2s ease;

        &:hover {
          filter: brightness(1.1);
        }
      }

      .toggle-text {
        font-size: 13px;
        color: $pixel-text-muted;
        letter-spacing: 0.04em;
        text-shadow: 0 0 8px rgba($neon-cyan, 0.3);
        transition:
          color 0.2s,
          text-shadow 0.2s;
      }

      .toggle-track {
        width: 40px;
        height: 22px;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid rgba($neon-cyan, 0.3);
        position: relative;
        transition: all 0.25s ease;
        clip-path: polygon(
          0 3px,
          3px 3px,
          3px 0,
          calc(100% - 3px) 0,
          calc(100% - 3px) 3px,
          100% 3px,
          100% calc(100% - 3px),
          calc(100% - 3px) calc(100% - 3px),
          calc(100% - 3px) 100%,
          3px 100%,
          3px calc(100% - 3px),
          0 calc(100% - 3px)
        );

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          background: rgba($neon-cyan, 0.6);
          transition: all 0.25s ease;
          clip-path: polygon(
            0 2px,
            2px 2px,
            2px 0,
            calc(100% - 2px) 0,
            calc(100% - 2px) 2px,
            100% 2px,
            100% calc(100% - 2px),
            calc(100% - 2px) calc(100% - 2px),
            calc(100% - 2px) 100%,
            2px 100%,
            2px calc(100% - 2px),
            0 calc(100% - 2px)
          );
        }
      }

      .toggle-track.toggle-on {
        background: rgba($neon-cyan, 0.25);
        border-color: $neon-cyan;
        box-shadow:
          0 0 12px rgba($neon-cyan, 0.5),
          0 0 24px rgba($neon-cyan, 0.2);

        .toggle-thumb {
          left: 20px;
          background: $neon-cyan-light;
          box-shadow: 0 0 10px $neon-cyan;
        }

        & ~ .toggle-text {
          color: $neon-cyan-light;
          text-shadow: 0 0 12px rgba($neon-cyan, 0.6);
        }
      }

      .forgot-link {
        color: $neon-magenta;
        text-decoration: none;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          color: $neon-magenta-light;
          text-shadow: 0 0 15px rgba($neon-magenta, 0.8);
        }

        &.amend {
          margin-right: 10px;
        }
      }
    }

    .submit-button.pixel-submit {
      width: 100%;
      height: 44px;
      border-radius: 0;
      font-size: 16px;
      font-weight: 500;
      background: linear-gradient(
        180deg,
        rgba($neon-purple, 0.4) 0%,
        rgba($neon-purple, 0.2) 50%,
        rgba($neon-purple, 0.1) 100%
      );
      border: 2px solid $neon-purple;
      color: #fff;
      position: relative;
      transition: all 0.2s;
      backdrop-filter: blur(10px);

      /* 像素角 */
      clip-path: polygon(
        0 4px,
        4px 4px,
        4px 0,
        calc(100% - 4px) 0,
        calc(100% - 4px) 4px,
        100% 4px,
        100% calc(100% - 4px),
        calc(100% - 4px) calc(100% - 4px),
        calc(100% - 4px) 100%,
        4px 100%,
        4px calc(100% - 4px),
        0 calc(100% - 4px)
      );
      text-shadow: 0 0 10px $neon-purple;
      box-shadow:
        0 0 10px rgba($neon-purple, 0.5),
        0 0 20px rgba($neon-purple, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);

      &:hover {
        background: linear-gradient(
          180deg,
          rgba($neon-purple, 0.6) 0%,
          rgba($neon-purple, 0.3) 50%,
          rgba($neon-purple, 0.2) 100%
        );

        // border-color: lighten($neon-purple, 10%);
        transform: translateY(-2px);
        box-shadow:
          0 0 15px rgba($neon-purple, 0.7),
          0 0 30px rgba($neon-purple, 0.5),
          0 5px 20px rgba($neon-purple, 0.4);
      }

      &:active {
        transform: translateY(1px);
        box-shadow:
          0 0 10px rgba($neon-purple, 0.5),
          0 0 20px rgba($neon-purple, 0.3);
      }

      &.mt-15 {
        margin-top: 15px;
      }
    }

    .switch-mode {
      text-align: center;
      margin-top: 16px;
      color: $pixel-text-muted;
      font-size: 14px;

      .switch-link {
        color: $neon-cyan;
        text-decoration: none;
        margin-left: 4px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          color: $neon-cyan-light;
          text-shadow: 0 0 15px rgba($neon-cyan, 0.8);
        }
      }
    }
  }
}

@keyframes gem-glow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.5);
  }
}

:deep(.el-input__inner) {
  color: $pixel-text;
}

/* 密码强度指示器 */
.password-strength {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.strength-bar-track {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba($neon-cyan, 0.1);
  overflow: hidden;
  clip-path: polygon(
    0 1px,
    1px 1px,
    1px 0,
    calc(100% - 1px) 0,
    calc(100% - 1px) 1px,
    100% 1px,
    100% calc(100% - 1px),
    calc(100% - 1px) calc(100% - 1px),
    calc(100% - 1px) 100%,
    1px 100%,
    1px calc(100% - 1px),
    0 calc(100% - 1px)
  );
}

.strength-bar-fill {
  height: 100%;
  transition:
    width 0.4s ease,
    background 0.3s ease;

  &::after {
    content: '';
    display: block;
    margin: 1px 2px 0;
    height: 2px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent);
  }
}

.strength-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  flex-shrink: 0;
  transition: all 0.3s ease;
  font-family: myFirstFont, 'VT323', monospace;
}

.portrait {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.avatar {
  color: $pixel-text-muted;
}

.avatar-img {
  width: 60px;
  height: 60px;
  border-radius: 0;
  margin-left: 12px;
  background: linear-gradient(135deg, rgba($neon-cyan, 0.2), rgba($neon-magenta, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid rgba($neon-cyan, 0.5);
  backdrop-filter: blur(5px);

  /* 像素角 */
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
  box-shadow:
    0 0 10px rgba($neon-cyan, 0.3),
    inset 0 0 20px rgba(0, 0, 0, 0.3);
}

.avatar-img:hover {
  background: linear-gradient(135deg, rgba($neon-cyan, 0.4), rgba($neon-magenta, 0.4));
  border-color: $neon-cyan;
  box-shadow:
    0 0 15px rgba($neon-cyan, 0.5),
    0 0 30px rgba($neon-cyan, 0.3),
    inset 0 0 20px rgba(0, 0, 0, 0.2);
}

.avatar-img input {
  display: none;
}

.avatar-img img {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 0;
  image-rendering: pixelated;
}

:deep(.custom-form-item .el-form-item__content) {
  justify-content: space-between;
}

.svg-img {
  display: flex;
  align-items: center;
  cursor: pointer;
  border: 1px solid rgba($neon-cyan, 0.3);
  background: rgba(0, 0, 0, 0.4);
  padding: 4px;
  backdrop-filter: blur(5px);
  transition: all 0.2s;

  &:hover {
    border-color: $neon-cyan;
    box-shadow: 0 0 10px rgba($neon-cyan, 0.3);
  }
}

/* 底部状态栏 — 冒险者 HUD */
.bottom-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 24px;
  background: rgba($pixel-bg, 0.65);
  border: 1px solid rgba($neon-cyan, 0.12);
  backdrop-filter: blur(10px);
  font-size: 12px;
  color: $pixel-text-muted;
  letter-spacing: 2px;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );

  .bar-item {
    display: flex;
    align-items: center;
    gap: 5px;
    color: $pixel-text;
    font-size: 12px;
  }

  .bar-icon {
    font-size: 8px;
    color: $neon-magenta;
    text-shadow: 0 0 6px rgba($neon-magenta, 0.6);
  }

  .bar-divider {
    font-size: 6px;
    color: rgba($neon-cyan, 0.25);
  }
}
</style>

<style>
/* 弹窗遮罩层 - 深色模糊背景 */
.el-overlay {
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.9) 100%
  ) !important;
  backdrop-filter: blur(8px);
}

.adventurer-auth-dialog.pixel-dialog {
  background-color: transparent;
}

.el-dialog.is-align-center.adventurer-auth-dialog {
  margin-top: 100px;
}

/* 登录成功通知 — 像素游戏风格 */
.pixel-notify {
  background: linear-gradient(
    135deg,
    rgba(16, 28, 46, 0.97) 0%,
    rgba(20, 35, 55, 0.97) 100%
  ) !important;
  border: 2px solid #7dd8c7 !important;
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 15px rgba(125, 216, 199, 0.6),
    0 0 40px rgba(125, 216, 199, 0.3),
    0 0 80px rgba(216, 166, 87, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
  clip-path: polygon(
    0 8px,
    8px 8px,
    8px 0,
    calc(100% - 8px) 0,
    calc(100% - 8px) 8px,
    100% 8px,
    100% calc(100% - 8px),
    calc(100% - 8px) calc(100% - 8px),
    calc(100% - 8px) 100%,
    8px 100%,
    8px calc(100% - 8px),
    0 calc(100% - 8px)
  );
}

.pixel-notify .el-notification__title {
  font-family: myFirstFont;
  font-size: 20px;
  color: #fff;
  text-shadow:
    0 0 10px #7dd8c7,
    0 0 25px #7dd8c7;
}

.pixel-notify .el-notification__content {
  color: #c9fff2;
  font-size: 14px;
}

.pixel-notify .el-notification__icon {
  color: #7dd8c7;
  filter: drop-shadow(0 0 8px #7dd8c7);
}
</style>
