<script setup lang="ts">
import { reactive, ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
// import MarkdownIt from 'markdown-it'
// import mdKatex from '@traptitech/markdown-it-katex'
// import hljs from 'highlight.js';
// import vue from 'highlight.js/lib/languages/xml';
// import react from 'highlight.js/lib/languages/xml';
// import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/a11y-dark.css'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import Clipboard from 'clipboard'
import { aicgApi } from '@/api/aicg.ts'
import { userApi } from '@/api/user.ts'
import TemplateDialog from './components/TemplateDialog.vue'
import UserProfileModal from './components/UserProfileModal.vue'
import NavBar from './components/NavBar.vue'
import SideBar from './components/SideBar.vue'
import ChatMessageItem from './components/ChatMessageItem.vue'
import ChatInput from './components/ChatInput.vue'
import { useRouter } from 'vue-router'
import {
  allInstall,
  categories,
  menuObject,
  promptObject,
  templateObject,
  aiModelsObject,
  requestObject
} from '@/utils/types/ai'
import { BASE_URL } from '@/utils/http/config'
import { useStore } from '@/store/index'
import useFileUpload from '@/composables/useFileUpload'
import useSpeech from '@/composables/useSpeech'

// hljs.registerLanguage('vue', vue);
// hljs.registerLanguage('react', react);
// hljs.registerLanguage('xml', xml);

defineOptions({
  name: 'IntelligencePage'
})

// Worker 懒加载 + 消息队列，避免模块初始化时阻塞首屏渲染
let _worker: Worker | null = null
const _workerPendingQueue: Array<(value: string) => void> = []
const getWorker = (): Worker => {
  if (!_worker) {
    _worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module'
    })
    _worker.onmessage = e => {
      const resolve = _workerPendingQueue.shift()
      if (resolve) resolve(e.data)
    }
  }
  return _worker
}

const CONSTATNS = {
  // API相关
  API: {
    BASE_URL: BASE_URL,
    DEEPSEEK_MODULE: 'deepseekMoudle',
    CHAT_COMPLETIONS: '/api/v1/chat/completions',
    AUTH_TOKEN: 'yUDjNwVwNQrHsLFhhBsb:dkfswmKhaaxrGARTTgJG'
  },
  // 模型相关
  MODELS: {
    DEEPSEEK_V3: 'deepseek-v4-flash',
    SPARK_ULTRA: 'spark-pro',
    DEFAULT_MODULE: 'deepseek-v4-flash', // deepseek快速模式
    REASONER_MODULE: 'deepseek-reasoner' // deepseek思考模式
  },
  // 消息提示
  MESSAGES: {
    COPY_SUCCESS: '铭文已复制',
    COPY_FAILED: '铭文复制失败',
    INPUT_REQUIRED: '冒险者，请输入你的疑问',
    ANSWERING: '回答中，请稍后再试',
    CLEAR_DISABLED: '回答中，无法清除冒险日志，请先停止输出',
    NO_MESSAGES: '没有冒险日志可以清除',
    SERVER_ERROR: '魔法塔繁忙，请稍后再试',
    REASONER_ONLY: '只允许 DeepSeek 模型使用贤者沉思模式',
    MODEL_SWITCH_DISABLED: '此次冒险只能使用 Spark Pro 大模型',
    REASONER_NOT_SUPPORTED: 'Spark Pro 模型不支持贤者沉思',
    DOWNLOAD_SUCCESS: '卷轴导出成功',
    DOWNLOAD_FAILED: '卷轴导出失败，请重试',
    DELETE_SUCCESS: '冒险日志已删除'
  },
  // 默认配置
  DEFAULT: {
    AI_AVATAR: 'https://ai-public.mastergo.com/ai/img_res/62f8190121cf7f46c510bfc3910b9518.jpg',
    USER_AVATAR: 'https://ai-public.mastergo.com/ai/img_res/838a4ab73af1c2e4de9e11a5ce843075.jpg',
    AI_NAME: '冒险AI助手',
    PAGE_SIZE: 3,
    PROMPT_VALUE: 200
  }
}

let aiAvatarUrl = ref(CONSTATNS.DEFAULT.AI_AVATAR)
// 用户信息
const nickAll = reactive({
  nickname: '',
  nicknameId: 0,
  nickImg: CONSTATNS.DEFAULT.USER_AVATAR,
  appid: '',
  userNickname: ''
})
let showUserProfile = ref(false) //是否显示个人信息

const contentText = ref('') // 文字输入
let allText: allInstall[] = reactive([]) // 对话内容

let isGenerate = ref(false)
let imgCurrent = ref('')

const akiText = ref('')
const isAskText = ref(false)

const timeCount = ref(0)
const chatContainer = ref<null | HTMLElement>(null)
const textareaDialogue = ref<null | HTMLElement>(null)
const markdownContent = ref('')
const serviceThinkContent = ref('')
const isAnswering = ref(false) // 是否可以enter
const ctrl = ref<null | AbortController>(null)
const isStopText = ref(false) // 是否显示中断文字
let clipboard = ref<ClipboardJS>()
const isTyping = ref(false) //是否输入中
let categoryData: categories[] = reactive([])
const currentIndex = ref(0) // AI选中
const roleContent = ref('') // 大模型描述
const recordLength = ref(0) // 对话信息长度
const dialogTableVisible = ref(false) // 大模型选择弹窗
const revealAlways = ref({
  revealId: 0,
  revealName: CONSTATNS.DEFAULT.AI_NAME,
  revealImg: CONSTATNS.DEFAULT.AI_AVATAR
})
let promptList: promptObject[] = reactive([])
const promptIndex = ref(0)
let templateList: templateObject[] = reactive([])
const router = useRouter()
let promptValue = ref(CONSTATNS.DEFAULT.PROMPT_VALUE)
let hoveredIndex = ref<number | null>(null)
const disabled = ref(false)
let page = ref(1) // 当前页数
let pageSize = ref(CONSTATNS.DEFAULT.PAGE_SIZE) // 每页展示条目
let total = ref(0) // 总条数
let editIndex = ref(-1)
let editText = ref('')
let currentModel = ref(CONSTATNS.MODELS.DEEPSEEK_V3)
let aiModels: aiModelsObject[] = reactive([
  { id: CONSTATNS.MODELS.DEEPSEEK_V3, name: 'DeepSeek-V3' },
  { id: CONSTATNS.MODELS.SPARK_ULTRA, name: 'Spark Pro' }
])
let isDisabled = ref(true)

let fileInput = ref<null | HTMLInputElement>(null) // 文件上传input

let editAll = ref<{ img_url?: string; nickname?: string; username?: string }>({
  img_url: '',
  nickname: '',
  username: ''
})

// 滚动条参数
let closeScroll = ref(false)
let lastScrollPosition = ref(0)

let isDeepThinking = ref(false)
let isLoadingCategories = ref(true)
let apiModuleId = ref(CONSTATNS.MODELS.DEFAULT_MODULE)
let requestContent: requestObject[] = reactive([])
let responce = ''

let downloadClickHandler: ((e: MouseEvent) => void) | null = null
let _scrollRafId: number | null = null

// 文件上传参数
let filenameAll = ref({
  isFileContent: false,
  name: '',
  size: '',
  type: '',
  status: '1', // 1:上传中, 2:上传成功, 3:上传失败
  url: ''
})
let wordOrpdfText = ref('')

const { selectFile, upImg } = useFileUpload(fileInput, editAll, 1)
const { speakingIndex, speak, stop: stopSpeech } = useSpeech()

onMounted(() => {
  getUser()
  chatContainer.value?.addEventListener('scroll', windowScroll, {
    passive: true
  })

  // 代码块下载/复制按钮点击代理，限定在聊天容器内，避免全 document 监听
  downloadClickHandler = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-code]') as HTMLElement | null
    if (target) {
      const encodedCode = target.getAttribute('data-code') || ''
      const lang = target.getAttribute('data-lang') || ''
      downloadCode(encodedCode, lang)
    }
  }
  chatContainer.value?.addEventListener('click', downloadClickHandler)
})

onUnmounted(() => {
  if (_scrollRafId !== null) {
    cancelAnimationFrame(_scrollRafId)
    _scrollRafId = null
  }
  if (downloadClickHandler) {
    chatContainer.value?.removeEventListener('click', downloadClickHandler)
  }
  chatContainer.value?.removeEventListener('scroll', windowScroll)
  if (clipboard.value) {
    clipboard.value.destroy()
  }
  stopSpeech()
})

const windowScroll = () => {
  if (_scrollRafId !== null) return
  _scrollRafId = requestAnimationFrame(() => {
    _scrollRafId = null
    const el = chatContainer.value
    if (!el) return
    const currentScroll = el.scrollTop
    const direction = currentScroll > lastScrollPosition.value ? 'down' : 'up'
    lastScrollPosition.value = currentScroll
    if (direction == 'up') {
      closeScroll.value = true
    }
  })
}

// 统一消息提示
const showMessage = (
  message: string,
  type: 'success' | 'warning' | 'error' | 'info' = 'info',
  options: Record<string, unknown> = {}
) => {
  ElMessage({
    message,
    type,
    customClass: 'ele-text',
    plain: true,
    ...options
  })
}

// 获取用户信息
const getUser = (showClassInformation: boolean = true) => {
  userApi.getUserData().then(res => {
    if (res.data.code == 0) {
      const { id, nickname, img_url, appid, username } = res.data.users
      nickAll.nicknameId = id
      nickAll.nickname = nickname
      nickAll.nickImg = img_url
      nickAll.appid = appid
      nickAll.userNickname = username
      editAll.value = res.data.users
      if (showClassInformation) {
        getClassInformation(nickAll.nicknameId)
      }
    } else {
      showMessage(res.data.msg, 'error')
    }
  })
}

// 获取用户所有大模型分类
const getClassInformation = (id: number) => {
  isLoadingCategories.value = true
  aicgApi
    .queryCategory({ user_id: id })
    .then(res => {
      if (res.data.code == 0) {
        categoryData.splice(0, categoryData.length)
        categoryData.push(...res.data.data)
      } else {
        showMessage(res.data.msg, 'error')
      }
    })
    .finally(() => {
      isLoadingCategories.value = false
    })
}

// 富文本展示
// const mdi = new MarkdownIt({
//   linkify: true,
//   highlight(code, language) {
//     const validLang = !!(language && hljs.getLanguage(language))
//     if (validLang) {
//       const lang = language ?? ''
//       return highlightBlock(hljs.highlightAuto(code, [lang]).value, lang, code)
//     }
//     return highlightBlock(hljs.highlightAuto(code).value, '', code)
//   }
// })
// mdi.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })

// // 高亮代码区域内容
// const highlightBlock = <T extends string>(str: T, lang: T, word: T) => {
//   // 当前时间加随机数生成唯一的id标识
//   const codeIndex = Date.now() + Math.floor(Math.random() * 10000000)
//   // 使用 TextEncoder 和 TextDecoder 处理特殊字符
//   const encodedCode = btoa(new TextEncoder().encode(word).reduce((data, byte) => data + String.fromCharCode(byte), ''))
//   return `<pre class="pre-code-box"><div class="pre-code-header"><span class="code-block-header__lang">${lang}</span><div class="code-block-header__actions"><span class="code-block-header__copy" data-clipboard-action="copy" data-clipboard-target="#copy${codeIndex}">复制代码</span><span class="code-block-header__download" data-code="${encodedCode}" data-lang="${lang}">下载代码</span></div></div><div class="pre-code"><code class="hljs code-block-body ${lang}">${str}</code></div></pre><textarea style="position: absolute;top: -9999px;left: -9999px;z-index: -9999;" id="copy${codeIndex}">${word}</textarea>`
// }

// 下载代码功能
const downloadCode = (encodedCode: string, language: string) => {
  try {
    // 解码 Base64 编码的代码
    const binaryString = atob(encodedCode)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const code = new TextDecoder().decode(bytes)

    const blob = new Blob([code], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    let targetLanguage = ''
    if (language == 'javascript') {
      targetLanguage = 'js'
    } else if (language == 'typescript') {
      targetLanguage = 'ts'
    } else {
      targetLanguage = language
    }
    a.href = url
    a.download = `code.${targetLanguage}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    showMessage(CONSTATNS.MESSAGES.DOWNLOAD_SUCCESS, 'success')
  } catch {
    showMessage(CONSTATNS.MESSAGES.DOWNLOAD_FAILED, 'error')
  }
}

// 转化成HTML结构
// const getMdiText = <T extends string>(value: T) => {
//     return mdi.render(value)
// }

// 退出登录（调服务端拉黑 token + 本地清理）
const outLogin = () => {
  userApi.logout().then(() => {
    useStore().clearToken()
    router.push('/')
  })
}

// 切换大模型api
const switchModel = (id: string) => {
  if (currentIndex.value) {
    showMessage(CONSTATNS.MESSAGES.MODEL_SWITCH_DISABLED, 'warning')
    return
  }
  if (currentModel.value !== id && apiModuleId.value == 'deepseek-reasoner') {
    showMessage(CONSTATNS.MESSAGES.REASONER_NOT_SUPPORTED, 'warning')
    return
  }
  currentModel.value = id
}

// 复制功能
const copyCode = (ele: string) => {
  if (clipboard.value) {
    clipboard.value.destroy()
  }
  clipboard.value = new Clipboard(ele)
  clipboard.value.on('success', function () {
    showMessage(CONSTATNS.MESSAGES.COPY_SUCCESS, 'success')
  })
  clipboard.value.on('error', function () {
    showMessage(CONSTATNS.MESSAGES.COPY_FAILED, 'error')
  })
}

// 保存对话信息
const saveMessage = () => {
  if (currentModel.value == CONSTATNS.MODELS.DEEPSEEK_V3) {
    requestContent.push({ role: 'assistant', content: responce })
    return
  }
  interface transfer {
    myself_reply: string
    ai_reply: string
    category_id: number
  }
  let data: Array<transfer> = []
  for (let i = recordLength.value; i < allText.length; i++) {
    let transfer = {
      myself_reply: allText[i].userText,
      ai_reply: allText[i].adminContent.adminText,
      category_id: currentIndex.value,
      user_id: nickAll.nicknameId
    }
    data.push(transfer)
  }
  aicgApi.addDialogue(data).then(res => {
    if (res.data.code == 0) {
      onceQueryDialogue(currentIndex.value, 1)
    } else {
      showMessage(res.data.msg, 'warning')
    }
  })
}

// 查询对话信息接口
const onceQueryDialogue = (id: number, index: number) => {
  aicgApi.queryDialogue({ category_id: id, user_id: nickAll.nicknameId }).then(res => {
    if (res.data.code == 0) {
      // 解决异步竞态问题
      if (index == 0 && !(currentIndex.value == id)) {
        return
      }
      allText.splice(0, allText.length)
      allText.push(...res.data.data)
      timeCount.value = allText.length
      recordLength.value = allText.length
      copyCode('.code-block-header__copy')
    } else {
      showMessage(res.data.msg, 'error')
    }
  })
}

// 回车键提交、ctrl+enter组合键换行
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key == 'Enter') {
    event.preventDefault()
    const textarea = event.target as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    textarea.value = value.substring(0, start) + '\n' + value.substring(end)
    textarea.selectionStart = textarea.selectionEnd = start + 1
    adjustTextareaHeight(event)
  } else if (event.key == 'Enter') {
    event.preventDefault()
    sendTxt(contentText.value)
  }
}

// 调整输入框高度
const adjustTextareaHeight = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
}

// worker封装（消息队列模式，防止并发覆盖 onmessage）
const renderInWorker = (content: string): Promise<string> => {
  return new Promise(resolve => {
    const w = getWorker()
    _workerPendingQueue.push(resolve)
    w.postMessage(content)
  })
}

const sendTxt = <T extends string>(value: T) => {
  if (isAnswering.value) {
    showMessage(CONSTATNS.MESSAGES.ANSWERING, 'warning')
    return
  }
  if (!value) {
    showMessage(CONSTATNS.MESSAGES.INPUT_REQUIRED, 'warning')
    return
  }
  if (filenameAll.value.isFileContent && filenameAll.value.status == '1') {
    showMessage('卷轴正在投递中，请稍后再试', 'warning')
    return
  } else if (filenameAll.value.isFileContent && filenameAll.value.status == '3') {
    showMessage('卷轴投递失败，请重新投递', 'warning')
    return
  }
  isAnswering.value = true
  contentText.value = ''
  if (textareaDialogue.value) {
    textareaDialogue.value.style.height = 'auto'
  }
  filenameAll.value.isFileContent = false
  if (currentModel.value == CONSTATNS.MODELS.DEEPSEEK_V3) {
    let messagesContent = ''
    if (akiText.value && isAskText.value) {
      messagesContent = akiText.value + '\n\n' + value
      isAskText.value = false
      akiText.value = ''
    } else {
      messagesContent = value
    }
    if (apiModuleId.value == CONSTATNS.MODELS.REASONER_MODULE) {
      allText.push({
        userText: messagesContent,
        adminContent: { adminText: '', isShow: true },
        thinkContent: {
          thinkText: '',
          status: '1',
          isShow: true,
          isOpen: false
        }
      })
    } else {
      allText.push({
        userText: messagesContent,
        adminContent: { adminText: '', isShow: true }
      })
    }
    requestContent.push({
      role: 'user',
      content: messagesContent + wordOrpdfText.value
    })
    let params = {
      text: requestContent,
      moduleId: apiModuleId.value
    }
    closeScroll.value = false
    ctrl.value = new AbortController()
    fetchEventSource(CONSTATNS.API.BASE_URL + CONSTATNS.API.DEEPSEEK_MODULE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
      signal: ctrl.value.signal,
      openWhenHidden: true,
      onmessage(ev) {
        let res = JSON.parse(ev.data)
        lastScrollPosition.value = 0
        if (
          res.choices &&
          res.choices[0].delta.reasoning_content &&
          apiModuleId.value == CONSTATNS.MODELS.REASONER_MODULE
        ) {
          serviceThinkContent.value += res.choices[0].delta.reasoning_content
          renderInWorker(serviceThinkContent.value).then(thinkText => {
            allText[timeCount.value].thinkContent!.thinkText = thinkText
          })
          //   allText[timeCount.value].thinkContent!.thinkText = getMdiText(serviceThinkContent.value)
          allText[timeCount.value].thinkContent!.status = '1'
          allText[timeCount.value].thinkContent!.isOpen = true
          allText[timeCount.value].adminContent.isShow = false
          isStopText.value = true
        }
        if (serviceThinkContent.value && res.choices && res.choices[0].delta.content) {
          allText[timeCount.value].thinkContent!.status = '3'
        }
        if (res.choices && res.choices[0].delta.content) {
          markdownContent.value += res.choices[0].delta.content
          responce += res.choices[0].delta.content
          allText[timeCount.value].adminContent.isShow = false
          renderInWorker(markdownContent.value).then(adminText => {
            allText[timeCount.value].adminContent.adminText = adminText
          })
          // allText[timeCount.value].adminContent.adminText = getMdiText(markdownContent.value)
          isStopText.value = true
        }
        if (res.message) {
          isAnswering.value = false
          allText[timeCount.value].adminContent.isShow = false
          allText[timeCount.value].adminContent.adminText = res.message
        }
      },
      onclose() {
        // 关闭连接
        markdownContent.value = ''
        serviceThinkContent.value = ''
        timeCount.value = timeCount.value + 1
        isAnswering.value = false
        isStopText.value = false
        isTyping.value = false
        nextTick(() => {
          copyCode('.code-block-header__copy')
        })
        saveMessage()
        closeScroll.value = false
        clearFileText()
      },
      onerror(e) {
        if (apiModuleId.value == CONSTATNS.MODELS.REASONER_MODULE) {
          allText[timeCount.value].thinkContent!.status = '2'
        }
        isAnswering.value = false
        allText[timeCount.value].adminContent.isShow = false
        allText[timeCount.value].adminContent.adminText = CONSTATNS.MESSAGES.SERVER_ERROR
        timeCount.value = timeCount.value + 1
        responce = ''
        throw showMessage(e, 'error')
      }
    })
  } else if (currentModel.value == CONSTATNS.MODELS.SPARK_ULTRA) {
    let messagesContent = ''
    if (akiText.value && isAskText.value) {
      messagesContent = akiText.value + '\n\n' + value
      isAskText.value = false
      akiText.value = ''
    } else {
      messagesContent = value
    }
    allText.push({
      userText: value,
      adminContent: { adminText: '', isShow: true }
    })
    let params = {
      max_tokens: 4096,
      top_k: 4,
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: roleContent.value
        },
        {
          role: 'user',
          content: messagesContent
        }
      ],
      model: 'generalv3',
      stream: true
    }
    closeScroll.value = false
    ctrl.value = new AbortController()
    fetchEventSource(CONSTATNS.API.CHAT_COMPLETIONS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + CONSTATNS.API.AUTH_TOKEN
      },
      body: JSON.stringify(params),
      signal: ctrl.value.signal,
      openWhenHidden: true,
      onmessage(ev) {
        if (ev.data == '[DONE]') {
          console.log('结束', timeCount.value)
          markdownContent.value = ''
          timeCount.value = timeCount.value + 1
          isAnswering.value = false
          isStopText.value = false
          isTyping.value = false
          if (currentIndex.value == 0) {
            return
          }
          saveMessage()
          closeScroll.value = false
          clearFileText()
        } else {
          console.log('结果', ev)
          let res = JSON.parse(ev.data)
          markdownContent.value += res.choices[0].delta.content
          allText[timeCount.value].adminContent.isShow = false
          renderInWorker(markdownContent.value).then(xfText => {
            console.log('timeCount', timeCount.value)
            console.log('all', allText[timeCount.value])
            allText[timeCount.value].adminContent.adminText = xfText
          })
          // allText[timeCount.value].adminContent.adminText = getMdiText(markdownContent.value)
          isStopText.value = true
          lastScrollPosition.value = 0
        }
      },
      onclose() {},
      onerror(e) {
        isAnswering.value = false
        throw showMessage(e, 'error')
      }
    })
  }
}

// 监听聊天内容变化,实时改变聊天内容高度
watch([allText], () => {
  nextTick(() => {
    if (chatContainer.value && !closeScroll.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
})

watch(contentText, newVal => {
  if (newVal) {
    isDisabled.value = false
  } else {
    isDisabled.value = true
  }
})

// 点击左侧大模型分类获取对话信息
const selectMessage = <T extends categories>(item: T) => {
  if (ctrl.value) {
    ctrl.value.abort()
  }
  stopSpeech()
  // replacement()
  currentModel.value = CONSTATNS.MODELS.SPARK_ULTRA
  if (currentModel.value == CONSTATNS.MODELS.SPARK_ULTRA) {
    isDeepThinking.value = false
    apiModuleId.value = CONSTATNS.MODELS.DEFAULT_MODULE
  }
  isGenerate.value = false
  imgCurrent.value = ''
  let { name, my_name, category_img, category_id, introduce } = item
  revealAlways.value.revealName = my_name
  revealAlways.value.revealImg = category_img
  revealAlways.value.revealId = category_id
  currentIndex.value = category_id
  roleContent.value = name + introduce
  closeScroll.value = false
  lastScrollPosition.value = 0
  onceQueryDialogue(category_id, 0)
}

// 停止sse输出
const stopExport = () => {
  if (ctrl.value) {
    ctrl.value.abort()
  }
  if (apiModuleId.value == CONSTATNS.MODELS.REASONER_MODULE) {
    if (allText[timeCount.value].thinkContent!.status == '1') {
      allText[timeCount.value].thinkContent!.status = '2'
      thinkStatus(allText[timeCount.value])
    }
  }
  isStopText.value = false
  isAnswering.value = false
  isTyping.value = false
  markdownContent.value = ''
  serviceThinkContent.value = ''
  timeCount.value = timeCount.value + 1
  nextTick(() => {
    copyCode('.code-block-header__copy')
  })
  saveMessage()
  closeScroll.value = false
  clearFileText()
}

// 清除历史消息
const clear = () => {
  if (isAnswering.value) {
    showMessage(CONSTATNS.MESSAGES.CLEAR_DISABLED, 'warning')
    return
  }
  stopSpeech()
  if (currentModel.value == CONSTATNS.MODELS.SPARK_ULTRA) {
    if (allText.length) {
      aicgApi
        .deleteDialogue({
          category_id: currentIndex.value,
          user_id: nickAll.nicknameId
        })
        .then(res => {
          if (res.data.code == 0) {
            allText.splice(0, allText.length)
            isAnswering.value = false
            timeCount.value = 0
            recordLength.value = 0
            showMessage(res.data.msg, 'success')
          } else {
            showMessage(res.data.msg, 'warning')
          }
        })
    } else {
      showMessage(CONSTATNS.MESSAGES.NO_MESSAGES, 'warning')
    }
  } else {
    allText.splice(0, allText.length)
    timeCount.value = 0
    isAnswering.value = false
  }
}

// 导出对话
const exportConversation = () => {
  if (!allText.length) {
    showMessage('没有冒险日志可以导出', 'warning')
    return
  }
  const title = revealAlways.value.revealName || 'AI对话'
  const date = new Date().toLocaleString('zh-CN')
  const messages = allText
    .map(item => {
      let html = ''
      // 用户消息
      html += `<div class="msg msg--user"><div class="msg__bubble msg__bubble--user">${escapeHtml(item.userText)}</div></div>`
      // 思考内容
      if (item.thinkContent?.thinkText) {
        html += `<div class="msg msg--ai"><div class="msg__bubble msg__bubble--think"><div class="think-label">贤者沉思</div>${item.thinkContent.thinkText}</div></div>`
      }
      // AI 回复
      if (item.adminContent.adminText) {
        html += `<div class="msg msg--ai"><div class="msg__bubble msg__bubble--ai">${item.adminContent.adminText}</div></div>`
      }
      return html
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} - 对话导出</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ui-sans-serif, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #0a0a12; color: #f7ead0; min-height: 100vh;
    padding: 40px 20px;
  }
  .container { max-width: 900px; margin: 0 auto; }
  .header {
    text-align: center; padding-bottom: 32px; margin-bottom: 32px;
    border-bottom: 2px solid rgba(125,216,199,0.2);
  }
  .header h1 { font-size: 24px; color: #7dd8c7; margin-bottom: 8px; }
  .header p { font-size: 13px; color: #b6a989; }
  .msg { display: flex; margin-bottom: 20px; }
  .msg--user { justify-content: flex-end; }
  .msg--ai { justify-content: flex-start; }
  .msg__bubble { max-width: 75%; padding: 12px 16px; font-size: 14px; line-height: 1.7; word-break: break-word; }
  .msg__bubble--user {
    background: linear-gradient(135deg, rgba(125,216,199,0.25), rgba(109,127,182,0.2));
    border: 1px solid rgba(125,216,199,0.35); color: #f7ead0; border-radius: 0;
    clip-path: polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px));
  }
  .msg__bubble--ai {
    background: rgba(16,28,46,0.8); border: 1px solid rgba(49,65,91,0.5); color: #f7ead0; border-radius: 0;
    clip-path: polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px));
  }
  .msg__bubble--ai pre { background: #07111f; border: 1px solid rgba(125,216,199,0.15); padding: 12px; overflow-x: auto; font-size: 13px; margin: 8px 0; }
  .msg__bubble--ai code { font-family: "Cascadia Code", Consolas, monospace; font-size: 13px; background: rgba(125,216,199,0.08); padding: 2px 5px; }
  .msg__bubble--ai pre code { background: none; padding: 0; }
  .msg__bubble--think {
    background: rgba(216,166,87,0.06); border: 1px dashed rgba(216,166,87,0.2); color: #b6a989; font-size: 13px;
    clip-path: polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px));
  }
  .think-label { font-weight: 600; color: #d8a657; font-size: 12px; margin-bottom: 6px; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(125,216,199,0.1); font-size: 12px; color: #b6a989; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <p>导出时间：${date}　|　共 ${allText.length} 轮对话</p>
  </div>
  ${messages}
  <div class="footer">由冒险者公会 · 未来智匠导出</div>
</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}-${Date.now()}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showMessage('冒险日志已导出', 'success')
}

const escapeHtml = (str: string) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 点击页数
const handleCurrentChange = (val: number) => {
  queryPage(val, pageSize.value, promptValue.value)
}

// 查询分类标签下的信息
const optforPrompt = (item: promptObject, index: number) => {
  promptIndex.value = index
  promptValue.value = item.id
  page.value = 1
  queryPage(page.value, pageSize.value, promptValue.value)
}

// 查询类别的大模型
const queryPage = (currentPage: number, pageSize: number, template_id: number) => {
  aicgApi
    .queryTemplate({
      page: currentPage,
      pageSize: pageSize,
      template_id: template_id
    })
    .then(res => {
      if (res.data.code == 0) {
        templateList.splice(0, templateList.length)
        templateList.push(...res.data.data.data)
        total.value = res.data.data.total
      } else {
        showMessage(res.data.msg, 'error')
      }
    })
}

// 新增聊天模型
const cite = (item: templateObject) => {
  let temp = {
    self_introduction: item.info,
    my_name: item.name,
    name: item.characterSettings,
    introduce: item.instructionDescription,
    user_id: nickAll.nicknameId
  }
  aicgApi.addCategory(temp).then(res => {
    if (res.data.code == 0) {
      showMessage(res.data.msg, 'success')
      getClassInformation(nickAll.nicknameId)
    } else {
      showMessage(res.data.msg, 'error')
    }
  })
}

// 点击查询分类
const addClassify = () => {
  dialogTableVisible.value = true
  aicgApi.queryPrompt().then(res => {
    if (res.data.code == 0) {
      promptList.splice(0, promptList.length)
      promptList.push(...res.data.data)
      queryPage(page.value, pageSize.value, promptValue.value)
    } else {
      showMessage(res.data.msg, 'error')
    }
  })
}

// 删除大模型分类
const removeClassify = (item: menuObject) => {
  if (item.label == '删除') {
    aicgApi.deleteCategory({ category_id: item.id }).then(res => {
      if (res.data.code == 0) {
        if (item.id == revealAlways.value.revealId) {
          revealAlways.value = {
            revealId: 0,
            revealName: CONSTATNS.DEFAULT.AI_NAME,
            revealImg: CONSTATNS.DEFAULT.AI_AVATAR
          }
          roleContent.value = ''
          timeCount.value = 0
          currentIndex.value = 0
          allText.splice(0, allText.length)
        }
        showMessage(CONSTATNS.MESSAGES.DELETE_SUCCESS, 'success')
        getClassInformation(nickAll.nicknameId)
      } else {
        showMessage(res.data.msg, 'error')
      }
    })
  }
}

const setHoveredIndex = <T extends number | null>(index: T) => {
  hoveredIndex.value = index
}

// 点击编辑
const editChat = (index: number, text: string) => {
  editIndex.value = index
  editText.value = text
  hoveredIndex.value = null
}

// 取消编辑
const editCancle = () => {
  editIndex.value = -1
}

//  提交修改的用户内容
const editSubmit = () => {
  editIndex.value = -1
  sendTxt(editText.value)
}

// 复制用户内容
const copyDocument = () => {
  copyCode('.copyDocument')
}

const toggleDeepThinking = () => {
  if (currentModel.value == CONSTATNS.MODELS.DEEPSEEK_V3) {
    isDeepThinking.value = !isDeepThinking.value
    apiModuleId.value = isDeepThinking.value
      ? CONSTATNS.MODELS.REASONER_MODULE
      : CONSTATNS.MODELS.DEFAULT_MODULE
    return
  }
  showMessage(CONSTATNS.MESSAGES.REASONER_ONLY, 'warning')
}

const thinkStatus = (item: allInstall) => {
  if (item.thinkContent?.status == '1') {
    return '思考中...'
  } else if (item.thinkContent?.status == '2') {
    return '思考已停止'
  } else if (item.thinkContent?.status == '3') {
    return '已思考完毕'
  }
}

const goTocustomerService = () => {
  router.push({ name: 'customer-service', query: { appid: nickAll.appid } })
}

const saveUserProfile = () => {
  if (!editAll.value.nickname) {
    showMessage('昵称不能为空', 'error')
    return
  }
  userApi
    .updateUser({
      username: editAll.value.username,
      nickname: editAll.value.nickname,
      img_url: editAll.value.img_url
    })
    .then(res => {
      if (res.data.code == 0) {
        showMessage('冒险者档案已更新', 'success')
        showUserProfile.value = false
        getUser(false)
      } else {
        showMessage(res.data.msg, 'error')
      }
    })
}

// 关闭个人信息弹窗
const closeUserProfile = () => {
  editAll.value = {
    img_url: nickAll.nickImg,
    nickname: nickAll.nickname,
    username: nickAll.userNickname
  }
  showUserProfile.value = false
}

// 上传文件
const parseFileInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (!(file.type == 'application/pdf')) {
      showMessage('请上传PDF文件', 'error')
      clearFileText()
      return
    }
    const fileType = file.type.split('/').pop()
    filenameAll.value = {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: fileType || 'unknown',
      isFileContent: true,
      status: '1',
      url: ''
    }
    const formdata = new FormData()
    formdata.append('avatar', file)
    aicgApi
      .uploadFile(formdata)
      .then(res => {
        if (res.data.code == 0) {
          const result = res.data.data
          filenameAll.value.status = '2'
          filenameAll.value.url = result.url
          wordOrpdfText.value = result.text
        } else {
          filenameAll.value.status = '3'
          showMessage(res.data.msg, 'error')
        }
      })
      .catch(() => {
        filenameAll.value.status = '3'
      })
  }
}

// 初始值
const clearFileText = () => {
  filenameAll.value = {
    isFileContent: false,
    name: '',
    size: '',
    type: '',
    status: '1',
    url: ''
  }
  wordOrpdfText.value = ''
}

const openUrl = () => {
  if (filenameAll.value.url) {
    window.open(filenameAll.value.url, '_blank')
  }
}

const openUserProfile = () => {
  showUserProfile.value = true
}
</script>

<template>
  <div class="pixel-page min-h-screen">
    <SideBar
      :is-loading-categories="isLoadingCategories"
      :category-data="categoryData"
      :current-index="currentIndex"
      @add-classify="addClassify"
      @select-message="selectMessage"
      @remove-classify="removeClassify"
      @go-customer-service="goTocustomerService"
    />
    <!-- 主内容区 -->
    <div class="pixel-main">
      <NavBar
        :reveal-name="revealAlways.revealName"
        :nick-img="nickAll.nickImg"
        :nickname="nickAll.nickname"
        :ai-models="aiModels"
        :current-model="currentModel"
        @switch-model="switchModel"
        @open-user-profile="openUserProfile"
        @out-login="outLogin"
      />
      <UserProfileModal
        :show-user-profile="showUserProfile"
        :edit-all="editAll"
        :nick-all="nickAll"
        @close="closeUserProfile"
        @save="saveUserProfile"
        @select-file="selectFile"
        @upload-img="upImg"
      />
      <!-- 聊天区域 -->
      <div
        class="pixel-chat-wrap max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-180px)] flex flex-col min-w-0 w-full"
      >
        <div
          class="flex-1 overflow-y-auto overflow-x-hidden pr-4 pb-4 chat-wrapper min-w-0"
          ref="chatContainer"
          :class="isStopText ? 'wrapper' : ''"
        >
          <template v-for="(item, index) in allText" :key="index">
            <!-- 编辑模式：保留在父组件，直接操作 editText ref -->
            <div class="flex justify-end relative" v-if="editIndex == index">
              <div class="chat-edit">
                <textarea
                  name="content"
                  class="chat-edit-textarea text-sm"
                  v-model="editText"
                ></textarea>
                <div class="chat-edit-execute">
                  <button
                    type="button"
                    class="pixel-btn pixel-btn-ghost px-3 py-1 text-sm cursor-pointer"
                    @click="editCancle"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    :disabled="!editText || isAnswering"
                    :class="editText && !isAnswering ? '' : 'area-disabled'"
                    class="ml-2 pixel-btn pixel-btn-primary px-3 py-1 text-sm cursor-pointer"
                    @click="editSubmit"
                  >
                    发送
                  </button>
                </div>
              </div>
              <div class="flex gap-2 flex-row-reverse">
                <img
                  :src="nickAll.nickImg"
                  class="w-10 h-10 object-cover pixel-avatar-sm"
                  alt="用户头像"
                />
              </div>
            </div>

            <ChatMessageItem
              v-else
              :item="item"
              :index="index"
              :nick-img="nickAll.nickImg"
              :ai-avatar-url="aiAvatarUrl"
              :hovered-index="hoveredIndex"
              :is-answering="isAnswering"
              :speaking-index="speakingIndex"
              @set-hovered="setHoveredIndex"
              @edit-chat="editChat"
              @copy-document="copyDocument"
              @speak="speak"
              @toggle-think="item => (item.thinkContent!.isOpen = !item.thinkContent!.isOpen)"
            />
          </template>
        </div>
        <ChatInput
          v-model:content-text="contentText"
          :filename-all="filenameAll"
          :is-answering="isAnswering"
          :is-stop-text="isStopText"
          :is-deep-thinking="isDeepThinking"
          :is-disabled="isDisabled"
          @send="sendTxt"
          @stop-export="stopExport"
          @toggle-deep-thinking="toggleDeepThinking"
          @parse-file-input="parseFileInput"
          @clear-file-text="clearFileText"
          @open-url="openUrl"
          @export-conversation="exportConversation"
          @clear="clear"
          @keydown="handleKeydown"
          @textarea-input="adjustTextareaHeight"
        />
      </div>
    </div>
    <TemplateDialog
      v-model:dialog-table-visible="dialogTableVisible"
      v-model:page="page"
      :prompt-list="promptList"
      :prompt-index="promptIndex"
      :template-list="templateList"
      :page-size="pageSize"
      :total="total"
      :disabled="disabled"
      @select-prompt="optforPrompt"
      @cite-template="cite"
      @page-change="handleCurrentChange"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

.pixel-page {
  color: $pixel-text;
  background:
    radial-gradient(ellipse at 20% 80%, rgba($neon-magenta, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba($neon-cyan, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($neon-purple, 0.1) 0%, transparent 70%),
    linear-gradient(180deg, #0a0a12 0%, #12121f 50%, #0a0a12 100%);
  font-family: ui-sans-serif, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  overflow-x: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.pixel-main {
  width: calc(100% - $sidebar-w);
  max-width: calc(100% - $sidebar-w);
  margin-left: $sidebar-w;
  box-sizing: border-box;
}

.pixel-sidebar {
  @include neon-pixel-panel;

  margin: 0;
  height: 100vh;
  width: $sidebar-w;
  max-width: $sidebar-w;
  box-sizing: border-box;
  border-radius: 0;
  border-top: none;
  border-bottom: none;
  border-left: none;
  background: rgba(13, 22, 36, 0.96);
  box-shadow:
    4px 0 30px rgba(0, 0, 0, 0.4),
    inset -3px 0 0 rgba($neon-cyan, 0.05);
  clip-path: none;
}

.pixel-sidebar-head {
  border-bottom: 2px dashed rgba($neon-cyan, 0.2);
}

.pixel-icon-tile {
  background: rgba($neon-cyan, 0.1);
  border: 2px solid $pixel-border;
  border-radius: 0;
  box-shadow:
    0 0 10px rgba($neon-cyan, 0.3),
    inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  transition:
    transform 0.1s ease,
    box-shadow 0.08s ease,
    filter 0.1s ease;
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
    transform: translateY(-1px);
    filter: brightness(1.1);
    box-shadow: 0 0 15px rgba($neon-cyan, 0.5);
  }

  &:active {
    transform: translate(1px, 2px);
    filter: brightness(0.9);
    box-shadow:
      inset 2px 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      1px 1px 0 rgba(0, 0, 0, 0.2);
  }
}

.pixel-icon-accent {
  color: $neon-cyan;
  filter: drop-shadow(0 0 5px $neon-cyan);
}

.pixel-text-muted {
  color: $pixel-text-muted;
}

.pixel-ink {
  color: $pixel-text;
}

.pixel-gold {
  color: $neon-magenta;
}

.pixel-danger {
  color: #c97b7b;
}

.pixel-btn {
  border: 2px solid $neon-cyan;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.02em;
  background: rgba($pixel-bg, 0.8);
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 10px rgba($neon-cyan, 0.5),
    0 0 20px rgba($neon-cyan, 0.3),
    0 0 40px rgba($neon-cyan, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2);
  text-shadow: 0 0 10px $neon-cyan;
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

  @include pixel-press-btn;

  &:hover:not(:disabled) {
    background: rgba($neon-cyan, 0.2);
    border-color: $neon-cyan-light;
    transform: translateY(-2px);
    box-shadow:
      0 0 15px rgba($neon-cyan, 0.7),
      0 0 30px rgba($neon-cyan, 0.5),
      0 0 60px rgba($neon-cyan, 0.3),
      0 5px 20px rgba($neon-cyan, 0.4);
  }
}

.pixel-btn-primary {
  background: $neon-purple-dark;
  border-color: $neon-purple;
  color: #fff;
  text-shadow: 0 0 10px $neon-purple;
  box-shadow:
    0 0 10px rgba($neon-purple, 0.5),
    0 0 20px rgba($neon-purple, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);

  &:hover:not(:disabled) {
    background: #47537b;
    border-color: #7c8cbd;
    box-shadow:
      0 0 15px rgba($neon-purple, 0.7),
      0 0 30px rgba($neon-purple, 0.5),
      0 5px 20px rgba($neon-purple, 0.4);
  }
}

.pixel-btn-secondary {
  background: $neon-magenta-dark;
  border-color: $neon-magenta;
  color: #fff;
  text-shadow: 0 0 10px $neon-magenta;
  box-shadow:
    0 0 10px rgba($neon-magenta, 0.5),
    0 0 20px rgba($neon-magenta, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);

  &:hover:not(:disabled) {
    background: #a3763e;
    border-color: $neon-magenta-light;
    box-shadow:
      0 0 15px rgba($neon-magenta, 0.7),
      0 0 30px rgba($neon-magenta, 0.5),
      0 5px 20px rgba($neon-magenta, 0.4);
  }
}

.pixel-btn-ghost {
  background: rgba($pixel-bg, 0.6);
  border-color: $pixel-border;
  color: $pixel-text;
  text-shadow: none;
  box-shadow: none;

  &:hover:not(:disabled) {
    background: rgba($neon-cyan, 0.15);
    border-color: $neon-cyan;
    box-shadow: 0 0 15px rgba($neon-cyan, 0.3);
    transform: translateY(-2px);
  }
}

.pixel-btn-send:disabled {
  opacity: 0.4;
  filter: grayscale(0.3);
}

.pixel-nav {
  margin: 12px 16px 0;
  background: $pixel-dialog-bg;
  border: 2px solid $pixel-border;
  box-shadow:
    0 0 30px rgba($neon-cyan, 0.15),
    0 0 60px rgba($neon-magenta, 0.1);
  max-width: calc(100% - 32px);
  box-sizing: border-box;
}

.pixel-title {
  font-family: myFirstFont, 'VT323', ui-monospace, monospace;
  font-weight: normal;
  color: #fff;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 10px $neon-cyan,
    0 0 20px $neon-cyan;
}

.pixel-nav-user {
  color: $pixel-text;
  font-weight: 600;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pixel-user-trigger {
  border: 2px solid transparent;
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
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.1);
    border-color: rgba($neon-cyan, 0.4);
    box-shadow: 0 0 10px rgba($neon-cyan, 0.2);
  }

  &:active {
    transform: translate(1px, 2px);
    background: rgba($neon-cyan, 0.15);
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.2);
  }
}

.pixel-chip {
  background: rgba($neon-cyan, 0.1);
  border: 2px solid rgba($neon-cyan, 0.4);
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 10px rgba($neon-cyan, 0.2),
    inset 1px 1px 0 rgba(255, 255, 255, 0.05);
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

  @include pixel-press-btn;
}

.pixel-chip-label {
  color: $pixel-text;
  font-weight: 600;
}

.pixel-chip--on {
  background: rgba($neon-cyan, 0.25);
  border-color: $neon-cyan;
  box-shadow: 0 0 15px rgba($neon-cyan, 0.4);
  color: $neon-cyan-light;
}

.pixel-dropdown {
  background: $pixel-dialog-bg;
  border: 2px solid $pixel-border;
  box-shadow:
    0 0 30px rgba($neon-cyan, 0.3),
    0 0 60px rgba($neon-magenta, 0.2),
    0 10px 40px rgba(0, 0, 0, 0.6);
  padding: 4px 0;
  z-index: 100;
}

.pixel-dropdown-divider {
  border-color: rgba($neon-cyan, 0.15);
}

.pixel-dropdown-item {
  color: $pixel-text;
  background: transparent;
  border: none;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    filter 0.07s ease-out,
    background 0.12s ease;

  &:hover {
    background: rgba($neon-cyan, 0.15);
  }

  &:active {
    transform: translate(1px, 2px);

    @include pixel-press-shadow;

    filter: brightness(0.94);
  }
}

.pixel-dropdown-item--on {
  background: rgba($neon-cyan, 0.22);
  font-weight: 600;
  color: $neon-cyan-light;
}

.pixel-menu-link {
  color: $pixel-text;
  text-decoration: none;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.12);
  }

  &:active {
    transform: translate(1px, 2px);

    @include pixel-press-shadow;

    background: rgba($neon-cyan, 0.18);
  }
}

.pixel-menu-danger {
  color: #c97b7b;
}

.pixel-hr {
  border: none;
  border-top: 2px dashed rgba($neon-cyan, 0.15);
}

.pixel-avatar {
  border: 2px solid $neon-cyan;
  box-shadow:
    0 0 10px rgba($neon-cyan, 0.4),
    0 0 20px rgba($neon-cyan, 0.2);
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
}

.pixel-avatar-sm {
  border: 2px solid $neon-cyan;
  box-shadow: 0 0 8px rgba($neon-cyan, 0.4);
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
}

.pixel-bubble-user {
  background: linear-gradient(
    180deg,
    rgba($neon-purple, 0.4) 0%,
    rgba($neon-purple, 0.2) 50%,
    rgba($neon-purple, 0.1) 100%
  );
  color: #fff;
  border: 2px solid $neon-purple;
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 15px rgba($neon-purple, 0.4),
    0 0 30px rgba($neon-purple, 0.2),
    inset 1px 1px 0 rgba(255, 255, 255, 0.1);
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
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
}

.pixel-bubble-ai {
  background: linear-gradient(
    180deg,
    rgba($neon-cyan, 0.2) 0%,
    rgba($neon-cyan, 0.1) 50%,
    rgba($neon-cyan, 0.05) 100%
  );
  color: $pixel-text;
  border: 2px solid rgba($neon-cyan, 0.4);
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 15px rgba($neon-cyan, 0.3),
    0 0 30px rgba($neon-cyan, 0.15),
    inset 2px 2px 0 rgba(255, 255, 255, 0.05);
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
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
}

.pixel-think-toggle {
  background: rgba($neon-magenta, 0.1);
  border: 2px dashed rgba($neon-magenta, 0.4);
  color: $pixel-text;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.15s ease,
    filter 0.07s ease-out;

  &:hover {
    background: rgba($neon-magenta, 0.2);
    box-shadow: 0 0 10px rgba($neon-magenta, 0.2);
  }

  &:active {
    transform: translate(1px, 2px);

    @include pixel-press-shadow;

    filter: brightness(0.95);
    background: rgba($neon-magenta, 0.25);
  }
}

.pixel-think-body {
  color: $pixel-text-muted;
}

/* 朗读按钮 */
.pixel-speech-row {
  display: flex;
}

.pixel-speech-btn {
  background: rgba($neon-cyan, 0.08);
  border: 2px solid rgba($neon-cyan, 0.25);
  color: $pixel-text-muted;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  letter-spacing: 0.03em;
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
  transition:
    transform 0.07s ease-out,
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.18);
    border-color: rgba($neon-cyan, 0.5);
    color: $neon-cyan-light;
    box-shadow: 0 0 10px rgba($neon-cyan, 0.2);
  }

  &:active {
    transform: translate(1px, 2px);
    box-shadow:
      inset 2px 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    filter: brightness(0.92);
  }
}

.pixel-speech-btn--active {
  background: rgba($neon-magenta, 0.2);
  border-color: rgba($neon-magenta, 0.5);
  color: $neon-magenta-light;
  text-shadow: 0 0 8px rgba($neon-magenta, 0.3);
  box-shadow: 0 0 12px rgba($neon-magenta, 0.25);

  &:hover {
    background: rgba($neon-magenta, 0.3);
    border-color: $neon-magenta;
    box-shadow: 0 0 15px rgba($neon-magenta, 0.35);
  }
}

.pixel-chat-wrap {
  padding-bottom: 8px;
  box-sizing: border-box;
}

.pixel-input-panel {
  @include neon-pixel-panel;

  background: $pixel-dialog-bg;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.pixel-file-sep {
  border-bottom: 2px dashed rgba($neon-cyan, 0.15);
}

.pixel-file-card {
  background: rgba($neon-cyan, 0.1);
  border: 2px solid rgba($neon-cyan, 0.4);
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 10px rgba($neon-cyan, 0.2),
    inset 1px 1px 0 rgba(255, 255, 255, 0.05);
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
  transition:
    transform 0.12s ease,
    box-shadow 0.08s ease,
    filter 0.08s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 15px rgba($neon-cyan, 0.4);
  }

  &:active {
    transform: translate(1px, 1px);

    @include pixel-press-shadow;

    filter: brightness(0.96);
  }
}

.pixel-icon-btn {
  color: $pixel-text-muted;
  background: none;
  border: none;
  padding: 4px;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    color 0.15s ease;

  &:hover {
    color: #c97b7b;
  }

  &:active {
    transform: translate(1px, 2px);

    @include pixel-press-shadow;

    color: #c97b7b;
  }
}

.pixel-tool-btn {
  border: 2px solid transparent;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.12s ease,
    border-color 0.12s ease;

  &:hover {
    background: rgba($neon-cyan, 0.12);
    border-color: rgba($neon-cyan, 0.3);
    box-shadow: 0 0 10px rgba($neon-cyan, 0.2);
  }

  &:active {
    transform: translate(1px, 2px);
    background: rgba($neon-cyan, 0.18);
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.2);
    border-color: rgba($neon-cyan, 0.3);
  }
}

.pixel-textarea {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba($neon-cyan, 0.3);
  color: $pixel-text;
  outline: none;
  box-shadow:
    inset 0 0 10px rgba(0, 0, 0, 0.3),
    0 0 5px rgba($neon-cyan, 0.1);
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

  &:focus {
    border-color: $neon-cyan;
    box-shadow:
      inset 0 0 10px rgba(0, 0, 0, 0.3),
      0 0 15px rgba($neon-cyan, 0.4),
      0 0 30px rgba($neon-cyan, 0.2);
  }
}

/* 个人信息弹窗 */
.profile-modal__backdrop {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
}

.profile-modal-enter-active {
  transition: opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.profile-modal-leave-active {
  transition: opacity 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-modal-enter-active .profile-modal__panel {
  transition:
    transform 0.38s cubic-bezier(0.34, 1.2, 0.64, 1),
    opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.profile-modal-leave-active .profile-modal__panel {
  transition:
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-modal-enter-from,
.profile-modal-leave-to {
  opacity: 0;
}

.profile-modal-enter-from .profile-modal__panel,
.profile-modal-leave-to .profile-modal__panel {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

.profile-modal-enter-to .profile-modal__panel,
.profile-modal-leave-from .profile-modal__panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.pixel-profile-card {
  background: $pixel-dialog-bg;
  border: 2px solid $pixel-border;
  box-shadow:
    0 0 30px rgba($neon-cyan, 0.2),
    0 0 60px rgba($neon-magenta, 0.15),
    0 20px 50px rgba(0, 0, 0, 0.5);
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

.pixel-profile-title {
  font-family: myFirstFont, 'VT323', ui-monospace, monospace;
  font-size: 1.35rem;
  font-weight: normal;
  color: #fff;
  letter-spacing: 0.06em;
  text-shadow: 0 0 10px $neon-cyan;
}

.pixel-profile-close {
  border: 2px solid transparent;
  color: $pixel-text-muted;
  background: transparent;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    color: $pixel-text;
    background: rgba($neon-cyan, 0.14);
    border-color: rgba($neon-cyan, 0.3);
  }

  &:active {
    transform: translate(1px, 2px);

    @include pixel-press-shadow;

    color: $pixel-text;
  }
}

.pixel-profile-avatar-wrap {
  cursor: pointer;
}

.pixel-profile-avatar {
  border: 2px solid $neon-cyan;
  box-shadow:
    0 0 15px rgba($neon-cyan, 0.3),
    0 0 30px rgba($neon-cyan, 0.1);
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

.pixel-profile-avatar-shade {
  background: rgba(42, 36, 56, 0.5);
  transition: opacity 0.2s ease;
}

.pixel-label {
  color: $pixel-text-muted;
  font-weight: 600;
}

.pixel-input {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba($neon-cyan, 0.3);
  color: $pixel-text;
  outline: none;
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.3);

  &:focus {
    border-color: $neon-cyan;
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.3),
      0 0 10px rgba($neon-cyan, 0.3);
  }
}

.pixel-readonly {
  background: rgba($neon-cyan, 0.08);
  border: 2px dashed rgba($neon-cyan, 0.25);
  color: $pixel-text;
}

.pixel-list-text {
  color: $pixel-text;
}

.pixel-list-item {
  border: 2px solid transparent;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.1);
    border-color: rgba($neon-cyan, 0.3);
    box-shadow: 0 0 10px rgba($neon-cyan, 0.15);
  }

  &:active {
    transform: translate(1px, 2px);
    background: rgba($neon-cyan, 0.15);
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.pixel-list-item--active {
  background: rgba($neon-cyan, 0.2);
  border-color: rgba($neon-cyan, 0.4);
  box-shadow: 0 0 15px rgba($neon-cyan, 0.25);
}

.load {
  display: flex;
  letter-spacing: 0.5px;
  line-height: 24px;
  color: $pixel-text-muted;
}

.load.active {
  margin: 10px 0 0 10px;
}

.load p {
  font-size: 14px;
  color: $pixel-text-muted;
  margin-left: 5px;
}

.loading {
  animation: api-debug_load__hsrQ8 2s linear infinite;
  border-right: 2px solid $neon-cyan;
  border-top: 2px solid $neon-cyan;
  content: '';
  display: block;
  height: 20px;
  width: 20px;
}

:deep(.pre-code-box) {
  margin-top: 10px;
}

:deep(.pre-code-header) {
  align-items: center;
  background: #1a1a2e;
  color: $neon-cyan-light;
  display: flex;
  font-size: 12px;
  height: 40px;
  justify-content: space-between;
  line-height: 40px;
  padding: 0 1rem;
  border: 1px solid rgba($neon-cyan, 0.3);
  border-bottom: none;
}

:deep(.code-block-header__lang) {
  font-size: 14px;
  font-weight: bold;
  color: $neon-cyan-light;
}

:deep(.code-block-header__actions) {
  display: flex;
  gap: 15px;
}

:deep(.code-block-header__copy),
:deep(.code-block-header__download) {
  cursor: pointer;
  padding: 0 8px;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.2s ease,
    filter 0.07s ease-out;
  color: $pixel-text;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.code-block-header__copy:hover),
:deep(.code-block-header__download:hover) {
  background: rgba($neon-cyan, 0.15);
  color: $neon-cyan-light;
}

:deep(.code-block-header__copy:active),
:deep(.code-block-header__download:active) {
  transform: translate(1px, 2px);
  box-shadow:
    inset 2px 2px 4px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  filter: brightness(0.9);
}

:deep(.code-block-header__copy::before) {
  content: '📋';
  font-size: 14px;
}

:deep(.code-block-header__download::before) {
  content: '⬇️';
  font-size: 14px;
}

:deep(.pre-code code.hljs) {
  padding: 15px;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  word-break: normal;
  background: #0d1624;
  border: 1px solid rgba($neon-cyan, 0.3);
  border-top: none;
}

:deep(.ai_detail table) {
  border-collapse: collapse;
}

:deep(.ai_detail th) {
  border: 1px solid $pixel-border;
  background-color: $pixel-bg;
  color: $pixel-text;
  padding: 5px;
}

:deep(.ai_detail td) {
  border: 1px solid $pixel-border;
  padding: 10px;
  color: $pixel-text-muted;
}

:deep(.ai_detail a) {
  text-decoration: none;
  cursor: auto;
  color: $neon-cyan;
}

:deep(.ai-txt p) {
  margin-bottom: 10px !important;
}

:deep(.ai-txt p:last-child) {
  margin-bottom: 0 !important;
}

:deep(.ai-txt table) {
  border-collapse: collapse;
}

:deep(.ai-txt th) {
  border: 1px solid $pixel-border;
  padding: 5px;
  color: $pixel-text;
}

:deep(.ai-txt td) {
  border: 1px solid $pixel-border;
  padding: 10px;
  color: $pixel-text-muted;
}

:deep(.ai-txt a) {
  text-decoration: none;
  cursor: auto;
  color: $neon-cyan;
}

.wrapper {
  scroll-behavior: smooth;
}

/* 修改垂直滚动条 */
.chat-wrapper::-webkit-scrollbar,
.chat-edit-textarea::-webkit-scrollbar,
.new-dialogue::-webkit-scrollbar {
  width: 5px;
}

/* 修改滚动条滑块颜色 */
.chat-wrapper::-webkit-scrollbar-thumb,
.chat-edit-textarea::-webkit-scrollbar-thumb,
.new-dialogue::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 5px;
  transition: all 1s;
}

.chat-wrapper:hover::-webkit-scrollbar-thumb,
.chat-edit-textarea:hover::-webkit-scrollbar-thumb,
.new-dialogue:hover::-webkit-scrollbar-thumb {
  background-color: rgba($neon-cyan, 0.3);
}

.list-icon {
  position: relative;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.restrict {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 185px;
}

.header {
  font-size: 14px;
  color: $pixel-text;
  display: flex;
  align-items: center;
  padding-bottom: 14px;
  user-select: none;
}

.header .profile {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid $neon-cyan;
  box-shadow: 0 0 10px rgba($neon-cyan, 0.3);
}

.header.effect {
  padding-bottom: 0;
  padding: 10px 5px;
  transition: all 1s;
  margin-top: 20px;
}

.header.effect:first-child {
  margin-top: 0;
}

.header-right {
  margin-left: 10px;
}

.area-disabled {
  cursor: no-drop;
}

.group-util {
  visibility: hidden;
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 12px;
  margin-right: 40px;

  &.show {
    visibility: visible;
  }
}

.edit {
  margin-right: 5px;
}

.edit,
.copyDocument {
  width: 30px;
  height: 30px;
  color: $pixel-text-muted;
  border: 2px solid transparent;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.edit:hover,
.copyDocument:hover {
  background-color: rgba($neon-cyan, 0.18);
  border-color: rgba($neon-cyan, 0.4);
  color: $neon-cyan-light;
  cursor: pointer;
  box-shadow: 0 0 10px rgba($neon-cyan, 0.2);
}

.chat-edit {
  margin-right: 10px;
}

.chat-edit .chat-edit-textarea {
  width: 500px;
  max-width: 100%;
  border: 2px solid rgba($neon-cyan, 0.4);
  padding: 8px 20px;
  height: 100px;
  background: rgba(0, 0, 0, 0.4);
  color: $pixel-text;
  outline: none;
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.3);

  &:focus {
    border-color: $neon-cyan;
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.3),
      0 0 15px rgba($neon-cyan, 0.3);
  }
}

.chat-edit-execute {
  display: flex;
  justify-content: flex-end;
}

.think {
  width: fit-content;
  user-select: none;
}

.think-txt {
  position: relative;
  margin: 10px 0;
}

.think-txt .line {
  border-left: 2px solid rgba($neon-magenta, 0.4);
  height: calc(100% - 10px);
  margin-top: 5px;
  position: absolute;
  top: 0;
  left: 0;
}

.textarea-dialogue {
  overflow: hidden;
}

.imgEdit input {
  display: none;
}

.text-word {
  white-space: pre-wrap;
}
</style>
