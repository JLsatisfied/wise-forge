<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'
// import 'highlight.js/styles/github.css'
import hljs from 'highlight.js'
import { aicgApi } from '@/api/aicg.ts'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()

const chatConfig = reactive({
  welcomeText: '勇敢的冒险者，欢迎来到冒险者公会！我是你的向导，有什么可以帮你的？',
  signature: '冒险者公会 · 向导',
  title: '冒险者公会',
  techBrand: '未来智匠',
  themeColor: '#1d4ed8',
  apiKey: '' // 存储 DeepSeek API Key
})

const newMessage = ref('')
const isTyping = ref(false)
const messages = ref<Array<{type: 'user' | 'ai', content: string}>>([])
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
        return '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>';
      } catch {
        // 降级处理
      }
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
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
        'Authorization': `Bearer ${chatConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          { role: 'user', content: prompt }
        ],
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
    '冒险者，让我为你翻阅古老的智慧之书...',
    '嗯，这是个值得探索的问题，听我道来。',
    '根据冒险者公会的情报，答案是这样的...',
    '交给我吧！首先我们需要点燃魔法火炬...',
    '这片大陆上许多冒险者都问过类似的问题。',
    '冒险者公会为你提供最专业的魔法支援。'
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
  
  messages.value = [{
    type: 'ai',
    content: chatConfig.welcomeText
  }]
}

// 测试对话
const startTestConversation = () => {
  // 防抖：如果isTyping为真，不允许再次启动测试对话
  if (isTyping.value) return
  
  resetConversation()
  setTimeout(() => {
    messages.value.push({
      type: 'user',
      content: '你好，冒险者公会都有什么功能？'
    })
    scrollToBottom()

    // 模拟AI回复
    isTyping.value = true
    callDeepSeekAPI('你好，冒险者公会都有什么功能？').then(() => {
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
    message: '法术配置已铭刻',
    type: 'success',
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
    themeColor: chatConfig.themeColor,
  }
  // localStorage.setItem('chatConfig', config)
  aicgApi.addCustomerService(config)
    .then((res) => {
      if (res.data.code == 0) {
        ElMessage({
          message: '铭刻成功！配置已保存。',
          type: 'success',
        })
      } else {
        ElMessage({
          message: res.data.msg,
          type: 'error',
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
<\/script>`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      ElMessage({
        message: '符石已复制！',
        type: 'success',
      })
    })
    .catch(()=> {
      ElMessage({
        message: '符石复制失败',
        type: 'error',
      })
    })
  } else {
    const textarea = document.createElement('textarea');
      textarea.value = text;
      // 隐藏文本框（多种方式组合确保不可见）
      textarea.style.position = 'fixed';     // 防止滚动跳动
      textarea.style.opacity = '0';          // 完全透明
      textarea.style.left = '-9999px';       // 移出可视区域
      textarea.style.pointerEvents = 'none'; // 禁止交互
      textarea.setAttribute('readonly', ''); // 防止移动端键盘弹出
      document.body.appendChild(textarea);
      textarea.select()
      try {
        document.execCommand('copy');
        ElMessage({
          message: '符石已复制！',
          type: 'success',
        })
      } catch {
        ElMessage({
          message: '符石复制失败',
          type: 'error',
        })
      } finally {
        document.body.removeChild(textarea);
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
  messages.value = [{
    type: 'ai',
    content: chatConfig.welcomeText
  }]
})

onUnmounted(() => {
  localStorage.removeItem('apiConfig')
})
</script>

<template>
  <div class="flex min-h-screen">
    <!-- 左侧配置区域 -->
    <div class="w-[300px] bg-white border-r p-5 flex flex-col h-screen overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold">冒险者公会</h1>
        <button @click="goBack" class="flex items-center justify-center p-2 rounded-full hover:bg-gray-100" title="返回">
          <i class="fas fa-arrow-left text-gray-600"></i>
        </button>
      </div>
      
      <!-- 基础配置区 -->
      <div class="mb-6">
        <h2 class="text-sm font-bold mb-3">文字铭刻</h2>

        <div class="mb-4">
          <label class="block text-xs text-gray-600 mb-1">欢迎寄语:</label>
          <input v-model="chatConfig.welcomeText" type="text" class="w-full border rounded p-2 text-sm bg-gray-50" />
        </div>

        <div class="mb-4">
          <label class="block text-xs text-gray-600 mb-1">署名:</label>
          <input v-model="chatConfig.signature" type="text" class="w-full border rounded p-2 text-sm bg-gray-50" />
        </div>

        <div class="mb-4">
          <label class="block text-xs text-gray-600 mb-1">称号:</label>
          <input v-model="chatConfig.title" type="text" class="w-full border rounded p-2 text-sm bg-gray-50" />
        </div>

        <div class="mb-4">
          <label class="block text-xs text-gray-600 mb-1">工坊印记:</label>
          <input v-model="chatConfig.techBrand" type="text" class="w-full border rounded p-2 text-sm bg-gray-50" />
        </div>
      </div>

      <!-- 颜色配置区 -->
      <div class="mb-6">
        <h2 class="text-sm font-bold mb-3">元素配色</h2>
        
        <div class="grid grid-cols-3 gap-2 mb-2">
          <div class="text-center py-2 bg-blue-600 text-white text-xs rounded cursor-pointer" @click="setThemeColor('#2563eb')">苍蓝</div>
          <div class="text-center py-2 bg-green-600 text-white text-xs rounded cursor-pointer" @click="setThemeColor('#16a34a')">翠绿</div>
          <div class="text-center py-2 bg-purple-600 text-white text-xs rounded cursor-pointer" @click="setThemeColor('#9333ea')">紫晶</div>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-2">
          <div class="text-center py-2 bg-red-600 text-white text-xs rounded cursor-pointer" @click="setThemeColor('#dc2626')">赤焰</div>
          <div class="text-center py-2 bg-gray-700 text-white text-xs rounded cursor-pointer" @click="setThemeColor('#374151')">暗影</div>
          <div class="text-center py-2 bg-yellow-500 text-white text-xs rounded cursor-pointer" @click="setThemeColor('#eab308')">辉金</div>
        </div>
      </div>
      
      <!-- 测试功能区 -->
      <div class="mb-6">
        <h2 class="text-sm font-bold mb-3">试炼功能</h2>
        <button @click="startTestConversation" class="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded text-sm mb-2">试炼对话</button>
        <button @click="showApiConfig" class="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded text-sm">法术配置</button>
      </div>

      <!-- 创建按钮 -->
      <div class="mt-auto pt-6">
        <button @click="saveConfig" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">铭刻配置</button>
      </div>

      <!-- 分享&发布 -->
      <div class="mt-6">
        <button @click="publishDialogVisible = true" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">召唤符石</button>
      </div>
    </div>
    
    <!-- 右侧对话区域 -->
    <div class="flex-1 bg-gray-100 p-6 h-screen flex flex-col items-center justify-center">
      <div class="flex justify-between items-center mb-6 w-full max-w-[375px]">
        <h2 class="text-xl font-semibold">预览视界</h2>
        <div class="flex gap-2">
          <button @click="resetConversation" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm">重置冒险</button>
          <button @click="exportConfig" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">导出铭文</button>
        </div>
      </div>
      
      <!-- 聊天窗口 -->
      <div class="window-wrapper flex flex-col bg-white shadow overflow-hidden h-[667px] w-[375px]">
        <!-- 聊天头部 -->
        <div class="h-12 flex items-center justify-between px-4" :style="`background-color: ${chatConfig.themeColor || '#4CAF50'}`">
          <div class="flex items-center">
            <i class="fas fa-robot text-white mr-2"></i>
            <span class="text-white text-sm">{{ chatConfig.title }}</span>
          </div>
          <button class="text-white hover:opacity-80 cursor-pointer">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- 聊天消息区域 -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div v-for="(message, index) in messages" :key="index" class="mb-4">
            <!-- AI消息 -->
            <div v-if="message.type === 'ai'" class="overflow-hidden">
              <div class="text-sm text-black p-3 bg-white rounded shadow-sm inline-block max-w-[280px] float-left markdown-content" v-html="renderMarkdown(message.content)"></div>
              <div class="clear-both"></div>
              <div v-if="chatConfig.signature" class="text-[11px] text-gray-400 mt-1 ml-1">{{ chatConfig.signature }}</div>
            </div>
            
            <!-- 用户消息 -->
            <div v-else class="overflow-hidden text-right">
              <div class="text-sm text-white p-3 rounded inline-block max-w-[280px] float-right" 
                   :style="`background-color: ${chatConfig.themeColor || '#4CAF50'}`">
                {{ message.content }}
              </div>
              <div class="clear-both"></div>
            </div>
          </div>
          
          <!-- 加载中指示器 -->
          <div v-if="isTyping && (!messages.length || messages[messages.length-1].type !== 'ai' || messages[messages.length-1].content === '')" class="mb-4">
            <div class="text-sm p-3 bg-white rounded shadow-sm inline-block max-w-[280px]">
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="border-t bg-white">
          <div class="relative">
            <textarea
              v-model="newMessage"
              @keydown="handleKeydown"
              placeholder="向冒险者公会提问..."
              class="w-[calc(100%-50px)] text-sm border-none px-4 py-3 focus:outline-none min-h-[50px] max-h-[150px] resize-none"
              rows="1"
              @input="adjustTextareaHeight"
              ref="textareaDialogue"
            ></textarea>
            <!-- 暂停按钮 (isTyping时显示) -->
            <button
              v-if="isTyping"
              @click="stopTyping"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 rounded-full p-2 w-10 h-10 flex items-center justify-center"
              :style="`background-color: ${chatConfig.themeColor || '#4CAF50'}`"
            >
              <i class="fas fa-pause text-white text-sm"></i>
            </button>
            <!-- 发送按钮 (非isTyping时显示) -->
            <button
              v-else
              @click="sendMessage"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 rounded-full p-2 w-10 h-10 flex items-center justify-center"
              :style="`background-color: ${chatConfig.themeColor || '#4CAF50'}`"
            >
              <i class="fas fa-paper-plane text-white text-sm"></i>
            </button>
          </div>
          <div class="px-3 py-2 text-center text-[10px] text-gray-400 border-t">
            {{ chatConfig.techBrand }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 发布弹窗 -->
  <el-dialog
    v-model="publishDialogVisible"
    title="召唤符石"
    width="550"
    class="pixel-dialog"
  >
  <div class="acquire">
    <h1 class="acquire-title">第一章：获取符石</h1>
    <p class="acquire-text">此符石适用于 PC 端页面，请将符石铭刻到需要使用对话的每个网页中</p>
    <div class="acquire-code mt-2 mb-2" v-html="rawHtml"></div>
  </div>
  <div @click="copyCode" class="w-[70px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm text-center code-copy">复制</div>
  <div class="acquire mt-5">
    <h1 class="acquire-title">第二章：符石镶嵌</h1>
    <p>1、请将符石添加到网页的 &lt;head&gt; 标签内</p>
    <p>2、切记勿自行修改符石铭文</p>
  </div>
  </el-dialog>
  
  <!-- API配置弹窗 -->
  <el-dialog
    v-model="apiDialogVisible"
    title="DeepSeek 法术配置"
    width="500px"
    destroy-on-close
    class="pixel-dialog"
  >
    <el-form label-width="120px" label-position="left">
      <el-form-item label="法术密钥">
        <el-input
          v-model="apiConfig.apiKey"
          placeholder="请输入 DeepSeek 法术密钥"
          show-password
        />
        <div class="text-xs text-gray-500 mt-1">可在 DeepSeek 魔法塔获取法术密钥</div>
      </el-form-item>

      <el-form-item label="法术模型">
        <el-select v-model="apiConfig.model" class="w-full">
          <el-option label="DeepSeek Chat" value="deepseek-chat" />
          <el-option label="DeepSeek Chat Light" value="deepseek-chat-light" />
          <el-option label="DeepSeek Coder" value="deepseek-coder" />
        </el-select>
      </el-form-item>

      <el-form-item label="火焰温度">
        <el-slider v-model="apiConfig.temperature" :min="0" :max="1" :step="0.1" class="w-full"/>
        <div class="text-xs text-gray-500 mt-1">低温使回答更确定，高温使回答更富有变化</div>
      </el-form-item>

      <el-form-item label="最大卷轴长度">
        <el-slider v-model="apiConfig.maxTokens" :min="100" :max="4000" :step="100" class="w-full" />
        <div class="text-xs text-gray-500 mt-1">控制回复的最大长度，卷轴越长消耗的法力越多</div>
      </el-form-item>

      <el-form-item label="智慧广度">
        <el-slider v-model="apiConfig.topP" :min="0" :max="1" :step="0.1" class="w-full" />
        <div class="text-xs text-gray-500 mt-1">控制词汇的多样性，值越高越博学</div>
      </el-form-item>

      <el-form-item label="逐字显现">
        <el-switch v-model="apiConfig.stream" />
        <div class="text-xs text-gray-500 mt-1">开启后回答将如魔法卷轴般逐字展开</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="apiDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveApiConfig">铭刻</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style>
/* 全局样式，不受scoped限制 */
button,
[type="button"],
[type="reset"],
[type="submit"],
.cursor-pointer,
[class*="hover"],
a,
.text-center.py-2,
input[type="radio"],
input[type="checkbox"],
select,
.clickable {
  cursor: pointer;
}
</style>

<style lang="scss" scoped>
/* —— 精致奇幻像素游戏风格配色 —— */
$neon-cyan: #7dd8c7;
$neon-cyan-light: #c9fff2;
$neon-magenta: #d8a657;
$neon-magenta-light: #ffe0a0;
$neon-purple: #6d7fb6;
$neon-purple-dark: #37446f;
$pixel-bg-dark: #07111f;
$pixel-bg: #101c2e;
$pixel-dialog-bg: rgba(13, 22, 36, 0.96);
$pixel-text: #f7ead0;
$pixel-text-muted: #b6a989;
$pixel-border: #31415b;

/* ===== 页面背景 ===== */
.flex.min-h-screen {
  color: $pixel-text;
  background:
    radial-gradient(ellipse at 20% 80%, rgba($neon-magenta, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba($neon-cyan, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($neon-purple, 0.08) 0%, transparent 70%),
    linear-gradient(180deg, #0a0a12 0%, #12121f 50%, #0a0a12 100%);
}

/* ===== 左侧配置面板 ===== */
.bg-white.border-r {
  background: $pixel-dialog-bg;
  backdrop-filter: blur(20px);
  border-right: 2px solid $pixel-border !important;
  box-shadow: 4px 0 30px rgba(0, 0, 0, 0.4);
}

.bg-white.border-r h1,
.bg-white.border-r h2 {
  color: $pixel-text;
}

.bg-white.border-r h1 {
  font-family: myFirstFont;
  text-shadow: 0 0 10px $neon-cyan;
}

/* 返回按钮 */
.p-2.rounded-full {
  border: 2px solid rgba($neon-cyan, 0.3);
  color: $pixel-text-muted;
  background: rgba($neon-cyan, 0.08);
  transition: all 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.2);
    border-color: $neon-cyan;
    color: $neon-cyan-light;
    box-shadow: 0 0 10px rgba($neon-cyan, 0.2);
  }
}

/* 文字配置标签 */
.text-xs.text-gray-600 {
  color: $pixel-text-muted;
}

/* 文字配置输入框 */
.bg-white.border-r input[type="text"],
.bg-white.border-r textarea {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba($neon-cyan, 0.3) !important;
  color: $pixel-text;
  outline: none;
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.3);
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );

  &:focus {
    border-color: $neon-cyan !important;
    box-shadow:
      inset 2px 2px 0 rgba(0, 0, 0, 0.3),
      0 0 15px rgba($neon-cyan, 0.3);
  }
}

/* 颜色预设按钮 */
.bg-blue-600, .bg-green-600, .bg-purple-600,
.bg-red-600, .bg-gray-700, .bg-yellow-500 {
  border: 2px solid $pixel-border;
  font-weight: 600;
  transition: all 0.1s ease;
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
    filter: brightness(1.1);
  }

  &:active {
    transform: translate(1px, 2px);
    filter: brightness(0.9);
  }
}

/* 测试按钮 */
button.bg-gray-100 {
  background: rgba($neon-cyan, 0.1);
  border: 2px solid rgba($neon-cyan, 0.3);
  color: $pixel-text;
  font-weight: 600;
  backdrop-filter: blur(10px);
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );
  transition: all 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.2);
    border-color: $neon-cyan;
    box-shadow: 0 0 15px rgba($neon-cyan, 0.3);
    transform: translateY(-2px);
  }
}

/* 保存 / 一键嵌入 按钮 */
button.bg-blue-600 {
  background: $neon-purple-dark;
  border: 2px solid $neon-purple;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 0 10px $neon-purple;
  box-shadow:
    0 0 10px rgba($neon-purple, 0.5),
    0 0 20px rgba($neon-purple, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
  clip-path: polygon(
    0 4px, 4px 4px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
  );
  transition: all 0.15s ease;

  &:hover {
    background: #47537b;
    box-shadow:
      0 0 15px rgba($neon-purple, 0.7),
      0 0 30px rgba($neon-purple, 0.5),
      0 5px 20px rgba($neon-purple, 0.4);
    transform: translateY(-2px);
  }

  &:active {
    transform: translate(2px, 3px);
    filter: brightness(0.9);
  }
}

/* ===== 右侧预览区 ===== */
.bg-gray-100.flex-1 {
  background:
    radial-gradient(ellipse at 70% 30%, rgba($neon-cyan, 0.08) 0%, transparent 60%),
    rgba($pixel-bg-dark, 0.5);
}

.bg-gray-100.flex-1 h2 {
  color: $pixel-text;
  text-shadow: 0 0 8px rgba($neon-cyan, 0.3);
}

/* 重置对话按钮 */
button.bg-gray-200 {
  background: rgba($neon-cyan, 0.1);
  border: 2px solid rgba($neon-cyan, 0.3);
  color: $pixel-text;
  font-weight: 600;
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );
  transition: all 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.2);
    border-color: $neon-cyan;
    box-shadow: 0 0 15px rgba($neon-cyan, 0.3);
  }
}

/* "导出配置"、"复制代码" 按钮 */
.px-4.py-2.bg-blue-600 {
  background: $neon-purple-dark;
  border: 2px solid $neon-purple;
  font-weight: 600;
  text-shadow: 0 0 10px $neon-purple;
  box-shadow:
    0 0 10px rgba($neon-purple, 0.5),
    0 0 20px rgba($neon-purple, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );
  transition: all 0.15s ease;

  &:hover {
    background: #47537b;
    box-shadow:
      0 0 15px rgba($neon-purple, 0.7),
      0 0 30px rgba($neon-purple, 0.5);
    transform: translateY(-2px);
  }
}

/* ===== 聊天窗口 ===== */
.window-wrapper {
  background: $pixel-dialog-bg;
  border: 2px solid $pixel-border;
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 30px rgba($neon-cyan, 0.2),
    0 0 60px rgba($neon-magenta, 0.15),
    0 25px 50px rgba(0, 0, 0, 0.5);
  clip-path: polygon(
    0 8px, 8px 8px, 8px 0,
    calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px,
    100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%,
    8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px)
  );
}

/* 聊天消息区背景 */
.window-wrapper .bg-gray-50 {
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba($neon-cyan, 0.015) 2px,
      rgba($neon-cyan, 0.015) 4px
    ),
    rgba($pixel-bg, 0.6);
}

/* AI 消息气泡 */
.window-wrapper .bg-white.rounded.shadow-sm {
  background: linear-gradient(180deg,
    rgba($neon-cyan, 0.15) 0%,
    rgba($neon-cyan, 0.08) 100%);
  color: $pixel-text;
  border: 1px solid rgba($neon-cyan, 0.25);
  box-shadow:
    0 0 10px rgba($neon-cyan, 0.1),
    inset 1px 1px 0 rgba(255, 255, 255, 0.03);
}

/* AI 消息签名 */
.text-gray-400.mt-1 {
  color: $pixel-text-muted;
}

/* 加载动画圆点 */
.window-wrapper .bg-gray-400.rounded-full {
  background: $neon-cyan;
  box-shadow: 0 0 8px $neon-cyan;
}

/* 输入区域 */
.window-wrapper .border-t.bg-white {
  background: rgba($pixel-bg, 0.9);
  border-top: 2px solid rgba($neon-cyan, 0.15);
}

/* 输入框 */
.window-wrapper textarea {
  background: transparent;
  color: $pixel-text;

  &::placeholder {
    color: $pixel-text-muted;
  }
}

/* 底部品牌文字 */
.window-wrapper .text-\[10px\].text-gray-400 {
  color: $pixel-text-muted;
  border-top-color: rgba($neon-cyan, 0.12);
}

/*
 * ===== 弹窗全局样式 =====
 * 通过 .pixel-dialog 钩子限定范围，只影响 ChatWidget 的弹窗。
 * 必须用 :global() —— Element Plus 将弹窗 Teleport 到 <body>。
 */
:global(.pixel-dialog) {
  background: $pixel-dialog-bg !important;
  border: 2px solid $pixel-border;
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 30px rgba($neon-cyan, 0.3),
    0 0 60px rgba($neon-magenta, 0.2),
    0 25px 50px rgba(0, 0, 0, 0.5);
  clip-path: polygon(
    0 8px, 8px 8px, 8px 0,
    calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px,
    100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%,
    8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px)
  );
}

:global(.pixel-dialog .el-dialog__title) {
  font-family: myFirstFont;
  color: $pixel-text !important;
  text-shadow: 0 0 10px $neon-cyan;
}

:global(.pixel-dialog .el-dialog__body) {
  color: $pixel-text;
}

:global(.pixel-dialog .el-form-item__label) {
  color: $pixel-text-muted;
}

:global(.pixel-dialog .el-input__wrapper) {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba($neon-cyan, 0.3);
  color: $pixel-text;
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.3);
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );

  &:hover {
    border-color: $neon-cyan;
  }
}

:global(.pixel-dialog .el-input__inner) {
  color: $pixel-text;
}

:global(.pixel-dialog .el-button) {
  font-weight: 600;
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );
  transition: all 0.15s ease;
}

:global(.pixel-dialog .el-button--primary) {
  background: $neon-purple-dark;
  border-color: $neon-purple;
  text-shadow: 0 0 10px $neon-purple;
  box-shadow:
    0 0 10px rgba($neon-purple, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);

  &:hover {
    background: #47537b;
    box-shadow:
      0 0 15px rgba($neon-purple, 0.7),
      0 0 30px rgba($neon-purple, 0.4);
  }
}

:global(.pixel-dialog .el-slider__bar) {
  background: $neon-cyan;
}

:global(.pixel-dialog .el-slider__button) {
  border-color: $neon-cyan;
}

:global(.pixel-dialog .el-switch.is-checked .el-switch__core) {
  background: $neon-cyan;
  border-color: $neon-cyan;
}

:global(.pixel-dialog .el-form-item .text-xs) {
  color: $pixel-text-muted;
}

:global(.pixel-dialog .el-select .el-input__wrapper) {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba($neon-cyan, 0.3);
  color: $pixel-text;
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );

  &:hover {
    border-color: $neon-cyan;
  }
}

/* select 下拉面板（也 Teleport 到 body，用 el-popper 的 class 限定） */
:global(.el-select-dropdown) {
  background: $pixel-dialog-bg !important;
  border: 2px solid $pixel-border !important;
  backdrop-filter: blur(20px);
  box-shadow: 0 0 20px rgba($neon-cyan, 0.2);
}

:global(.el-select-dropdown__item) {
  color: $pixel-text !important;

  &:hover {
    background: rgba($neon-cyan, 0.15) !important;
  }
}

:global(.el-select-dropdown__item.is-selected) {
  color: $neon-cyan-light !important;
  font-weight: 600;
  background: rgba($neon-cyan, 0.2) !important;
}

:global(.el-select-dropdown.is-light) {
  background: $pixel-dialog-bg !important;
  box-shadow: 0 0 20px rgba($neon-cyan, 0.2);
}

:global(.el-popper.is-light .el-select-dropdown) {
  background: $pixel-dialog-bg !important;
}

:global(.el-popper.is-light .el-select-dropdown__item) {
  color: $pixel-text !important;
}

:global(.el-popper.is-light .el-select-dropdown__item:hover) {
  background: rgba($neon-cyan, 0.15) !important;
}

:global(.el-popper.is-light .el-select-dropdown__item.is-selected) {
  color: $neon-cyan-light !important;
  background: rgba($neon-cyan, 0.2) !important;
}

:global(.el-select__popper) {
  background: $pixel-dialog-bg !important;
}

:global(.el-select__popper .el-select-dropdown__item) {
  color: $pixel-text !important;
}

:global(.el-select__popper .el-select-dropdown__item:hover) {
  background: rgba($neon-cyan, 0.15) !important;
}

:global(.el-select__popper .el-select-dropdown__item.is-selected) {
  color: $neon-cyan-light !important;
  background: rgba($neon-cyan, 0.2) !important;
}

:global(.el-select-dropdown__item) {
  background-color: transparent;
}

:global(.el-select-dropdown__item:hover) {
  background-color: rgba($neon-cyan, 0.15) !important;
}

:global(.pixel-dialog .el-slider__rail) {
  background: rgba($neon-cyan, 0.15);
}

:global(.pixel-dialog .el-switch .el-switch__core) {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba($pixel-text-muted, 0.3);
}

:global(.pixel-dialog .el-button:not(.el-button--primary)) {
  color: $pixel-text-muted;
  background: transparent;
  border: 2px solid rgba($pixel-text-muted, 0.3);

  &:hover {
    color: $pixel-text;
    border-color: rgba($neon-cyan, 0.5);
    background: rgba($neon-cyan, 0.1);
  }
}

/* ===== 发布弹窗（组件内元素，scoped 可直接命中） ===== */
.acquire {
  color: $pixel-text;
}

.acquire-title {
  font-weight: 600;
  color: $pixel-text;
  text-shadow: 0 0 8px $neon-cyan;
}

.acquire-text {
  color: $pixel-text-muted;
}

.acquire-code :global(pre) {
  border: 2px solid rgba($neon-cyan, 0.3);
  background: rgba(0, 0, 0, 0.4);
  color: $neon-cyan-light;
  clip-path: polygon(
    0 4px, 4px 4px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
  );
}

.code-copy {
  font-weight: 600;
  transition: all 0.15s ease;
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );

  &:active {
    transform: translate(1px, 2px);
    filter: brightness(0.9);
  }
}

.acquire p {
  color: $pixel-text-muted;
}

/* ===== Markdown 内容 ===== */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  color: $pixel-text;
}

.markdown-content :deep(p) {
  margin: 0.5em 0;
  color: $pixel-text;
}

.markdown-content :deep(ul), .markdown-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(pre) {
  padding: 10px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba($neon-cyan, 0.2);
}

.markdown-content :deep(code) {
  padding: 15px;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  word-break: normal;
  color: $neon-cyan-light;
  background: rgba(0, 0, 0, 0.3);
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid rgba($neon-cyan, 0.4);
  padding-left: 0.75em;
  margin: 0.5em 0;
  color: $pixel-text-muted;
}

.markdown-content :deep(a) {
  color: $neon-cyan;
  text-decoration: underline;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 0.5em 0;
  width: 100%;
}

.markdown-content :deep(th), .markdown-content :deep(td) {
  border: 1px solid $pixel-border;
  padding: 0.25em 0.5em;
  text-align: left;
}

.markdown-content :deep(th) {
  background: rgba($neon-cyan, 0.1);
  color: $pixel-text;
}

.markdown-content :deep(td) {
  color: $pixel-text-muted;
}

/* ===== 滚动条 ===== */
::-webkit-scrollbar {
  width: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba($neon-cyan, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba($neon-cyan, 0.4);
}

</style> 