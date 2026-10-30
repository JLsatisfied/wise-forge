<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'
// import 'highlight.js/styles/github.css'
import hljs from 'highlight.js'
import { aicgApi } from '@/api/aicg.ts'
import { useRoute, useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'

defineOptions({
  name: 'CustomerService'
})

const router = useRouter()

const chatConfig = reactive({
  welcomeText: '你好，我是这里的智能客服，有什么可以帮你的？',
  signature: '未来智匠 · 智能客服',
  title: '在线客服',
  techBrand: '未来智匠',
  themeColor: '#2563eb',
  apiKey: '' // 存储 DeepSeek API Key
})

const colorPresets = [
  { name: '蓝色', value: '#2563eb' },
  { name: '绿色', value: '#16a34a' },
  { name: '紫色', value: '#9333ea' },
  { name: '红色', value: '#dc2626' },
  { name: '深灰', value: '#374151' },
  { name: '金色', value: '#eab308' }
]

const newMessage = ref('')
const isTyping = ref(false)
const messages = ref<Array<{ type: 'user' | 'ai'; content: string }>>([])
const messagesContainer = ref<HTMLElement | null>(null)
const textareaDialogue = ref<HTMLElement | null>(null)
const controller = ref<AbortController | null>(null) // 用于中止请求

const apiDialogVisible = ref(false)
const publishDialogVisible = ref(false)
const rawHtml = ref('')
const route = useRoute()
const appid = ref('')
const windowUrl = ref('')

let apiConfig = reactive({
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 1000,
  topP: 0.9,
  stream: true
})

const md: MarkdownIt = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        )
      } catch {
        // 降级处理
      }
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

// 设置主题颜色
const setThemeColor = (color: string) => {
  chatConfig.themeColor = color
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    nextTick(() => {
      messagesContainer.value!.scrollTop = messagesContainer.value!.scrollHeight
    })
  }
}

// 调用 DeepSeek API
const callDeepSeekAPI = async (prompt: string) => {
  if (!chatConfig.apiKey) {
    // 如果没有API Key，使用模拟回复
    return simulateAPIResponse()
  }

  try {
    // 创建新的 AbortController
    controller.value = new AbortController()
    const signal = controller.value.signal
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chatConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: apiConfig.temperature,
        max_tokens: apiConfig.maxTokens,
        top_p: apiConfig.topP,
        stream: apiConfig.stream
      }),
      signal // 添加信号以便能够中止请求
    })

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('响应没有可读流')
    }

    const reader = response.body.getReader()
    let partialResponse = ''
    let currentAIMessage = {
      type: 'ai' as const,
      content: ''
    }

    // 添加空消息开始流式传输
    messages.value.push(currentAIMessage)

    // 如果不是流式输出，等待完整响应
    if (!apiConfig.stream) {
      let result = ''
      let done = false

      while (!done) {
        const { done: isDone, value } = await reader.read()
        if (isDone) {
          done = true
          break
        }

        result += new TextDecoder().decode(value)
      }

      try {
        const jsonResponse = JSON.parse(result)
        const content = jsonResponse.choices[0]?.message?.content || ''

        currentAIMessage.content = content
        messages.value[messages.value.length - 1] = { ...currentAIMessage }
        scrollToBottom()

        return content
      } catch (e) {
        console.error('解析响应失败:', e)
        return '解析响应失败'
      }
    }

    // 流式输出处理
    while (true) {
      if (!isTyping.value) {
        reader.cancel()
        break
      }

      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // 解析流数据
      const chunk = new TextDecoder().decode(value)
      partialResponse += chunk

      // 解析SSE格式，提取内容
      const lines = partialResponse.split('\n\n')
      partialResponse = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsedData = JSON.parse(data)
            const content = parsedData.choices[0]?.delta?.content || ''

            if (content) {
              // 更新最后一条AI消息
              currentAIMessage.content += content
              messages.value[messages.value.length - 1] = { ...currentAIMessage }
              scrollToBottom()
            }
          } catch (e) {
            console.error('解析响应失败:', e)
          }
        }
      }
    }

    return currentAIMessage.content
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('请求被取消')
      return '请求已取消'
    }
    console.error('API调用失败:', error)
    return '抱歉，发生了错误，无法获取回复。'
  }
}

// 模拟API响应（当API Key未提供时使用）
const simulateAPIResponse = async () => {
  const responses = [
    '这是模拟回复。在「API 配置」中填入 DeepSeek API Key 后，就能接入真实模型。',
    '你可以在左侧修改欢迎语、署名和主题色，右侧会实时预览效果。',
    '点击「获取嵌入代码」，把代码粘贴到你的网页，客服就能上线。',
    '这段文字用于演示流式输出，实际回答由模型生成。',
    '如果访客常问同一个问题，可以把标准答案写进欢迎语。',
    '配置保存后，刷新页面会保留你的客服设置。'
  ]

  // 创建消息对象
  const aiMessage = {
    type: 'ai' as const,
    content: ''
  }

  // 添加空消息开始模拟流式传输
  messages.value.push(aiMessage)

  // 选择一个响应
  const fullResponse = responses[Math.floor(Math.random() * responses.length)]
  let currentIndex = 0

  // 模拟流式传输，每100ms添加一个字符
  return new Promise<string>(resolve => {
    const interval = setInterval(() => {
      if (!isTyping.value || currentIndex >= fullResponse.length) {
        clearInterval(interval)
        resolve(aiMessage.content)
        return
      }

      aiMessage.content += fullResponse[currentIndex]
      messages.value[messages.value.length - 1] = { ...aiMessage }
      scrollToBottom()
      currentIndex++
    }, 100)
  })
}

// 发送消息
const sendMessage = async () => {
  if (!newMessage.value.trim() || isTyping.value) return

  // 添加用户消息
  const userMessage = newMessage.value.trim()
  messages.value.push({
    type: 'user',
    content: userMessage
  })
  console.log(messages.value)

  newMessage.value = ''
  if (textareaDialogue.value) {
    textareaDialogue.value.style.height = 'auto'
  }
  scrollToBottom()

  // 开始AI回复
  isTyping.value = true
  await callDeepSeekAPI(userMessage)
  isTyping.value = false
}

// 停止打字
const stopTyping = () => {
  if (controller.value) {
    controller.value.abort() // 中止API请求
  }

  isTyping.value = false

  // 如果最后一条消息是AI消息且内容为空，添加已停止提示
  const lastMessage = messages.value[messages.value.length - 1]
  if (lastMessage && lastMessage.type === 'ai' && !lastMessage.content.trim()) {
    lastMessage.content = '回复已停止...'
  } else if (lastMessage && lastMessage.type === 'ai') {
    // 如果已经有内容，追加停止提示
    lastMessage.content += ' (回复已停止)'
  }

  scrollToBottom()
}

// 重置对话
const resetConversation = () => {
  // 如果有请求在进行中，先中止它
  if (controller.value && isTyping.value) {
    controller.value.abort()
    isTyping.value = false
  }

  messages.value = [
    {
      type: 'ai',
      content: chatConfig.welcomeText
    }
  ]
}

// 测试对话
const startTestConversation = () => {
  // 防抖：如果isTyping为真，不允许再次启动测试对话
  if (isTyping.value) return

  resetConversation()
  setTimeout(() => {
    messages.value.push({
      type: 'user',
      content: '你好，这个客服都有什么功能？'
    })
    scrollToBottom()

    // 模拟AI回复
    isTyping.value = true
    callDeepSeekAPI('你好，这个客服都有什么功能？').then(() => {
      isTyping.value = false
    })
  }, 500)
}

// 查看API配置
const showApiConfig = () => {
  // 复制当前配置到临时变量
  // apiConfig.apiKey = chatConfig.apiKey
  apiDialogVisible.value = true
}

// 保存API配置
const saveApiConfig = () => {
  // 更新API Key到主配置
  chatConfig.apiKey = apiConfig.apiKey

  // 关闭对话框
  apiDialogVisible.value = false

  // 提示保存成功
  ElMessage({
    message: 'API 配置已保存',
    type: 'success'
  })
}

// 保存配置
const saveConfig = () => {
  const config = {
    appid: appid.value,
    welcomeText: chatConfig.welcomeText,
    signature: chatConfig.signature,
    title: chatConfig.title,
    techBrand: chatConfig.techBrand,
    themeColor: chatConfig.themeColor
  }
  // localStorage.setItem('chatConfig', config)
  aicgApi.addCustomerService(config).then(res => {
    if (res.data.code == 0) {
      ElMessage({
        message: '客服配置已保存',
        type: 'success'
      })
    } else {
      ElMessage({
        message: res.data.msg,
        type: 'error'
      })
    }
  })
}

// 导出配置
const exportConfig = () => {
  const config = JSON.stringify(chatConfig, null, 2)
  const blob = new Blob([config], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'chat-config.json'
  a.click()

  URL.revokeObjectURL(url)
}

// 将Markdown转换为HTML
const renderMarkdown = (text: string) => {
  try {
    return md.render(text)
  } catch (error) {
    console.error('Markdown解析错误:', error)
    return text
  }
}

const copyCode = () => {
  let text = `<script>
window.BotConfig = {
  appId: "${appid.value}"
};
(function () {
  var scriptElement = document.createElement("script");
  scriptElement.src = "${windowUrl.value}/js/kefuButton.js";
  document.head.appendChild(scriptElement);
})();
<\/script>`

  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        ElMessage({
          message: '嵌入代码已复制',
          type: 'success'
        })
      })
      .catch(() => {
        ElMessage({
          message: '复制失败，请手动选中代码复制',
          type: 'error'
        })
      })
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = text
    // 隐藏文本框（多种方式组合确保不可见）
    textarea.style.position = 'fixed' // 防止滚动跳动
    textarea.style.opacity = '0' // 完全透明
    textarea.style.left = '-9999px' // 移出可视区域
    textarea.style.pointerEvents = 'none' // 禁止交互
    textarea.setAttribute('readonly', '') // 防止移动端键盘弹出
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      ElMessage({
        message: '嵌入代码已复制',
        type: 'success'
      })
    } catch {
      ElMessage({
        message: '复制失败，请手动选中代码复制',
        type: 'error'
      })
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

// 调整输入框高度
const adjustTextareaHeight = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
}

// 处理输入框按键
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    if (event.ctrlKey) {
      // Ctrl+Enter 换行
      event.preventDefault()
      const textarea = event.target as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value
      textarea.value = value.substring(0, start) + '\n' + value.substring(end)
      textarea.selectionStart = textarea.selectionEnd = start + 1
      adjustTextareaHeight(event)
    } else {
      // Enter 发送消息
      event.preventDefault()
      sendMessage()
    }
  }
}

// 返回上一页
const goBack = () => {
  router.go(-1)
}

onMounted(() => {
  if (window.location.origin == 'http://localhost:5173') {
    windowUrl.value = 'http://localhost:5002'
  } else {
    windowUrl.value = 'http://120.26.105.110'
  }
  appid.value = route.query.appid as string
  rawHtml.value = `
<pre>
<code>&lt;script&gt;
window.BotConfig = {
  appId: "${appid.value}"
};
(function () {
  var scriptElement = document.createElement("script");
  scriptElement.src = "${windowUrl.value}/js/kefuButton.js";
  document.head.appendChild(scriptElement);
})();
&lt;/script&gt;</code>
</pre>`
  // 初始化欢迎消息
  messages.value = [
    {
      type: 'ai',
      content: chatConfig.welcomeText
    }
  ]
})

onUnmounted(() => {
  localStorage.removeItem('apiConfig')
})
</script>

<template>
  <div class="cs-page">
    <!-- 左侧配置区域 -->
    <aside class="cs-sidebar">
      <div class="cs-sidebar-head">
        <div class="cs-brand">
          <span class="cs-brand-mark"><i class="fas fa-headset"></i></span>
          <div class="cs-brand-copy">
            <h1>智能客服</h1>
            <p>配置并预览你的客服组件</p>
          </div>
        </div>
        <div class="cs-head-actions">
          <ThemeToggle />
          <button class="cs-icon-btn" title="返回" @click="goBack">
            <i class="fas fa-arrow-left"></i>
          </button>
        </div>
      </div>

      <div class="cs-scroll">
        <!-- 基础配置区 -->
        <section class="cs-section">
          <h2 class="cs-section-title">品牌文案</h2>

          <label class="cs-field">
            <span>欢迎语</span>
            <input v-model="chatConfig.welcomeText" type="text" placeholder="输入欢迎语" />
          </label>

          <label class="cs-field">
            <span>署名</span>
            <input v-model="chatConfig.signature" type="text" placeholder="输入署名" />
          </label>

          <label class="cs-field">
            <span>客服名称</span>
            <input v-model="chatConfig.title" type="text" placeholder="显示在聊天窗口顶部" />
          </label>

          <label class="cs-field">
            <span>品牌名称</span>
            <input v-model="chatConfig.techBrand" type="text" placeholder="显示在输入框下方" />
          </label>
        </section>

        <!-- 颜色配置区 -->
        <section class="cs-section">
          <h2 class="cs-section-title">主题配色</h2>
          <div class="cs-swatches">
            <button
              v-for="color in colorPresets"
              :key="color.value"
              class="cs-swatch"
              :class="{ 'is-active': chatConfig.themeColor === color.value }"
              :style="{ '--swatch': color.value }"
              :title="color.name"
              @click="setThemeColor(color.value)"
            >
              <span class="cs-swatch-dot"></span>
              <span class="cs-swatch-name">{{ color.name }}</span>
            </button>
          </div>
        </section>

        <!-- 测试功能区 -->
        <section class="cs-section">
          <h2 class="cs-section-title">调试工具</h2>
          <div class="cs-tools">
            <button class="btn btn-secondary" @click="startTestConversation">
              <i class="fas fa-flask"></i>
              模拟对话
            </button>
            <button class="btn btn-secondary" @click="showApiConfig">
              <i class="fas fa-key"></i>
              API 配置
            </button>
          </div>
        </section>
      </div>

      <div class="cs-sidebar-footer">
        <button class="btn btn-primary btn-block" @click="saveConfig">
          <i class="fas fa-check"></i>
          保存配置
        </button>
        <button class="btn btn-secondary btn-block" @click="publishDialogVisible = true">
          <i class="fas fa-code"></i>
          获取嵌入代码
        </button>
      </div>
    </aside>

    <!-- 右侧对话区域 -->
    <main class="cs-preview">
      <div class="cs-preview-head">
        <div>
          <h2>效果预览</h2>
          <p>调整左侧配置，右侧会实时更新</p>
        </div>
        <div class="cs-preview-actions">
          <button class="btn btn-secondary" @click="resetConversation">
            <i class="fas fa-rotate-left"></i>
            重置对话
          </button>
          <button class="btn btn-primary" @click="exportConfig">
            <i class="fas fa-download"></i>
            导出配置
          </button>
        </div>
      </div>

      <!-- 聊天窗口 -->
      <div class="phone">
        <div class="chat-window">
          <!-- 聊天头部 -->
          <header
            class="chat-header"
            :style="{ backgroundColor: chatConfig.themeColor || '#2563eb' }"
          >
            <div class="chat-head-left">
              <span class="chat-avatar"><i class="fas fa-robot"></i></span>
              <span class="chat-title">{{ chatConfig.title }}</span>
            </div>
            <i class="fas fa-xmark chat-close"></i>
          </header>

          <!-- 聊天消息区域 -->
          <div ref="messagesContainer" class="chat-messages">
            <div v-for="(message, index) in messages" :key="index" class="chat-row">
              <!-- AI消息 -->
              <div v-if="message.type === 'ai' && message.content" class="chat-ai">
                <div
                  class="chat-bubble chat-bubble--ai markdown-content"
                  v-html="renderMarkdown(message.content)"
                ></div>
                <div v-if="chatConfig.signature" class="chat-signature">
                  {{ chatConfig.signature }}
                </div>
              </div>

              <!-- 用户消息 -->
              <div v-else-if="message.content" class="chat-user">
                <div
                  class="chat-bubble chat-bubble--user"
                  :style="{ backgroundColor: chatConfig.themeColor || '#2563eb' }"
                >
                  {{ message.content }}
                </div>
              </div>
            </div>

            <!-- 加载中指示器 -->
            <div
              v-if="
                isTyping &&
                (!messages.length ||
                  messages[messages.length - 1].type !== 'ai' ||
                  messages[messages.length - 1].content === '')
              "
              class="chat-row"
            >
              <div class="chat-ai">
                <div class="chat-bubble chat-bubble--ai chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div v-if="chatConfig.signature" class="chat-signature">
                  {{ chatConfig.signature }}
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="chat-input-area">
            <div class="chat-input-row">
              <textarea
                v-model="newMessage"
                @keydown="handleKeydown"
                placeholder="向智能客服提问..."
                class="chat-textarea"
                rows="1"
                @input="adjustTextareaHeight"
                ref="textareaDialogue"
              ></textarea>
              <button
                v-if="isTyping"
                @click="stopTyping"
                class="chat-send"
                :style="{ backgroundColor: chatConfig.themeColor || '#2563eb' }"
                title="停止回复"
              >
                <i class="fas fa-pause"></i>
              </button>
              <button
                v-else
                @click="sendMessage"
                class="chat-send"
                :style="{ backgroundColor: chatConfig.themeColor || '#2563eb' }"
                title="发送"
              >
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
            <div class="chat-brand">{{ chatConfig.techBrand }}</div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- 发布弹窗 -->
  <el-dialog
    v-model="publishDialogVisible"
    title="获取嵌入代码"
    width="560px"
    class="app-dialog cs-dialog"
  >
    <div class="cs-dialog-block">
      <h3>第一步：复制代码</h3>
      <p class="cs-dialog-text">适用于 PC 端页面。把下面的代码放进每一个需要客服的网页中。</p>
      <div class="cs-code" v-html="rawHtml"></div>
      <button class="btn btn-primary cs-copy-btn" @click="copyCode">
        <i class="fas fa-copy"></i>
        复制代码
      </button>
    </div>
    <div class="cs-dialog-block">
      <h3>第二步：嵌入网页</h3>
      <ol class="cs-steps">
        <li>将代码添加到网页的 <code>&lt;head&gt;</code> 标签内</li>
        <li>不要修改代码中的 <code>appId</code>，否则无法加载客服</li>
      </ol>
    </div>
  </el-dialog>

  <!-- API配置弹窗 -->
  <el-dialog
    v-model="apiDialogVisible"
    title="DeepSeek API 配置"
    width="560px"
    destroy-on-close
    class="app-dialog cs-dialog"
  >
    <el-form label-width="150px" label-position="left">
      <el-form-item label="API Key">
        <el-input v-model="apiConfig.apiKey" placeholder="sk-..." show-password />
        <div class="cs-hint">
          在 DeepSeek 开放平台（platform.deepseek.com）创建，仅保存在当前浏览器中
        </div>
      </el-form-item>

      <el-form-item label="模型 model">
        <el-select v-model="apiConfig.model" class="w-full">
          <el-option label="deepseek-chat" value="deepseek-chat" />
          <el-option label="deepseek-chat-light" value="deepseek-chat-light" />
          <el-option label="deepseek-coder" value="deepseek-coder" />
        </el-select>
      </el-form-item>

      <el-form-item label="温度 temperature">
        <el-slider v-model="apiConfig.temperature" :min="0" :max="1" :step="0.1" class="w-full" />
        <div class="cs-hint">值越低回答越稳定，值越高越发散，客服场景建议 0.3–0.7</div>
      </el-form-item>

      <el-form-item label="最大长度 max_tokens">
        <el-slider
          v-model="apiConfig.maxTokens"
          :min="100"
          :max="4000"
          :step="100"
          class="w-full"
        />
        <div class="cs-hint">单次回复的最大长度，数值越大消耗越多</div>
      </el-form-item>

      <el-form-item label="核采样 top_p">
        <el-slider v-model="apiConfig.topP" :min="0" :max="1" :step="0.1" class="w-full" />
        <div class="cs-hint">控制候选词的多样性，通常保持默认 0.9 即可</div>
      </el-form-item>

      <el-form-item label="流式输出 stream">
        <el-switch v-model="apiConfig.stream" />
        <div class="cs-hint">开启后回答逐字显示，关闭则等待完整回复后一次性显示</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="cs-dialog-footer">
        <button class="btn btn-secondary" @click="apiDialogVisible = false">取消</button>
        <button class="btn btn-primary" @click="saveApiConfig">保存</button>
      </div>
    </template>
  </el-dialog>
</template>

<style>
/* ---------- 通用按钮 ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease),
    box-shadow 0.16s var(--ease);

  i {
    font-size: 12px;
  }

  &:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: var(--border-strong);
  }

  &:active:not(:disabled) {
    background: var(--surface-3);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.btn-primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  box-shadow: 0 4px 12px var(--accent-ring);

  &:hover:not(:disabled) {
    border-color: var(--accent-hover);
    background: var(--accent-hover);
  }

  &:active:not(:disabled) {
    border-color: var(--accent-active);
    background: var(--accent-active);
  }
}

.btn-secondary {
  background: var(--surface-2);
  color: var(--text-2);

  &:hover:not(:disabled) {
    background: var(--surface-3);
    color: var(--text);
  }
}

.btn-block {
  width: 100%;
}

/* ---------- 弹窗（Teleport 到 body，使用全局样式） ---------- */
.cs-dialog {
  max-width: calc(100vw - 32px);
}

.cs-dialog .el-dialog__body {
  padding-top: 16px;
}

.cs-dialog-block + .cs-dialog-block {
  margin-top: 22px;
}

.cs-dialog-block h3 {
  margin: 0 0 6px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.cs-dialog-text {
  margin: 0 0 12px;
  color: var(--text-3);
  font-size: 12.5px;
  line-height: 1.7;
}

.cs-code {
  padding: 14px;
  border-radius: 10px;
  background: #1b1d23;
  color: #e6e8ee;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;

  pre,
  code {
    margin: 0;
    padding: 0;
    background: none;
    color: inherit;
    font-family: inherit;
  }
}

.cs-copy-btn {
  margin-top: 10px;
}

.cs-steps {
  margin: 6px 0 0;
  padding-left: 18px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 2;
  list-style: decimal;
}

.cs-steps code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--surface-3);
  color: var(--accent-active);
  font-family: var(--font-mono);
  font-size: 12px;
}

.cs-hint {
  width: 100%;
  margin-top: 4px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
}

.cs-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<style lang="scss" scoped>
.cs-page {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

/* ---------- 左侧配置栏 ---------- */
.cs-sidebar {
  width: 320px;
  height: 100vh;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--surface);
}

.cs-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 20px 20px 16px;
}

.cs-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.cs-brand-mark {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 15px;
}

.cs-brand-copy {
  min-width: 0;

  h1 {
    margin: 0;
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
  }

  p {
    margin: 2px 0 0;
    color: var(--text-3);
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.cs-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cs-icon-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
    color: var(--text);
  }
}

.cs-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 16px;
}

.cs-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: none;
  }
}

.cs-section-title {
  margin: 0 0 12px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.6px;
}

.cs-field {
  display: block;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  > span {
    display: block;
    margin-bottom: 6px;
    color: var(--text-2);
    font-size: 12px;
    font-weight: 500;
  }

  input {
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text);
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition:
      background-color 0.16s var(--ease),
      border-color 0.16s var(--ease),
      box-shadow 0.16s var(--ease);

    &::placeholder {
      color: var(--text-3);
    }

    &:focus {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-ring);
    }
  }
}

.cs-swatches {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.cs-swatch {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);

  &:hover {
    background: var(--surface-3);
    border-color: var(--border-strong);
  }
}

.cs-swatch-dot {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  border-radius: 3px;
  background: var(--swatch);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.cs-swatch-name {
  white-space: nowrap;
}

.cs-swatch.is-active {
  border-color: var(--swatch);
  background: var(--surface);
  color: var(--text);
  font-weight: 500;
}

.cs-tools {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  .btn {
    height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }
}

.cs-sidebar-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface);

  .btn {
    height: 40px;
  }
}

/* ---------- 右侧预览区 ---------- */
.cs-preview {
  flex: 1;
  min-width: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 32px 40px;
  overflow-y: auto;
  background: var(--bg-subtle);
}

.cs-preview-head {
  width: min(100%, 720px);
  margin: 0 auto 24px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 0;
    color: var(--text);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  p {
    margin: 4px 0 0;
    color: var(--text-3);
    font-size: 12px;
  }
}

.cs-preview-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;

  .btn {
    height: 34px;
    font-size: 12px;
  }
}

.phone {
  width: 375px;
  max-width: 100%;
  height: 667px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 26px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.chat-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-2);
}

.chat-header {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  color: #fff;
}

.chat-head-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.chat-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 12px;
}

.chat-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-close {
  font-size: 14px;
  opacity: 0.75;
  cursor: pointer;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--surface-2);
}

.chat-row {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.chat-ai {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.chat-user {
  display: flex;
  justify-content: flex-end;
}

.chat-bubble {
  max-width: 84%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.65;
  overflow-wrap: break-word;
  box-sizing: border-box;
}

.chat-bubble--ai {
  border: 1px solid var(--border);
  border-radius: 14px 14px 14px 4px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}

.chat-bubble--user {
  width: fit-content;
  border-radius: 14px 14px 4px;
  color: #fff;
  white-space: pre-wrap;
}

.chat-signature {
  margin-top: 5px;
  color: var(--text-3);
  font-size: 10.5px;
}

.chat-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 14px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-3);
    animation: chat-bounce 1.2s infinite ease-in-out;
  }

  span:nth-child(2) {
    animation-delay: 0.15s;
  }

  span:nth-child(3) {
    animation-delay: 0.3s;
  }
}

@keyframes chat-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }

  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

.chat-input-area {
  flex-shrink: 0;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.chat-input-row {
  position: relative;
  display: flex;
  align-items: flex-end;
}

.chat-textarea {
  width: 100%;
  min-height: 52px;
  max-height: 150px;
  padding: 14px 58px 14px 16px;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  resize: none;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-3);
  }
}

.chat-send {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
  transition:
    transform 0.15s var(--ease),
    filter 0.15s var(--ease);

  &:hover {
    filter: brightness(1.07);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.chat-brand {
  padding: 6px 0 8px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 10px;
  text-align: center;
}

/* ---------- 消息内 Markdown ---------- */
.markdown-content {
  overflow-wrap: break-word;

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 6px 0 8px;
    padding-left: 18px;
  }

  :deep(ul) {
    list-style: disc;
  }

  :deep(ol) {
    list-style: decimal;
  }

  :deep(li) {
    margin: 3px 0;
    list-style: inherit;
  }

  :deep(a) {
    color: var(--accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(code) {
    padding: 2px 4px;
    border-radius: 4px;
    background: var(--surface-2);
    color: var(--accent-active);
    font-family: var(--font-mono);
    font-size: 0.92em;
  }

  :deep(pre) {
    margin: 8px 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: #1b1d23;
    color: #e6e8ee;
    font-size: 12px;
    line-height: 1.6;
    overflow-x: auto;
  }

  :deep(pre code) {
    padding: 0;
    background: none;
    color: inherit;
  }

  :deep(blockquote) {
    margin: 8px 0;
    padding: 6px 10px;
    border-left: 3px solid var(--border-strong);
    background: var(--surface-2);
    color: var(--text-2);
  }

  :deep(table) {
    width: 100%;
    margin: 8px 0;
    border-collapse: collapse;
    font-size: 12px;
  }

  :deep(th),
  :deep(td) {
    padding: 6px 8px;
    border: 1px solid var(--border);
  }

  :deep(th) {
    background: var(--surface-2);
    color: var(--text);
  }

  :deep(td) {
    color: var(--text-2);
  }
}

/* ---------- 适配 ---------- */
@media (width <= 1024px) {
  .cs-sidebar {
    width: 300px;
  }

  .cs-preview {
    padding: 24px 20px 32px;
  }
}

@media (width <= 860px) {
  .cs-page {
    flex-direction: column;
  }

  .cs-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .cs-scroll {
    overflow: visible;
  }

  .cs-preview {
    height: auto;
    min-height: 100vh;
    padding: 20px 16px 32px;
  }

  .cs-preview-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (width <= 480px) {
  .cs-preview-actions {
    width: 100%;

    .btn {
      flex: 1;
    }
  }

  .phone {
    height: 600px;
    border-radius: 20px;
  }
}
</style>
