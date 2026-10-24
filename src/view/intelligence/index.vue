<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
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
import {
  useConversationBranches,
  type BranchNode,
  type BranchSnapshot
} from './useConversationBranches'
import {
  useDeepseekHistory,
  clipTitle,
  createDeepseekId,
  type DeepseekConversation,
  type DeepseekConversationMeta
} from './useDeepseekHistory'
import { useRouter } from 'vue-router'
import {
  allInstall,
  categories,
  menuObject,
  promptObject,
  templateObject,
  aiModelsObject,
  requestObject,
  searchResultObject
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
    DEEPSEEK_V4: 'deepseek-v4-flash',
    SPARK_ULTRA: 'spark-pro',
    DEFAULT_MODULE: 'deepseek-flash', // DeepSeek V4 快速模式
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
let currentModel = ref(CONSTATNS.MODELS.DEEPSEEK_V4)
let aiModels: aiModelsObject[] = reactive([
  { id: CONSTATNS.MODELS.DEEPSEEK_V4, name: 'DeepSeek-V4' },
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
// 联网搜索开关：开启后先检索网页，再让模型结合资料回答
let isWebSearch = ref(false)
// 联网资料抽屉：展示某轮回答引用的全部网页
let searchDrawerVisible = ref(false)
let searchDrawerResults = ref<searchResultObject[]>([])
// 从回答里的引用标签进入时，定位并高亮对应资料
let searchDrawerFocus = ref(-1)
let isLoadingCategories = ref(true)
let apiModuleId = ref(CONSTATNS.MODELS.DEFAULT_MODULE)
let responce = ''

// ===== 对话分支（仅用于版本切换） =====
const {
  activeLeafId,
  viewPath,
  getNode,
  pathTo,
  addNode,
  getSiblings,
  versionOf,
  deepestLeaf,
  commitActiveLeaf,
  buildAllText,
  reset: resetBranches,
  loadLinear,
  serialize,
  restore
} = useConversationBranches()

// DeepSeek 专属最近对话：没有 category，按用户保存在浏览器本地
const {
  conversations: deepseekConversations,
  groups: deepseekGroups,
  load: loadDeepseekHistory,
  upsert: upsertDeepseekHistory,
  updateMeta: updateDeepseekMeta,
  remove: removeDeepseekHistory,
  getTree: getDeepseekTree
} = useDeepseekHistory(() => nickAll.nicknameId)
// 当前正在编辑的 DeepSeek 对话 id，为空表示尚未落库的新对话
const activeDeepseekId = ref('')
// 打开历史对话是异步读 IndexedDB，用序号丢弃过期的打开请求
let deepseekOpenRequest = 0

const streamingNodeId = ref('')
const isAnchoring = ref(false)

// 当前路径上每一轮的版本信息，供消息旁的 < X/N > 翻页器使用
const turnMeta = computed(() => {
  const path = viewPath.value
  const result: Array<{
    user: { index: number; total: number }
    assistant: { index: number; total: number }
  }> = []
  for (let i = 0; i + 1 < path.length; i += 2) {
    result.push({
      user: versionOf(path[i]),
      assistant: versionOf(path[i + 1])
    })
  }
  return result
})

// 用节点 id 做 key，切换版本时强制重建对应轮次
const branchTurnKeys = computed(() => {
  const path = viewPath.value
  const keys: string[] = []
  for (let i = 0; i + 1 < path.length; i += 2) {
    keys.push(path[i].id)
  }
  return keys
})

let downloadClickHandler: ((e: MouseEvent) => void) | null = null
let _scrollRafId: number | null = null
let _autoScrollRafId: number | null = null

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
  if (_autoScrollRafId !== null) {
    cancelAnimationFrame(_autoScrollRafId)
    _autoScrollRafId = null
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
    const distanceToBottom = el.scrollHeight - el.clientHeight - currentScroll
    const direction = currentScroll > lastScrollPosition.value ? 'down' : 'up'
    lastScrollPosition.value = currentScroll
    if (distanceToBottom > 80) {
      // 离开底部后再向上滚动，暂停自动跟随
      if (direction == 'up') closeScroll.value = true
    } else {
      // 回到底部附近时恢复自动跟随
      closeScroll.value = false
    }
  })
}

// 自动滚到底部：合并同一帧的多次更新，直接定位避免平滑动画抖动
const scrollToBottom = () => {
  if (_autoScrollRafId !== null) return
  _autoScrollRafId = requestAnimationFrame(() => {
    _autoScrollRafId = null
    const el = chatContainer.value
    if (!el || closeScroll.value || isAnchoring.value) return
    // instant 不受容器 scroll-behavior: smooth 影响，切换会话时直接贴底
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'instant'
    })
    lastScrollPosition.value = el.scrollTop
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
      loadDeepseekHistory().catch(() => {
        showMessage('历史对话读取失败，请检查浏览器存储权限', 'warning')
      })
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
  // 讯飞星火不支持联网搜索，切过去时自动关闭
  if (id !== CONSTATNS.MODELS.DEEPSEEK_V4) {
    isWebSearch.value = false
  }
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

// 保存当前对话：线性历史 + 完整分支树，保证重新进入后仍能看到所有版本和翻页器
// 串行写入，避免快速切换版本时多次覆盖请求互相交错
let saveChain: Promise<void> = Promise.resolve()

// DeepSeek 对话没有 category：把完整分支树写到本地历史，标题取首条用户消息
const saveDeepseekSnapshot = (tree: BranchSnapshot, boundId: string, firstUserText: string) => {
  const now = Date.now()
  const persist = (entry: DeepseekConversation) => {
    upsertDeepseekHistory(entry).catch(() => {
      showMessage('对话保存失败，请检查浏览器存储空间', 'error')
    })
  }
  if (boundId) {
    const existing = deepseekConversations.value.find(item => item.id === boundId)
    if (existing) {
      persist({ ...existing, updatedAt: now, tree })
      return
    }
  }
  const entry: DeepseekConversation = {
    id: createDeepseekId(),
    title: clipTitle(firstUserText),
    createdAt: now,
    updatedAt: now,
    tree
  }
  // 新对话：仍停留在 DeepSeek 模式且没有绑定其它记录时，指向新记录
  // 已有绑定：只有用户没有切走（仍指向同一条）时才保持绑定
  const shouldBind = boundId
    ? activeDeepseekId.value === boundId
    : !activeDeepseekId.value &&
      currentModel.value === CONSTATNS.MODELS.DEEPSEEK_V4 &&
      currentIndex.value == 0
  if (shouldBind) activeDeepseekId.value = entry.id
  persist(entry)
}

// 同步保存（版本翻页等场景，内容已经渲染完毕）
const saveDeepseekMessage = () => {
  if (!allText.length) return
  const path = pathTo(activeLeafId.value)
  if (path.length < 2) return
  const firstUser = path.find(node => node.role === 'user')
  saveDeepseekSnapshot(serialize(), activeDeepseekId.value, firstUser?.content || '')
}

// 流式结束后保存：答案 HTML 由 worker 异步渲染，必须等最终渲染完成再落盘，
// 否则短回答会在快照里留下空的 adminText（表现为只有标题、没有内容）
const finalizeDeepseekTurn = (node: BranchNode | null, rawAnswer: string) => {
  if (!node || !node.adminContent) {
    saveDeepseekMessage()
    return
  }
  const conversationId = activeDeepseekId.value
  const firstUser = pathTo(activeLeafId.value).find(item => item.role === 'user')
  const tree = serialize()
  const snapshotNode = tree.nodes.find(item => item.id === node.id)
  renderInWorker(rawAnswer)
    .then(html => {
      // 直接写节点，避免切换会话后 allText 下标已经指向别的对话
      node.adminContent!.adminText = html
      if (snapshotNode?.adminContent) snapshotNode.adminContent.adminText = html
    })
    .catch(() => {})
    .then(() => {
      saveDeepseekSnapshot(tree, conversationId, firstUser?.content || '')
    })
}

const saveMessage = () => {
  if (currentModel.value === CONSTATNS.MODELS.DEEPSEEK_V4 && currentIndex.value == 0) {
    saveDeepseekMessage()
    return
  }
  if (currentModel.value !== CONSTATNS.MODELS.SPARK_ULTRA || currentIndex.value == 0) return
  if (!allText.length) return
  const dialogue = allText.map(item => ({
    myself_reply: item.userText,
    ai_reply: item.adminContent.adminText
  }))
  const tree = serialize()
  const categoryId = currentIndex.value
  const userId = nickAll.nicknameId
  saveChain = saveChain.then(() =>
    Promise.all([
      aicgApi.replaceDialogue({
        category_id: categoryId,
        user_id: userId,
        dialogue
      }),
      aicgApi.saveDialogueTree({
        category_id: categoryId,
        user_id: userId,
        tree
      })
    ])
      .then(([dialogueRes, treeRes]) => {
        if (dialogueRes.data.code != 0) {
          showMessage(dialogueRes.data.msg, 'warning')
        } else if (treeRes.data.code != 0) {
          showMessage(treeRes.data.msg, 'warning')
        }
      })
      .catch(() => {
        showMessage('对话保存失败，请稍后再试', 'error')
      })
  )
}

// 查询对话信息接口
const onceQueryDialogue = (id: number, index: number) => {
  // 解决异步竞态问题
  const isStale = () => index == 0 && !(currentIndex.value == id)
  const applyItems = (items: allInstall[]) => {
    allText.splice(0, allText.length, ...items)
    timeCount.value = allText.length
    recordLength.value = allText.length
    copyCode('.code-block-header__copy')
  }
  aicgApi.queryDialogue({ category_id: id, user_id: nickAll.nicknameId }).then(res => {
    if (res.data.code != 0) {
      showMessage(res.data.msg, 'error')
      return
    }
    if (isStale()) return
    const linearData = res.data.data as allInstall[]
    const applyLinear = () => {
      const leafId = loadLinear(linearData)
      applyItems(leafId ? buildAllText(pathTo(leafId)) : [])
    }
    // 优先还原完整的版本树；没有树或树不可用时退回线性历史
    aicgApi
      .queryDialogueTree({ category_id: id, user_id: nickAll.nicknameId })
      .then(treeRes => {
        if (isStale()) return
        if (treeRes.data.code == 0 && treeRes.data.data && restore(treeRes.data.data)) {
          applyItems(buildAllText(viewPath.value))
          return
        }
        applyLinear()
      })
      .catch(() => {
        if (isStale()) return
        applyLinear()
      })
  })
}

// 回车键提交、ctrl+enter组合键换行
const handleKeydown = (event: KeyboardEvent) => {
  // 中文输入法组合输入时忽略回车
  if (event.isComposing) return
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

// DeepSeek 上下文：沿当前分支回溯到目标用户消息
const buildDeepSeekContext = (userNodeId: string): requestObject[] => {
  return pathTo(userNodeId)
    .filter(node => node.role === 'user' || node.raw.trim() !== '')
    .map(node => ({
      role: node.role,
      content: node.role === 'user' ? node.apiContent : node.raw
    }))
}

// 流式结束后的统一收尾
const finishStream = (status: 'done' | 'error' | 'stopped', persist = status !== 'error') => {
  if (!streamingNodeId.value) return
  const node = getNode(streamingNodeId.value)
  const rawAnswer = responce
  if (node) {
    node.status = status
    node.raw = responce
    if (node.adminContent) node.adminContent.isShow = false
    if (node.thinkContent && node.thinkContent.status === '1') {
      node.thinkContent.status = status === 'done' ? '3' : '2'
    }
  }
  streamingNodeId.value = ''
  markdownContent.value = ''
  serviceThinkContent.value = ''
  responce = ''
  isAnswering.value = false
  isStopText.value = false
  isTyping.value = false
  timeCount.value = timeCount.value + 1
  nextTick(() => {
    copyCode('.code-block-header__copy')
  })
  if (persist) {
    if (currentModel.value === CONSTATNS.MODELS.DEEPSEEK_V4 && currentIndex.value == 0) {
      finalizeDeepseekTurn(node, rawAnswer)
    } else {
      saveMessage()
    }
  }
  closeScroll.value = false
  clearFileText()
}

// 把搜索到的网页整理成模型可读的参考资料
const buildSearchContext = (results: searchResultObject[]): string => {
  const blocks = results.map((item, index) => {
    const summary = (item.summary || item.snippet || '').replace(/\s+/g, ' ').trim()
    return `[${index + 1}] ${item.title || item.url}\n链接：${item.url}\n摘要：${summary}`
  })
  return [
    '以下是联网搜索到的最新资料，请结合这些资料回答用户问题，引用时标注编号（如 [1]）。',
    '资料与问题无关时请忽略，不要编造资料中没有的信息。',
    '',
    blocks.join('\n\n')
  ].join('\n')
}

// 调用后端搜索代理（密钥保存在服务端）
const searchWeb = async (query: string): Promise<searchResultObject[]> => {
  const res = await aicgApi.webSearch({ query: query.trim().slice(0, 128), count: 8 })
  if (res.data.code != 0) throw new Error(res.data.msg || '网页搜索失败')
  return Array.isArray(res.data.data) ? res.data.data.slice(0, 8) : []
}

// 打开某一轮回答的联网资料抽屉，focusIndex 用于定位点击的引用
const openSearchSources = (results: searchResultObject[] = [], focusIndex = -1) => {
  searchDrawerResults.value = results
  searchDrawerFocus.value = focusIndex
  searchDrawerVisible.value = true
  if (focusIndex < 0) return
  // 等抽屉展开和卡片渲染完成后再滚动
  nextTick(() => {
    window.setTimeout(() => {
      const card = document.querySelector(
        `.search-source-drawer [data-source-index="${focusIndex}"]`
      ) as HTMLElement | null
      card?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 260)
  })
}

// 接口日期格式不固定，统一显示为 YYYY/MM/DD
const formatSourceDate = (date?: string | null): string => {
  if (!date) return ''
  const parsed = new Date(date)
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }
  const matched = String(date).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  return matched
    ? `${matched[1]}/${matched[2].padStart(2, '0')}/${matched[3].padStart(2, '0')}`
    : ''
}

// 站点图标加载失败时退回地球图标
const handleSourceIconError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

// 发起一轮请求：发送、编辑重发、重新生成共用
const startRequest = (
  turnIndex: number,
  userNode: BranchNode,
  assistantNode: BranchNode,
  searchResults: searchResultObject[] = []
) => {
  isAnswering.value = true
  streamingNodeId.value = assistantNode.id
  timeCount.value = turnIndex
  markdownContent.value = ''
  serviceThinkContent.value = ''
  responce = ''
  isStopText.value = false
  isTyping.value = false
  closeScroll.value = false
  ctrl.value = new AbortController()

  if (currentModel.value == CONSTATNS.MODELS.DEEPSEEK_V4) {
    const context = buildDeepSeekContext(userNode.id)
    const params = {
      // 搜索结果作为前置 system 消息，避免用户问题被资料淹没
      text: searchResults.length
        ? [{ role: 'system', content: buildSearchContext(searchResults) }, ...context]
        : context,
      moduleId: apiModuleId.value
    }
    fetchEventSource(CONSTATNS.API.BASE_URL + CONSTATNS.API.DEEPSEEK_MODULE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
      signal: ctrl.value.signal,
      openWhenHidden: true,
      onmessage(ev) {
        // 跳过空数据、非 JSON 或结束标记，避免 JSON.parse 抛异常
        if (!ev.data || ev.data === '[DONE]') return
        let res: any
        try {
          res = JSON.parse(ev.data)
        } catch {
          return
        }
        // 捕获当前 timeCount 快照，防止 renderInWorker 异步回写时下标漂移
        const snapshotIndex = timeCount.value
        const msg = allText[snapshotIndex]
        if (!msg) return

        if (
          res.choices?.[0]?.delta?.reasoning_content &&
          apiModuleId.value == CONSTATNS.MODELS.REASONER_MODULE
        ) {
          serviceThinkContent.value += res.choices[0].delta.reasoning_content
          renderInWorker(serviceThinkContent.value).then(thinkText => {
            if (allText[snapshotIndex]?.thinkContent) {
              allText[snapshotIndex].thinkContent!.thinkText = thinkText
            }
          })
          if (msg.thinkContent) {
            msg.thinkContent.status = '1'
            msg.thinkContent.isOpen = true
          }
          msg.adminContent.isShow = false
          isStopText.value = true
        }
        if (serviceThinkContent.value && res.choices?.[0]?.delta?.content) {
          if (msg.thinkContent) msg.thinkContent.status = '3'
        }
        if (res.choices?.[0]?.delta?.content) {
          markdownContent.value += res.choices[0].delta.content
          responce += res.choices[0].delta.content
          msg.adminContent.isShow = false
          renderInWorker(markdownContent.value).then(adminText => {
            if (allText[snapshotIndex]) {
              allText[snapshotIndex].adminContent.adminText = adminText
            }
          })
          isStopText.value = true
        }
        // 仅在没有正常 choices 时才把 message 当作错误信息
        if (res.message && !res.choices?.length) {
          msg.adminContent.isShow = false
          msg.adminContent.adminText = res.message
          finishStream('error')
        }
      },
      onclose() {
        finishStream('done')
      },
      onerror(err) {
        if (!streamingNodeId.value) throw err
        const idx = timeCount.value
        if (allText[idx]) {
          allText[idx].adminContent.isShow = false
          allText[idx].adminContent.adminText = CONSTATNS.MESSAGES.SERVER_ERROR
        }
        finishStream('error')
        // 抛出异常以终止 fetchEventSource 的默认无限重试
        throw err
      }
    }).catch(() => {
      // 请求失败或用户中止：错误提示已在 onerror 中处理，无需继续重试
    })
  } else if (currentModel.value == CONSTATNS.MODELS.SPARK_ULTRA) {
    const systemContent = searchResults.length
      ? `${roleContent.value}\n\n${buildSearchContext(searchResults)}`
      : roleContent.value
    const params = {
      max_tokens: 4096,
      top_k: 4,
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: userNode.apiContent || userNode.content
        }
      ],
      model: 'generalv3',
      stream: true
    }
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
          finishStream('done')
          return
        }
        if (!ev.data) return
        let res: any
        try {
          res = JSON.parse(ev.data)
        } catch {
          return
        }
        const snapshotIndex = timeCount.value
        const msg = allText[snapshotIndex]
        if (!msg) return
        // 讯飞星火每个成功分片都会带 message: "Success"，不能当作回答内容
        if (typeof res.code === 'number' && res.code !== 0) {
          msg.adminContent.isShow = false
          msg.adminContent.adminText = res.message || CONSTATNS.MESSAGES.SERVER_ERROR
          finishStream('error')
          return
        }
        const delta = res.choices?.[0]?.delta?.content
        if (!delta) return
        markdownContent.value += delta
        responce += delta
        msg.adminContent.isShow = false
        renderInWorker(markdownContent.value).then(xfText => {
          if (allText[snapshotIndex]) {
            allText[snapshotIndex].adminContent.adminText = xfText
          }
        })
        isStopText.value = true
      },
      onclose() {
        finishStream('done')
      },
      onerror(err) {
        if (!streamingNodeId.value) throw err
        const idx = timeCount.value
        if (allText[idx]) {
          allText[idx].adminContent.isShow = false
          allText[idx].adminContent.adminText = CONSTATNS.MESSAGES.SERVER_ERROR
        }
        finishStream('error')
        // 抛出异常以终止 fetchEventSource 的默认无限重试
        throw err
      }
    }).catch(() => {
      // 请求失败或用户中止，无需继续重试
    })
  }
}

// 需要联网时先搜索，再把结果带进本轮请求（仅 DeepSeek 支持）
const runTurn = (turnIndex: number, userNode: BranchNode, assistantNode: BranchNode) => {
  if (!isWebSearch.value || currentModel.value !== CONSTATNS.MODELS.DEEPSEEK_V4) {
    startRequest(turnIndex, userNode, assistantNode)
    return
  }
  isAnswering.value = true
  searchWeb(userNode.content)
    .then(results => {
      if (!getNode(assistantNode.id)) return
      assistantNode.searchResults = results.length ? results : null
      const item = allText[turnIndex]
      if (item) item.searchResults = assistantNode.searchResults || undefined
      if (!results.length) showMessage('未搜索到相关网页，将直接回答', 'warning')
    })
    .catch((err: Error) => {
      if (!getNode(assistantNode.id)) return
      showMessage(err.message || '联网搜索失败，将直接回答', 'warning')
    })
    .finally(() => {
      // 搜索期间切换了分类或新建了对话，放弃这一轮
      if (!getNode(assistantNode.id)) {
        isAnswering.value = false
        return
      }
      startRequest(turnIndex, userNode, assistantNode, assistantNode.searchResults || [])
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
  contentText.value = ''
  if (textareaDialogue.value) {
    textareaDialogue.value.style.height = 'auto'
  }
  filenameAll.value.isFileContent = false

  let messagesContent = ''
  if (akiText.value && isAskText.value) {
    messagesContent = akiText.value + '\n\n' + value
    isAskText.value = false
    akiText.value = ''
  } else {
    messagesContent = value
  }

  const isDeepSeek = currentModel.value == CONSTATNS.MODELS.DEEPSEEK_V4
  const userNode = addNode({
    parentId: activeLeafId.value || null,
    role: 'user',
    content: messagesContent,
    apiContent: messagesContent + wordOrpdfText.value,
    status: 'done'
  })
  const assistantNode = addNode({
    parentId: userNode.id,
    role: 'assistant',
    adminContent: { adminText: '', isShow: true },
    thinkContent:
      isDeepSeek && apiModuleId.value == CONSTATNS.MODELS.REASONER_MODULE
        ? { thinkText: '', status: '1', isShow: true, isOpen: false }
        : null,
    status: 'streaming'
  })
  commitActiveLeaf(assistantNode.id)

  const turnIndex = allText.length
  allText.push({
    userText: messagesContent,
    adminContent: assistantNode.adminContent!,
    thinkContent: assistantNode.thinkContent || undefined
  })
  runTurn(turnIndex, userNode, assistantNode)
}

// 监听聊天内容变化,实时改变聊天内容高度
watch([allText], () => {
  nextTick(scrollToBottom)
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
  // 切换会话时终止上一段的流式状态，且不写入旧会话
  if (streamingNodeId.value) {
    finishStream('stopped', false)
  }
  stopSpeech()
  // 离开 DeepSeek 对话，后续回答不再写回本地历史
  deepseekOpenRequest++
  activeDeepseekId.value = ''
  // replacement()
  currentModel.value = CONSTATNS.MODELS.SPARK_ULTRA
  // 讯飞模型不支持联网搜索
  isWebSearch.value = false
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

// 新建一条 DeepSeek 对话：清空当前会话，回到无角色的默认状态
const startDeepseekChat = () => {
  if (isAnswering.value) {
    showMessage(CONSTATNS.MESSAGES.ANSWERING, 'warning')
    return
  }
  if (ctrl.value) ctrl.value.abort()
  stopSpeech()
  if (streamingNodeId.value) finishStream('stopped', false)
  // 丢弃仍在读取中的历史对话请求
  deepseekOpenRequest++
  currentModel.value = CONSTATNS.MODELS.DEEPSEEK_V4
  currentIndex.value = 0
  revealAlways.value = {
    revealId: 0,
    revealName: CONSTATNS.DEFAULT.AI_NAME,
    revealImg: CONSTATNS.DEFAULT.AI_AVATAR
  }
  roleContent.value = ''
  activeDeepseekId.value = ''
  allText.splice(0, allText.length)
  resetBranches()
  streamingNodeId.value = ''
  responce = ''
  timeCount.value = 0
  recordLength.value = 0
  editIndex.value = -1
  isAnswering.value = false
  isStopText.value = false
  closeScroll.value = false
  lastScrollPosition.value = 0
}

// 旧快照可能因为渲染时序缺少回答 HTML，用原始 markdown 补渲染
const rehydrateAnswers = () => {
  pathTo(activeLeafId.value).forEach(node => {
    if (node.role !== 'assistant' || !node.adminContent || !node.raw) return
    if (node.adminContent.adminText) return
    renderInWorker(node.raw)
      .then(html => {
        if (node.adminContent) node.adminContent.adminText = html
        nextTick(() => copyCode('.code-block-header__copy'))
      })
      .catch(() => {})
  })
}

// 打开一条 DeepSeek 历史对话：按 id 从 IndexedDB 读出分支树后还原
const openDeepseekConversation = async (item: DeepseekConversationMeta) => {
  if (isAnswering.value) {
    showMessage(CONSTATNS.MESSAGES.ANSWERING, 'warning')
    return
  }
  if (activeDeepseekId.value === item.id) return
  const requestId = ++deepseekOpenRequest
  let tree: BranchSnapshot | null = null
  try {
    tree = await getDeepseekTree(item.id)
  } catch {
    tree = null
  }
  // 读取期间用户又点了别的会话 / 新建了对话 / 开始提问，放弃这次打开
  if (requestId !== deepseekOpenRequest || isAnswering.value) return
  if (ctrl.value) ctrl.value.abort()
  stopSpeech()
  if (streamingNodeId.value) finishStream('stopped', false)
  if (!tree || !restore(tree)) {
    // 快照不可用时 restore 可能已重置分支，同步清空视图避免残留旧消息
    activeDeepseekId.value = ''
    allText.splice(0, allText.length)
    timeCount.value = 0
    recordLength.value = 0
    streamingNodeId.value = ''
    responce = ''
    showMessage('这段对话记录已损坏，无法打开', 'warning')
    return
  }
  currentModel.value = CONSTATNS.MODELS.DEEPSEEK_V4
  currentIndex.value = 0
  revealAlways.value = {
    revealId: 0,
    revealName: CONSTATNS.DEFAULT.AI_NAME,
    revealImg: CONSTATNS.DEFAULT.AI_AVATAR
  }
  roleContent.value = ''
  activeDeepseekId.value = item.id
  const items = buildAllText(viewPath.value)
  allText.splice(0, allText.length, ...items)
  timeCount.value = items.length
  recordLength.value = items.length
  streamingNodeId.value = ''
  responce = ''
  isAnswering.value = false
  isStopText.value = false
  editIndex.value = -1
  closeScroll.value = false
  lastScrollPosition.value = 0
  rehydrateAnswers()
  nextTick(() => {
    copyCode('.code-block-header__copy')
    scrollToBottom()
  })
}

// 删除一条 DeepSeek 历史对话
const removeDeepseekConversation = async (item: DeepseekConversationMeta) => {
  if (isAnswering.value && activeDeepseekId.value === item.id) {
    showMessage(CONSTATNS.MESSAGES.ANSWERING, 'warning')
    return
  }
  try {
    await removeDeepseekHistory(item.id)
  } catch {
    showMessage('删除对话失败，请稍后再试', 'error')
    return
  }
  if (activeDeepseekId.value !== item.id) return
  // 删除的是当前会话：作废仍在读取中的打开请求，并清空视图
  deepseekOpenRequest++
  activeDeepseekId.value = ''
  allText.splice(0, allText.length)
  resetBranches()
  streamingNodeId.value = ''
  responce = ''
  timeCount.value = 0
  recordLength.value = 0
  showMessage(CONSTATNS.MESSAGES.DELETE_SUCCESS, 'success')
}

// 置顶 / 取消置顶一条 DeepSeek 对话
const toggleDeepseekPinned = async (item: DeepseekConversationMeta) => {
  try {
    await updateDeepseekMeta(item.id, { pinned: !item.pinned })
  } catch {
    showMessage(item.pinned ? '取消置顶失败，请稍后再试' : '置顶失败，请稍后再试', 'error')
  }
}

// 重命名一条 DeepSeek 对话
const renameDeepseekConversation = async (payload: { id: string; title: string }) => {
  try {
    await updateDeepseekMeta(payload.id, { title: payload.title })
  } catch {
    showMessage('重命名失败，请稍后再试', 'error')
  }
}

// 停止sse输出
const stopExport = () => {
  if (!streamingNodeId.value) return
  if (ctrl.value) {
    ctrl.value.abort()
  }
  finishStream('stopped')
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
            resetBranches()
            streamingNodeId.value = ''
            responce = ''
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
    // DeepSeek 对话：清除当前会话的同时从本地历史里移除
    if (activeDeepseekId.value) {
      removeDeepseekHistory(activeDeepseekId.value)
      activeDeepseekId.value = ''
    }
    allText.splice(0, allText.length)
    resetBranches()
    streamingNodeId.value = ''
    responce = ''
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
  // 跟随当前页面主题，深色页面导出深色卷轴
  const isDark = document.documentElement.classList.contains('dark')
  // 取值与 src/styles/theme.scss 保持一致
  const palette = isDark
    ? {
        bg: '#141519',
        surface: '#1d1f25',
        surface2: '#23252c',
        surface3: '#2a2d35',
        border: '#2c2f38',
        borderStrong: '#3b3f4a',
        text: '#e9eaee',
        text2: '#a9adb7',
        text3: '#7d828e',
        accent: '#7c8cff',
        accentActive: '#6b7cf5',
        accentSoft: 'rgba(124, 140, 255, 0.14)',
        accentRing: 'rgba(124, 140, 255, 0.3)',
        warning: '#fbbf24',
        shadowXs: '0 1px 2px rgba(0, 0, 0, 0.24)',
        shadowSm: '0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.22)'
      }
    : {
        bg: '#f6f7f9',
        surface: '#ffffff',
        surface2: '#f7f8fa',
        surface3: '#eef1f6',
        border: '#e6e8ee',
        borderStrong: '#d8dce5',
        text: '#1d2129',
        text2: '#535a68',
        text3: '#8b92a1',
        accent: '#4f6ef7',
        accentActive: '#3451d1',
        accentSoft: 'rgba(79, 110, 247, 0.1)',
        accentRing: 'rgba(79, 110, 247, 0.22)',
        warning: '#d97706',
        shadowXs: '0 1px 2px rgba(16, 24, 40, 0.04)',
        shadowSm: '0 1px 2px rgba(16, 24, 40, 0.05), 0 2px 6px rgba(16, 24, 40, 0.04)'
      }

  // 联网资料：导出成可展开的链接列表
  const buildSources = (results: searchResultObject[]) => {
    if (!results.length) return ''
    const items = results
      .map((source, index) => {
        const label = escapeHtml(source.title || source.url || `资料 ${index + 1}`)
        const link = /^https?:\/\//i.test(source.url || '')
          ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : `<span>${label}</span>`
        const site = source.site_name ? `<em>${escapeHtml(source.site_name)}</em>` : ''
        return `<li>${link}${site}</li>`
      })
      .join('')
    return `<details class="sources"><summary><span class="sources-ico">🌐</span>联网资料 ${results.length} 条</summary><ol>${items}</ol></details>`
  }

  const messages = allText
    .map(item => {
      const rows: string[] = []
      // 用户消息
      rows.push(
        `<div class="row row--user"><div class="bubble bubble--user">${escapeHtml(item.userText)}</div><img class="avatar" src="${escapeHtml(nickAll.nickImg)}" alt="用户" onerror="this.remove()"></div>`
      )
      // 思考内容 + AI 回复
      const think = item.thinkContent?.thinkText
        ? `<div class="think"><div class="think-label">贤者沉思</div><div class="md">${item.thinkContent.thinkText}</div></div>`
        : ''
      const answer = item.adminContent.adminText
        ? `<div class="md">${item.adminContent.adminText}</div>`
        : ''
      if (think || answer) {
        rows.push(
          `<div class="row row--ai"><img class="avatar" src="${escapeHtml(aiAvatarUrl.value)}" alt="AI" onerror="this.remove()"><div class="bubble bubble--ai">${buildSources(item.searchResults || [])}${think}${answer}</div></div>`
        )
      }
      return `<section class="turn">${rows.join('')}</section>`
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} - 对话导出</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
<style>
  :root {
    color-scheme: ${isDark ? 'dark' : 'light'};
    --bg: ${palette.bg};
    --surface: ${palette.surface};
    --surface-2: ${palette.surface2};
    --surface-3: ${palette.surface3};
    --border: ${palette.border};
    --border-strong: ${palette.borderStrong};
    --text: ${palette.text};
    --text-2: ${palette.text2};
    --text-3: ${palette.text3};
    --accent: ${palette.accent};
    --accent-active: ${palette.accentActive};
    --accent-soft: ${palette.accentSoft};
    --accent-ring: ${palette.accentRing};
    --warning: ${palette.warning};
    --shadow-xs: ${palette.shadowXs};
    --shadow-sm: ${palette.shadowSm};
    --font-sans: ui-sans-serif, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    --font-mono: "SFMono-Regular", consolas, "Liberation Mono", menlo, monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.75;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 900px; margin: 0 auto; padding: 40px 24px 56px; }
  .page-header {
    padding-bottom: 24px; margin-bottom: 28px;
    border-bottom: 1px solid var(--border); text-align: center;
  }
  .page-header h1 { margin-bottom: 8px; color: var(--text); font-size: 22px; font-weight: 600; letter-spacing: 0.5px; }
  .page-meta { color: var(--text-3); font-size: 13px; }
  .turn { display: flex; flex-direction: column; }
  .turn + .turn { margin-top: 20px; }
  .row { display: flex; gap: 8px; min-width: 0; }
  .row + .row { margin-top: 12px; }
  .row--user { justify-content: flex-end; }
  .row--ai { justify-content: flex-start; }
  .avatar {
    flex: 0 0 auto; width: 36px; height: 36px;
    border: 1px solid var(--border); border-radius: 50%;
    background: var(--surface-2); object-fit: cover;
  }
  .bubble {
    min-width: 0; max-width: 82%; padding: 12px 16px;
    border-radius: 16px; font-size: 14px; line-height: 1.75; overflow-wrap: break-word;
  }
  .bubble--user {
    border: 1px solid var(--accent); border-radius: 16px 16px 4px;
    background: var(--accent); color: #fff; white-space: pre-wrap;
  }
  .bubble--ai {
    border: 1px solid var(--border); border-radius: 16px 16px 16px 4px;
    background: var(--surface); color: var(--text); box-shadow: var(--shadow-xs);
  }
  .page-footer {
    margin-top: 40px; padding-top: 20px;
    border-top: 1px solid var(--border);
    color: var(--text-3); font-size: 12px; text-align: center;
  }
  /* 联网资料 */
  .sources {
    margin-bottom: 12px; border: 1px solid var(--border); border-radius: 10px;
    background: var(--surface-2);
  }
  .sources > summary {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 12px; color: var(--text-2); font-size: 12px;
    cursor: pointer; list-style: none;
  }
  .sources > summary::-webkit-details-marker { display: none; }
  .sources-ico { color: var(--accent); font-size: 12px; }
  .sources ol {
    margin: 0; padding: 2px 14px 12px 32px;
    color: var(--text-2); font-size: 12.5px; line-height: 1.8;
  }
  .sources li { margin: 2px 0; }
  .sources li em { margin-left: 8px; color: var(--text-3); font-size: 11px; font-style: normal; }
  .sources a { color: var(--accent); text-decoration: none; }
  .sources a:hover { text-decoration: underline; }
  /* 思考过程 */
  .think {
    margin-bottom: 12px; padding: 10px 12px 10px 14px;
    border-left: 2px solid var(--border-strong); border-radius: 0 8px 8px 0;
    background: var(--surface-2);
  }
  .think-label { margin-bottom: 4px; color: var(--warning); font-size: 12px; font-weight: 600; }
  .think .md { color: var(--text-3); font-size: 13px; }
  /* 回答排版 */
  .md { line-height: 1.75; overflow-wrap: break-word; }
  .md > :first-child { margin-top: 0; }
  .md p { margin: 0 0 10px; }
  .md p:last-child { margin-bottom: 0; }
  .md h1, .md h2, .md h3, .md h4 { margin: 16px 0 8px; color: var(--text); font-weight: 600; line-height: 1.4; }
  .md h1 { font-size: 20px; }
  .md h2 { font-size: 18px; }
  .md h3 { font-size: 16px; }
  .md h4 { font-size: 14px; }
  .md ul, .md ol { margin: 8px 0 10px; padding-left: 22px; }
  .md ul { list-style: disc; }
  .md ol { list-style: decimal; }
  .md li { margin: 4px 0; }
  .md blockquote {
    margin: 10px 0; padding: 8px 14px;
    border-left: 3px solid var(--border-strong); border-radius: 0 8px 8px 0;
    background: var(--surface-2); color: var(--text-2);
  }
  .md a { color: var(--accent); text-decoration: none; }
  .md a:hover { text-decoration: underline; }
  .md img { max-width: 100%; height: auto; border-radius: 8px; }
  .md hr { height: 1px; margin: 16px 0; border: 0; background: var(--border); }
  .md table { width: 100%; margin: 10px 0; border-collapse: collapse; font-size: 13px; }
  .md th { padding: 8px 10px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font-weight: 600; text-align: left; }
  .md td { padding: 8px 10px; border: 1px solid var(--border); color: var(--text-2); }
  .md code {
    padding: 2px 5px; border-radius: 4px;
    background: var(--surface-3); color: var(--accent-active);
    font-family: var(--font-mono); font-size: 0.92em;
  }
  /* 代码块 */
  .md .pre-code-box {
    margin: 12px 0; border: 1px solid #30333c; border-radius: 10px;
    overflow: hidden; background: #1b1d23;
  }
  .md .pre-code-header {
    display: flex; align-items: center; justify-content: space-between;
    height: 38px; padding: 0 14px;
    background: #23252c; color: #a9adb7; font-size: 12px;
  }
  .md .code-block-header__lang { color: #c7cad2; font-size: 12px; font-weight: 500; }
  /* 导出文件里复制 / 下载按钮不可用，直接隐藏 */
  .md .code-block-header__actions { display: none; }
  .md .pre-code { overflow-x: auto; }
  .md .pre-code code.hljs {
    display: block; padding: 14px 16px;
    background: #1b1d23; color: #e6e8ee;
    font-family: var(--font-mono); font-size: 13px; line-height: 1.65;
    white-space: pre-wrap; overflow-wrap: break-word;
  }
  .md pre code.hljs, .md .pre-code-box code { padding: 0; border-radius: 0; background: none; font-size: 13px; }
  /* highlight.js a11y-dark 配色，与应用内一致 */
  .hljs-comment, .hljs-quote { color: #d4d0ab; }
  .hljs-variable, .hljs-template-variable, .hljs-tag, .hljs-name, .hljs-selector-id,
  .hljs-selector-class, .hljs-regexp, .hljs-deletion { color: #ffa07a; }
  .hljs-number, .hljs-built_in, .hljs-literal, .hljs-type, .hljs-params, .hljs-meta,
  .hljs-link { color: #f5ab35; }
  .hljs-attribute { color: #ffd700; }
  .hljs-string, .hljs-symbol, .hljs-bullet, .hljs-addition { color: #abe338; }
  .hljs-title, .hljs-section { color: #00e0e0; }
  .hljs-keyword, .hljs-selector-tag { color: #dcc6e0; }
  .hljs-emphasis { font-style: italic; }
  .hljs-strong { font-weight: bold; }
  /* 小屏适配与打印 */
  @media (max-width: 640px) {
    .page { padding: 24px 14px 40px; }
    .bubble { max-width: 100%; }
    .avatar { width: 30px; height: 30px; }
  }
  @media print {
    .turn { break-inside: avoid; }
    .bubble--ai { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">
  <header class="page-header">
    <h1>${escapeHtml(title)}</h1>
    <p class="page-meta">导出时间：${date}　|　共 ${allText.length} 轮对话</p>
  </header>
  <main class="turns">
    ${messages}
  </main>
  <footer class="page-footer">由冒险者公会 · 未来智匠导出</footer>
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
          resetBranches()
          streamingNodeId.value = ''
          responce = ''
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

// 用指定叶子节点重建当前展示，并保持视口锚定
const renderBranchView = (leafId: string, anchorTurnIndex = 0) => {
  const container = chatContainer.value
  const anchorEl = container?.querySelector(
    `[data-turn="${anchorTurnIndex}"]`
  ) as HTMLElement | null
  const beforeTop = anchorEl ? anchorEl.getBoundingClientRect().top : 0

  isAnchoring.value = true
  const items = buildAllText(pathTo(leafId))
  allText.splice(0, allText.length, ...items)
  timeCount.value = items.length
  editIndex.value = -1

  nextTick(() => {
    if (container) {
      const nextEl = container.querySelector(
        `[data-turn="${anchorTurnIndex}"]`
      ) as HTMLElement | null
      if (nextEl) {
        const previousBehavior = container.style.scrollBehavior
        container.style.scrollBehavior = 'auto'
        if (anchorEl) {
          container.scrollTop += nextEl.getBoundingClientRect().top - beforeTop
        } else {
          container.scrollTop = container.scrollHeight
        }
        container.style.scrollBehavior = previousBehavior
      }
    }
    copyCode('.code-block-header__copy')
    requestAnimationFrame(() => {
      isAnchoring.value = false
    })
  })
}

// 版本翻页器：切换到同一轮的兄弟分支，并定位到同一轮次
const switchTurnVersion = (turnIndex: number, role: 'user' | 'assistant', delta: number) => {
  if (isAnswering.value) {
    showMessage(CONSTATNS.MESSAGES.ANSWERING, 'warning')
    return
  }
  const node = viewPath.value[turnIndex * 2 + (role === 'assistant' ? 1 : 0)]
  if (!node) return
  const siblings = getSiblings(node)
  if (siblings.length < 2) return
  const current = versionOf(node).index
  const nextIndex = Math.min(siblings.length - 1, Math.max(0, current + delta))
  if (nextIndex === current) return

  const leaf = deepestLeaf(siblings[nextIndex])
  commitActiveLeaf(leaf.id)
  renderBranchView(leaf.id, turnIndex)
  // 活动端点变化后同步服务端的线性历史
  saveMessage()
}

// 重新生成某一轮的 AI 回答，产生新的兄弟版本
const regenerate = (turnIndex: number) => {
  if (isAnswering.value) {
    showMessage(CONSTATNS.MESSAGES.ANSWERING, 'warning')
    return
  }
  const userNode = viewPath.value[turnIndex * 2]
  if (!userNode || userNode.role !== 'user') return

  const isDeepSeek = currentModel.value == CONSTATNS.MODELS.DEEPSEEK_V4
  const assistantNode = addNode({
    parentId: userNode.id,
    role: 'assistant',
    adminContent: { adminText: '', isShow: true },
    thinkContent:
      isDeepSeek && apiModuleId.value == CONSTATNS.MODELS.REASONER_MODULE
        ? { thinkText: '', status: '1', isShow: true, isOpen: false }
        : null,
    status: 'streaming'
  })
  commitActiveLeaf(assistantNode.id)

  const items = buildAllText(pathTo(assistantNode.id))
  allText.splice(0, allText.length, ...items)
  runTurn(turnIndex, userNode, assistantNode)
}

// 点击编辑
const editChat = (index: number, text: string) => {
  if (isAnswering.value) {
    showMessage(CONSTATNS.MESSAGES.ANSWERING, 'warning')
    return
  }
  editIndex.value = index
  editText.value = text
  hoveredIndex.value = null
  nextTick(() => {
    const textarea = document.querySelector('.chat-edit-textarea') as HTMLTextAreaElement | null
    textarea?.focus()
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length)
  })
}

// 取消编辑
const editCancle = () => {
  editIndex.value = -1
}

// 编辑框回车提交（输入法组合输入时忽略）
const handleEditKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) return
  event.preventDefault()
  editSubmit()
}

// 提交修改的用户内容：创建新的用户版本并重新生成
const editSubmit = () => {
  if (isAnswering.value) {
    showMessage(CONSTATNS.MESSAGES.ANSWERING, 'warning')
    return
  }
  const index = editIndex.value
  const nextText = editText.value.trim()
  if (index < 0) return
  if (!nextText) {
    showMessage(CONSTATNS.MESSAGES.INPUT_REQUIRED, 'warning')
    return
  }

  const oldUser = viewPath.value[index * 2]
  if (!oldUser || oldUser.role !== 'user') {
    editIndex.value = -1
    return
  }
  editIndex.value = -1
  if (nextText === oldUser.content) return

  // 保留原消息附带的文件上下文
  const suffix = oldUser.apiContent.startsWith(oldUser.content)
    ? oldUser.apiContent.slice(oldUser.content.length)
    : ''
  const isDeepSeek = currentModel.value == CONSTATNS.MODELS.DEEPSEEK_V4
  const userNode = addNode({
    parentId: oldUser.parentId,
    role: 'user',
    content: nextText,
    apiContent: nextText + suffix,
    status: 'done'
  })
  const assistantNode = addNode({
    parentId: userNode.id,
    role: 'assistant',
    adminContent: { adminText: '', isShow: true },
    thinkContent:
      isDeepSeek && apiModuleId.value == CONSTATNS.MODELS.REASONER_MODULE
        ? { thinkText: '', status: '1', isShow: true, isOpen: false }
        : null,
    status: 'streaming'
  })
  commitActiveLeaf(assistantNode.id)

  const items = buildAllText(pathTo(assistantNode.id))
  allText.splice(0, allText.length, ...items)
  runTurn(index, userNode, assistantNode)
}

// 复制用户内容
const copyDocument = () => {
  copyCode('.copyDocument')
}

// 写入剪贴板（优先使用异步 API，非安全上下文回退到 execCommand）
const writeClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (!copied) throw new Error('copy failed')
    }
    showMessage(CONSTATNS.MESSAGES.COPY_SUCCESS, 'success')
  } catch {
    showMessage(CONSTATNS.MESSAGES.COPY_FAILED, 'error')
  }
}

// 复制 AI 回答：优先复制原始 Markdown，旧数据只有 HTML 时转为纯文本
const copyAnswer = (index: number) => {
  const assistantNode = viewPath.value[index * 2 + 1]
  let text = assistantNode?.raw || allText[index]?.adminContent.adminText || ''
  if (!assistantNode?.raw && /<\/?[a-z][^>]*>/i.test(text)) {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = text
    text = wrapper.textContent || ''
  }
  text = text.trim()
  if (!text) {
    showMessage(CONSTATNS.MESSAGES.COPY_FAILED, 'error')
    return
  }
  writeClipboard(text)
}

const toggleDeepThinking = () => {
  if (currentModel.value == CONSTATNS.MODELS.DEEPSEEK_V4) {
    isDeepThinking.value = !isDeepThinking.value
    apiModuleId.value = isDeepThinking.value
      ? CONSTATNS.MODELS.REASONER_MODULE
      : CONSTATNS.MODELS.DEFAULT_MODULE
    return
  }
  showMessage(CONSTATNS.MESSAGES.REASONER_ONLY, 'warning')
}

const goTocustomerService = () => {
  router.push({ name: 'CustomerService', query: { appid: nickAll.appid } })
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
      :deepseek-groups="deepseekGroups"
      :active-deepseek-id="activeDeepseekId"
      @add-classify="addClassify"
      @select-message="selectMessage"
      @remove-classify="removeClassify"
      @go-customer-service="goTocustomerService"
      @new-deepseek-chat="startDeepseekChat"
      @select-deepseek="openDeepseekConversation"
      @remove-deepseek="removeDeepseekConversation"
      @pin-deepseek="toggleDeepseekPinned"
      @rename-deepseek="renameDeepseekConversation"
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
        @update:nickname="editAll.nickname = $event"
      />
      <!-- 聊天区域 -->
      <div class="pixel-chat-wrap">
        <div
          class="flex-1 overflow-y-auto overflow-x-hidden pr-4 pb-4 chat-wrapper min-w-0"
          ref="chatContainer"
          :class="isStopText ? 'wrapper' : ''"
        >
          <div v-if="!allText.length" class="chat-empty">
            <div class="chat-empty-icon"><i class="fas fa-comments"></i></div>
            <p class="chat-empty-title">开始一段新的冒险</p>
            <p class="chat-empty-desc">发送你的第一个问题，或从左侧选择已有角色继续对话</p>
          </div>
          <div
            v-for="(item, index) in allText"
            :key="branchTurnKeys[index] ?? index"
            class="chat-turn"
            :data-turn="index"
          >
            <!-- 编辑模式：保留在父组件，直接操作 editText ref -->
            <div class="flex justify-end relative" v-if="editIndex == index">
              <div class="chat-edit">
                <textarea
                  name="content"
                  class="chat-edit-textarea text-sm"
                  v-model="editText"
                  @keydown.enter.exact="handleEditKeydown"
                  @keydown.esc="editCancle"
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
                    class="pixel-btn pixel-btn-primary px-3 py-1 text-sm cursor-pointer"
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
              :item="item"
              :index="index"
              :editing="editIndex == index"
              :nick-img="nickAll.nickImg"
              :ai-avatar-url="aiAvatarUrl"
              :hovered-index="hoveredIndex"
              :is-answering="isAnswering"
              :speaking-index="speakingIndex"
              :user-version="turnMeta[index]?.user ?? { index: 0, total: 0 }"
              :assistant-version="turnMeta[index]?.assistant ?? { index: 0, total: 0 }"
              @set-hovered="setHoveredIndex"
              @edit-chat="editChat"
              @copy-document="copyDocument"
              @copy-answer="copyAnswer(index)"
              @speak="speak"
              @toggle-think="item => (item.thinkContent!.isOpen = !item.thinkContent!.isOpen)"
              @switch-version="
                (role: 'user' | 'assistant', delta: number) => switchTurnVersion(index, role, delta)
              "
              @regenerate="regenerate(index)"
              @open-search-sources="openSearchSources"
            />
          </div>
        </div>
        <ChatInput
          v-model:content-text="contentText"
          :filename-all="filenameAll"
          :is-answering="isAnswering"
          :is-stop-text="isStopText"
          :is-deep-thinking="isDeepThinking"
          :web-search="isWebSearch"
          :web-search-disabled="currentModel !== CONSTATNS.MODELS.DEEPSEEK_V4"
          :is-disabled="isDisabled"
          @send="sendTxt"
          @stop-export="stopExport"
          @toggle-deep-thinking="toggleDeepThinking"
          @toggle-web-search="isWebSearch = !isWebSearch"
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

    <!-- 联网资料抽屉 -->
    <el-drawer
      v-model="searchDrawerVisible"
      direction="rtl"
      size="min(520px, 94vw)"
      :with-header="false"
      class="search-source-drawer"
      append-to-body
    >
      <div class="source-drawer">
        <header class="source-drawer-head">
          <div class="source-drawer-icon">
            <i class="fas fa-globe"></i>
          </div>
          <div class="source-drawer-titles">
            <h3>联网资料</h3>
            <p>共 {{ searchDrawerResults.length }} 条 · 点击卡片查看原文</p>
          </div>
          <button
            type="button"
            class="source-drawer-close cursor-pointer"
            aria-label="关闭联网资料"
            @click="searchDrawerVisible = false"
          >
            <i class="fas fa-times"></i>
          </button>
        </header>

        <div class="source-drawer-body">
          <a
            v-for="(source, sourceIndex) in searchDrawerResults"
            :key="(source.url || source.title || 'source') + sourceIndex"
            class="source-card"
            :class="{ 'source-card--active': searchDrawerFocus === sourceIndex }"
            :data-source-index="sourceIndex"
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="source-card-top">
              <span class="source-card-index">{{ sourceIndex + 1 }}</span>
              <span class="source-card-favicon">
                <i class="fas fa-globe"></i>
                <img
                  v-if="source.site_icon"
                  :src="source.site_icon"
                  alt=""
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="handleSourceIconError"
                />
              </span>
              <span class="source-card-meta">
                <span class="source-card-site">{{ source.site_name || '网页' }}</span>
                <span v-if="formatSourceDate(source.date)" class="source-card-date">
                  {{ formatSourceDate(source.date) }}
                </span>
              </span>
              <i class="fas fa-arrow-up-right-from-square source-card-link-icon"></i>
            </div>
            <h4 class="source-card-title">{{ source.title || source.url }}</h4>
            <p class="source-card-summary">{{ source.summary || source.snippet || '暂无摘要' }}</p>
            <p class="source-card-url">{{ source.url }}</p>
          </a>

          <div v-if="!searchDrawerResults.length" class="source-drawer-empty">
            <i class="fas fa-inbox"></i>
            <p>暂无可展示的资料</p>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style lang="scss" scoped>
.pixel-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

/* 浅色模式下加深画布、强化分割线，避免整页过白 */
:global(html:not(.dark)) .pixel-page {
  --bg: #edf0f5;
  --surface-2: #f4f6fa;
  --surface-3: #e8ecf3;
  --surface-hover: #eef2f8;
  --border: #dfe4ed;
  --border-strong: #cbd3e0;
  --text-2: #4a5262;
  --text-3: #78808f;
}

.pixel-main {
  margin-left: var(--sidebar-w);
  height: 100vh;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg);
}

.pixel-chat-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 24px 22px;
  display: flex;
  flex-direction: column;
}

.chat-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-right: 100px;
  padding-bottom: 8px;
  overflow-anchor: none;
  scroll-behavior: smooth;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px 20px;
  text-align: center;
}

.chat-empty-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--accent);
  font-size: 22px;
  box-shadow: var(--shadow-xs);
}

.chat-empty-title {
  margin: 0;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.chat-empty-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

.chat-turn {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.wrapper {
  scroll-behavior: smooth;
}

.chat-edit {
  position: relative;
  width: calc(100% - 90px);
  margin-right: 10px;
}

.chat-edit-textarea {
  display: block;
  width: 100%;

  /* 底部留出按钮的悬浮空间，避免文字被遮挡 */
  padding: 12px 14px 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  resize: none;
  box-shadow: var(--shadow-xs);
  transition:
    border-color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);

  &:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-ring);
  }
}

.chat-edit-execute {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ===== 联网资料抽屉 ===== */
.source-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
  color: var(--text);
}

.source-drawer-head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
}

.source-drawer-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--accent-ring);
  border-radius: 11px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 15px;
}

.source-drawer-titles {
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0;
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
  }

  p {
    margin: 3px 0 0;
    color: var(--text-3);
    font-size: 12px;
  }
}

.source-drawer-close {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-3);
  font-size: 13px;
  transition:
    background 0.15s var(--ease),
    border-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    border-color: var(--border);
    background: var(--surface-hover);
    color: var(--text);
  }
}

.source-drawer-body {
  flex: 1;
  min-height: 0;
  padding: 16px 18px 24px;
  overflow-y: auto;
}

.source-card {
  display: block;
  padding: 13px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: inherit;
  text-decoration: none;
  transition:
    background 0.15s var(--ease),
    border-color 0.15s var(--ease),
    box-shadow 0.15s var(--ease);

  & + & {
    margin-top: 10px;
  }

  &:hover {
    border-color: var(--accent-ring);
    background: var(--surface-2);
    box-shadow: var(--shadow-xs);

    .source-card-title,
    .source-card-link-icon {
      color: var(--accent);
    }
  }
}

.source-card--active {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.source-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.source-card-index {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.source-card-favicon {
  position: relative;
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 16px;
  height: 16px;
  overflow: hidden;
  border-radius: 4px;
  color: var(--text-3);
  font-size: 10px;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: var(--surface);
    object-fit: contain;
  }
}

.source-card-meta {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--text-3);
  font-size: 11px;
}

.source-card-site {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.source-card-date::before {
  margin-right: 6px;
  content: '·';
}

.source-card-link-icon {
  flex-shrink: 0;
  color: var(--text-3);
  font-size: 11px;
  transition: color 0.15s var(--ease);
}

.source-card-title {
  display: -webkit-box;
  margin: 0 0 6px;
  overflow: hidden;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  transition: color 0.15s var(--ease);
}

.source-card-summary {
  display: -webkit-box;
  margin: 0 0 8px;
  overflow: hidden;
  color: var(--text-2);
  font-size: 12.5px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.source-card-url {
  margin: 0;
  overflow: hidden;
  color: var(--text-3);
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.source-drawer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 80px 20px;
  color: var(--text-3);
  font-size: 13px;

  i {
    font-size: 24px;
  }

  p {
    margin: 0;
  }
}

@media (width <= 1024px) {
  .pixel-chat-wrap {
    padding: 12px 16px 18px;
  }

  .chat-edit {
    width: min(100%, 560px);
  }
}

@media (width <= 860px) {
  .pixel-chat-wrap {
    padding: 12px 12px 16px;
  }
}
</style>
