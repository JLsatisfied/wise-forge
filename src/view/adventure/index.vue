<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { BASE_URL } from '@/utils/http/config'
import { useStore } from '@/store/index'
import { userApi } from '@/api/user'
import AdventureHUD from './components/AdventureHUD.vue'
import AdventureMessage from './components/AdventureMessage.vue'
import AdventureInput from './components/AdventureInput.vue'
import SceneSelectDialog from './components/SceneSelectDialog.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAdventureState } from './composables/useAdventureState'
import scenes from './data/adventureScenes'

defineOptions({ name: 'AdventurePage' })

const router = useRouter()
const store = useStore()

const { state, isPlaying, playerName, resetState, addMessage, parseAll, rollD20, endGame } =
  useAdventureState()

const showSceneDialog = ref(true)
const isAnswering = ref(false)
const isStopText = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const ctrl = ref<AbortController | null>(null)
const choices = ref<string[]>([])
const loginNickname = ref('冒险者')
const actionEffect = ref<string | null>(null)
let effectTimer: ReturnType<typeof setTimeout> | null = null

const showEffect = (type: string) => {
  actionEffect.value = type
  if (effectTimer) clearTimeout(effectTimer)
  effectTimer = setTimeout(() => {
    actionEffect.value = null
  }, 800)
}

// DM 系统 prompt
const DM_SYSTEM_PROMPT = `你是一个像素奇幻世界的游戏主持人 (DM)，名叫「命运织者」。

【叙事规则】
- 用第二人称"你"叙述，营造沉浸感
- 每次回复先描述场景/结果（50-100字），再给出后续发展
- 使用丰富的感官描写（视觉、听觉、嗅觉）
- 每次回复末尾用 【选项】标记列出 2-4 个行动选项，每行一个，例如：
  【选项】
  1. 走进小镇
  2. 询问路人
  3. 观察四周

【数值追踪】
- 在每轮回复末尾用 【状态】HP:20/30 MP:10/15 Lv:2 金币:50 格式标记状态
- 物品变化用 【装备】获得 生锈的铁剑 或 【获得】金币×10
- 战斗用描述性语言，无需复杂计算
- 玩家升级时用 【升级】Lv.3 标记
- 玩家位置变化用 【地点】烬石镇 标记

【世界设定】
- 世界名为「艾瑟兰」，充满魔法、怪物和遗迹
- NPC 对话用「」引用
- 保持史诗奇幻风格，偶尔加入幽默`

const messages: { role: string; content: string }[] = []

// 选择场景开始冒险
const onSelectScene = (scene: (typeof scenes)[0], name: string) => {
  resetState(scene.id, name)
  showSceneDialog.value = false

  // 初始化消息上下文
  messages.length = 0
  messages.push({ role: 'system', content: DM_SYSTEM_PROMPT })

  // 添加开场消息
  addMessage({
    type: 'narration',
    content: `<p>命运的丝线开始交织，勇敢的 <strong>${name}</strong>，你的故事从此刻开始书写…</p>`
  })
  addMessage({ type: 'system', content: '命运织者正在编织你的世界观…' })

  // 调用 AI 生成开场叙事
  sendToAI(scene.initialPrompt, false)
}

// 用户选择选项（点击式交互）
const onChoice = (choice: string) => {
  if (isAnswering.value) return
  choices.value = []

  const roll = rollD20()
  const rollText = roll >= 10 ? '成功' : '失败'

  addMessage({
    type: 'player_action',
    content: choice,
    roll
  })

  const enhancedText = `[骰子: ${roll}/20 - ${rollText}] ${choice}`
  sendToAI(enhancedText, true)
}

// 快捷动作
const onAction = (action: string) => {
  if (isAnswering.value) return

  if (action === 'attack' || action === 'investigate') {
    showEffect(action)
  }

  const actionMap: Record<string, string> = {
    attack: '我要攻击附近的敌人！',
    talk: '我要和附近的人交谈。',
    investigate: '我要仔细调查周围的环境。',
    inventory: '我查看一下背包里的物品。',
    move: '我要前往下一个地点。'
  }
  onChoice(actionMap[action] || action)
}

// 调用 DeepSeek API
const sendToAI = (userInput: string, addUserMsg: boolean) => {
  if (addUserMsg) {
    messages.push({ role: 'user', content: userInput })
  } else {
    messages.push({ role: 'user', content: userInput })
  }

  isAnswering.value = true
  isStopText.value = true

  let aiContent = ''
  ctrl.value = new AbortController()

  fetchEventSource(BASE_URL + 'deepseekMoudle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: messages, moduleId: 'deepseek-v4-flash' }),
    signal: ctrl.value.signal,
    openWhenHidden: true,
    onmessage(ev) {
      try {
        const res = JSON.parse(ev.data)
        if (res.choices && res.choices[0].delta.content) {
          aiContent += res.choices[0].delta.content
          // isStopText.value = true
        }
        if (res.message) {
          aiContent = res.message
        }
      } catch {
        // 忽略解析错误
      }
    },
    onclose() {
      finishAIResponse(aiContent)
    },
    onerror() {
      finishAIResponse(aiContent || '冒险途中遇到了一些波折，请稍后再试。')
      return
    }
  })
}

const finishAIResponse = (content: string) => {
  isAnswering.value = false
  isStopText.value = false

  if (content) {
    messages.push({ role: 'assistant', content })

    // 解析选项
    const choiceMatch = content.match(/【选项】\n?([\s\S]*?)(?=\n【|$)/)
    if (choiceMatch) {
      const choiceLines = choiceMatch[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => /^\d+[\.\、]/.test(l))
      choices.value = choiceLines
    } else {
      choices.value = []
    }

    // 过滤掉状态标记行和选项，显示给用户
    const cleanContent = content
      .replace(/【选项】[\s\S]*?(\n【|$)/g, '$1')
      .replace(/【状态】.+?(\n|$)/g, '')
      .replace(/【装备】.+?(\n|$)/g, '')
      .replace(/【获得】.+?(\n|$)/g, '')
      .replace(/【地点】.+?(\n|$)/g, '')
      .replace(/【升级】.+?(\n|$)/g, '')
      .trim()

    addMessage({ type: 'narration', content: formatContent(cleanContent) })

    // 解析状态标记更新 HUD
    parseAll(content)
  } else {
    choices.value = []
  }

  nextTick(() => {
    scrollToBottom()
  })
}

// 简单格式化内容（换行转段落）
const formatContent = (text: string): string => {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// 停止生成
const onStop = () => {
  if (ctrl.value) {
    ctrl.value.abort()
  }
  isAnswering.value = false
  isStopText.value = false
}

// 离开冒险
const leaveAdventure = () => {
  if (ctrl.value) ctrl.value.abort()
  endGame()
  router.push('/intelligence')
}

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

onMounted(() => {
  if (!store.token) {
    router.push('/')
    return
  }
  userApi
    .getUserData()
    .then(res => {
      if (res.data.code == 0 && res.data.users?.nickname) {
        loginNickname.value = res.data.users.nickname
      }
    })
    .catch(() => {})
})

onUnmounted(() => {
  if (ctrl.value) ctrl.value.abort()
})
</script>

<template>
  <div class="adventure-page">
    <!-- 左侧 HUD -->
    <AdventureHUD
      :player="state.player"
      :player-name="playerName"
      :location="state.location"
      :inventory="state.inventory"
    />

    <!-- 动作特效 -->
    <div v-if="actionEffect" class="effect-overlay" :class="'effect--' + actionEffect">
      <div class="effect-sprite">
        <div v-if="actionEffect === 'attack'" class="slash">
          <span class="slash-line l1"></span>
          <span class="slash-line l2"></span>
          <span class="slash-line l3"></span>
          <span class="slash-spark"></span>
        </div>
        <div v-if="actionEffect === 'investigate'" class="search">
          <span class="search-ring"></span>
          <span class="search-ring r2"></span>
          <span class="search-ring r3"></span>
          <span class="search-mag">🔍</span>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="adventure-main">
      <!-- 顶部导航 -->
      <div class="adventure-topbar">
        <button class="topbar-btn" @click="leaveAdventure">
          <i class="fas fa-arrow-left"></i>
          <span>离开冒险</span>
        </button>
        <div class="topbar-center" v-if="isPlaying">
          <div class="topbar-scene-icon">
            <i class="fas fa-dragon"></i>
          </div>
          <div class="topbar-scene-info">
            <span class="topbar-scene-name">{{
              scenes.find(s => s.id === state.sceneId)?.name || '冒险模式'
            }}</span>
            <span class="topbar-scene-sub">世界「艾瑟兰」</span>
          </div>
        </div>
        <div class="topbar-center" v-else>
          <div class="topbar-scene-icon is-idle">
            <i class="fas fa-compass"></i>
          </div>
          <span class="topbar-scene-name">选择你的冒险</span>
        </div>
        <div class="topbar-right">
          <span class="topbar-dm-badge" v-if="isPlaying">
            <i class="fas fa-crown"></i> DM 命运织者
          </span>
          <ThemeToggle />
        </div>
      </div>

      <!-- 聊天/消息区域 -->
      <div class="adventure-chat" ref="chatContainer">
        <div class="chat-inner">
          <!-- 冒险消息列表 -->
          <div v-for="msg in state.history" :key="msg.id" class="message-wrapper">
            <AdventureMessage :message="msg" />
          </div>

          <!-- 选项按钮（AI 给出选择后显示） -->
          <div v-if="choices.length && !isAnswering" class="choices-panel">
            <div class="choices-label">▸ 你的选择</div>
            <div class="choices-list">
              <button
                v-for="(choice, i) in choices"
                :key="i"
                class="choice-btn"
                @click="onChoice(choice.replace(/^\d+[\.\、]\s*/, ''))"
              >
                <span class="choice-number">{{ i + 1 }}</span>
                <span class="choice-text">{{ choice.replace(/^\d+[\.\、]\s*/, '') }}</span>
              </button>
            </div>
          </div>

          <!-- AI 回答中指示器 + 停止按钮 -->
          <div v-if="isAnswering && isStopText" class="answering-row">
            <div class="typing-indicator">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
            <button class="stop-btn" @click="onStop"><i class="fas fa-stop"></i> 中断</button>
          </div>

          <!-- 空状态 -->
          <div v-if="!state.history.length && !showSceneDialog" class="empty-state">
            <i class="fas fa-scroll"></i>
            <p>选择一个冒险场景，开始你的传奇之旅</p>
          </div>
        </div>
      </div>

      <!-- 底部快捷动作 -->
      <div class="adventure-bottom" v-if="isPlaying && !isAnswering">
        <AdventureInput :is-answering="isAnswering" @action="onAction" />
      </div>
    </div>

    <!-- 场景选择弹窗 -->
    <SceneSelectDialog
      :visible="showSceneDialog"
      :scenes="scenes"
      :default-name="loginNickname"
      @update:visible="showSceneDialog = $event"
      @select="onSelectScene"
      @back="leaveAdventure"
    />
  </div>
</template>

<style lang="scss" scoped>
.adventure-page {
  min-height: 100vh;
  background: radial-gradient(circle at 82% 0%, var(--accent-softer), transparent 42%), var(--bg);
  color: var(--text);
}

.adventure-main {
  margin-left: 240px;
  height: 100vh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.adventure-topbar {
  flex-shrink: 0;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.topbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);

  i {
    font-size: 11px;
  }

  &:hover {
    background: var(--surface-3);
    border-color: var(--border-strong);
    color: var(--text);
  }
}

.topbar-center {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.topbar-scene-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 14px;

  &.is-idle {
    background: var(--surface-2);
    color: var(--text-3);
  }
}

.topbar-scene-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.topbar-scene-name {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-scene-sub {
  color: var(--text-3);
  font-size: 11px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.topbar-dm-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-3);
  font-size: 11px;
  white-space: nowrap;

  i {
    color: var(--warning);
    font-size: 10px;
  }
}

.adventure-chat {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
}

.chat-inner {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 8px;
}

.message-wrapper {
  animation: msg-enter 0.25s var(--ease) both;
}

@keyframes msg-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.adventure-bottom {
  flex-shrink: 0;
  padding: 0 20px 18px;
}

/* ---------- 选项 ---------- */
.choices-panel {
  margin-top: 4px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  animation: choices-enter 0.25s var(--ease) both;
}

@keyframes choices-enter {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.choices-label {
  margin-bottom: 10px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.choices-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);

  &:hover {
    background: var(--accent-softer);
    border-color: var(--accent-ring);
  }
}

.choice-number {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
}

.choice-text {
  line-height: 1.5;
}

/* ---------- 回答中 ---------- */
.answering-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
}

.typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-3);
  animation: typing-bounce 1.2s infinite ease-in-out;

  &:nth-child(2) {
    animation-delay: 0.15s;
  }

  &:nth-child(3) {
    animation-delay: 0.3s;
  }
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }

  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

.stop-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);

  &:hover {
    background: var(--danger-soft);
    border-color: var(--danger);
    color: var(--danger);
  }
}

/* ---------- 空状态 ---------- */
.empty-state {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-3);

  i {
    font-size: 34px;
    opacity: 0.55;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
}

/* ---------- 动作特效 ---------- */
.effect-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: radial-gradient(circle, var(--accent-soft), transparent 42%);
  animation: effect-flash 0.8s var(--ease) forwards;
}

.effect-sprite {
  position: relative;
  width: 140px;
  height: 140px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

@keyframes effect-flash {
  0% {
    opacity: 0;
  }

  20% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

.slash {
  position: absolute;
  inset: 0;
}

.slash-line {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 56px;
  border-radius: 3px;
  background: var(--accent);
  opacity: 0;
  animation: slash-sweep 0.55s ease-out forwards;

  &.l1 {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  &.l2 {
    transform: translate(-50%, -50%) rotate(-45deg);
    background: var(--info);
    animation-delay: 0.06s;
  }

  &.l3 {
    transform: translate(-50%, -50%) rotate(90deg);
    background: var(--warning);
    animation-delay: 0.12s;
  }
}

.slash-spark {
  position: absolute;
  inset: 36%;
  border-radius: 50%;
  background: var(--accent-soft);
  animation: spark-burst 0.6s ease-out forwards;
}

@keyframes slash-sweep {
  0% {
    opacity: 0;
    filter: blur(2px);
  }

  35% {
    opacity: 1;
    filter: blur(0);
  }

  100% {
    opacity: 0;
  }
}

@keyframes spark-burst {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }

  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}

.search {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.search-ring {
  position: absolute;
  width: 54px;
  height: 54px;
  border: 2px solid var(--accent);
  border-radius: 50%;
  opacity: 0;
  animation: ring-pulse 0.7s ease-out forwards;

  &.r2 {
    width: 70px;
    height: 70px;
    border-color: var(--info);
    animation-delay: 0.1s;
  }

  &.r3 {
    width: 86px;
    height: 86px;
    border-color: var(--warning);
    animation-delay: 0.2s;
  }
}

.search-mag {
  font-size: 28px;
  opacity: 0;
  animation: mag-bounce 0.7s ease-out forwards;
}

@keyframes ring-pulse {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }

  45% {
    opacity: 0.7;
  }

  100% {
    opacity: 0;
    transform: scale(1.25);
  }
}

@keyframes mag-bounce {
  0% {
    opacity: 0;
    transform: scale(0.4) translateY(6px);
  }

  50% {
    opacity: 1;
    transform: scale(1.08) translateY(-4px);
  }

  100% {
    opacity: 0;
    transform: scale(1) translateY(-14px);
  }
}

@media (width <= 900px) {
  .adventure-topbar {
    padding: 0 12px;
  }

  .topbar-btn span {
    display: none;
  }

  .adventure-chat {
    padding: 16px 12px;
  }

  .adventure-bottom {
    padding: 0 12px 14px;
  }

  .topbar-dm-badge {
    display: none;
  }
}
</style>
