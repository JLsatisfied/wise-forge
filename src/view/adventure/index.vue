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
    <!-- 环境粒子背景 -->
    <div class="ambient-particles" aria-hidden="true">
      <span
        v-for="n in 12"
        :key="n"
        class="particle"
        :style="{
          '--x': Math.random() * 100 + '%',
          '--y': Math.random() * 100 + '%',
          '--d': 8 + Math.random() * 20 + 's',
          '--s': 0.5 + Math.random() * 1.5,
          '--op': 0.05 + Math.random() * 0.12
        }"
      ></span>
    </div>

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
        <div class="topbar-right" v-if="isPlaying">
          <span class="topbar-dm-badge"> <i class="fas fa-crown"></i> DM 命运织者 </span>
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
@use '@/styles/pixel-theme' as *;

.adventure-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  background:
    radial-gradient(ellipse at 20% 80%, rgba($neon-magenta, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba($neon-cyan, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba($neon-purple, 0.08) 0%, transparent 70%),
    linear-gradient(180deg, #0a0a12 0%, #12121f 50%, #0a0a12 100%);
  color: $pixel-text;
  overflow: hidden;
  position: relative;
}

/* ==================== 环境粒子 ==================== */
.ambient-particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: 2px;
  height: 2px;
  background: $neon-cyan;
  border-radius: 50%;
  opacity: var(--op);
  filter: blur(1px);
  animation: particle-drift var(--d) linear infinite;
  animation-delay: calc(var(--d) * -0.5);
  transform: scale(var(--s));
}

.particle:nth-child(odd) {
  background: $neon-magenta;
}

.particle:nth-child(3n) {
  background: $neon-purple;
  width: 3px;
  height: 3px;
}

@keyframes particle-drift {
  0% {
    transform: translateY(0) translateX(0) scale(var(--s));
    opacity: 0;
  }

  10% {
    opacity: var(--op);
  }

  90% {
    opacity: var(--op);
  }

  100% {
    transform: translateY(calc(-100vh - 100px)) translateX(60px) scale(var(--s));
    opacity: 0;
  }
}

.adventure-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 顶部导航 */
.adventure-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  background: linear-gradient(180deg, rgba(10, 20, 40, 0.95), rgba(13, 22, 36, 0.9));
  border-bottom: 1px solid rgba($neon-cyan, 0.08);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 2;
}

.topbar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba($neon-cyan, 0.06);
  border: 1px solid rgba($neon-cyan, 0.2);
  color: rgba($pixel-text-muted, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
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
  flex-shrink: 0;

  i {
    font-size: 12px;
  }

  &:hover {
    background: rgba($neon-cyan, 0.14);
    border-color: rgba($neon-cyan, 0.35);
    color: $neon-cyan-light;
    box-shadow: 0 0 12px rgba($neon-cyan, 0.1);
  }
}

.topbar-center {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: center;
  min-width: 0;
}

.topbar-scene-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($neon-cyan, 0.08);
  border: 1px solid rgba($neon-cyan, 0.2);
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba($neon-cyan, 0.1);

  i {
    font-size: 16px;
    color: $neon-magenta;
    filter: drop-shadow(0 0 4px rgba($neon-magenta, 0.4));
  }

  &.is-idle i {
    color: $neon-cyan;
    filter: drop-shadow(0 0 4px rgba($neon-cyan, 0.4));
    animation: compass-idle 3s ease-in-out infinite;
  }
}

@keyframes compass-idle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(5deg);
  }
  75% {
    transform: rotate(-5deg);
  }
}

.topbar-scene-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.topbar-scene-name {
  font-family: myFirstFont, 'VT323', monospace;
  font-size: 18px;
  color: #fff;
  letter-spacing: 4px;
  text-shadow: 0 0 10px rgba($neon-cyan, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-scene-sub {
  font-size: 11px;
  color: rgba($pixel-text-muted, 0.4);
  letter-spacing: 3px;
}

.topbar-right {
  flex-shrink: 0;
}

.topbar-dm-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  font-size: 12px;
  color: rgba($neon-cyan, 0.6);
  border: 1px solid rgba($neon-cyan, 0.1);
  letter-spacing: 1px;

  i {
    font-size: 10px;
    color: $neon-magenta;
  }
}

/* 聊天区域 */
.adventure-chat {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  min-height: 0;
  position: relative;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba($neon-cyan, 0.1);
    border-radius: 0;

    &:hover {
      background: rgba($neon-cyan, 0.25);
    }
  }
}

.chat-inner {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 8px;
  position: relative;
  z-index: 1;
}

.message-wrapper {
  animation: msg-enter 0.3s ease;
}

@keyframes msg-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 输入区域 */
.adventure-bottom {
  padding: 0 24px;
  border-top: 1px solid rgba($neon-cyan, 0.06);
  background: linear-gradient(180deg, rgba(10, 20, 40, 0.8), rgba(10, 20, 40, 0.95));
  position: relative;
  z-index: 2;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 0;
  justify-content: center;
}

.typing-dot {
  width: 10px;
  height: 10px;
  background: $neon-cyan;
  border-radius: 0;
  animation: typing-bounce 1.4s ease-in-out infinite;
  box-shadow: 0 0 8px rgba($neon-cyan, 0.3);
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

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }

  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: $pixel-text-muted;

  i {
    font-size: 56px;
    color: rgba($neon-cyan, 0.1);
    margin-bottom: 20px;
    display: block;
    animation: empty-float 3s ease-in-out infinite;
  }

  @keyframes empty-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }

  p {
    font-size: 14px;
    margin: 0;
    letter-spacing: 2px;
    color: rgba($pixel-text-muted, 0.4);
  }
}

/* ===== 选项面板 ===== */
.choices-panel {
  padding: 18px 0 12px 56px;
  animation: choices-enter 0.4s ease;
}

@keyframes choices-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.choices-label {
  font-size: 12px;
  color: $neon-magenta;
  margin-bottom: 12px;
  font-weight: 600;
  text-shadow: 0 0 8px rgba($neon-magenta, 0.3);
  display: flex;
  align-items: center;
  gap: 6px;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba($neon-magenta, 0.15), transparent);
    margin-left: 4px;
  }
}

.choices-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  background: rgba($neon-purple, 0.06);
  border: 1px solid rgba($neon-purple, 0.2);
  border-left: 2px solid rgba($neon-purple, 0.3);
  color: $pixel-text;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
  position: relative;
  overflow: hidden;
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

  /* hover 光效 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba($neon-purple, 0.06), transparent);
    transition: left 0.4s ease;
  }

  &:hover {
    background: rgba($neon-purple, 0.14);
    border-color: rgba($neon-purple, 0.45);
    border-left-color: $neon-purple;
    transform: translateX(6px);
    box-shadow:
      0 4px 20px rgba($neon-purple, 0.2),
      0 0 30px rgba($neon-purple, 0.08);

    &::before {
      left: 100%;
    }

    .choice-number {
      background: rgba($neon-purple, 0.5);
      border-color: $neon-magenta;
      color: #fff;
      box-shadow: 0 0 10px rgba($neon-magenta, 0.3);
    }
  }

  &:active {
    transform: translateX(8px) translateY(1px);
    filter: brightness(0.9);
    transition: all 0.05s ease;
  }
}

.choice-number {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($neon-purple, 0.2);
  border: 1px solid rgba($neon-purple, 0.35);
  font-size: 14px;
  font-weight: 700;
  color: $neon-cyan-light;
  font-family: 'VT323', monospace;
  transition: all 0.18s ease;
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

.choice-text {
  flex: 1;
  line-height: 1.5;
  font-size: 14px;
}

/* ===== 回答中行 ===== */
.answering-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 14px 0;
}

.stop-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: rgba(#c97b7b, 0.08);
  border: 1px solid rgba(#c97b7b, 0.3);
  color: rgba(#c97b7b, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 1px;
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

  i {
    font-size: 10px;
  }

  &:hover {
    background: rgba(#c97b7b, 0.2);
    border-color: #c97b7b;
    color: #fff;
    box-shadow: 0 0 16px rgba(#c97b7b, 0.2);
  }

  &:active {
    transform: translate(1px, 2px);
    filter: brightness(0.9);
  }
}

/* ===== 动作特效 ===== */
.effect-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: effect-flash 0.8s ease forwards;
}

@keyframes effect-flash {
  0% {
    background: rgba(255, 255, 255, 0.04);
  }

  30% {
    background: transparent;
  }

  100% {
    background: transparent;
  }
}

.effect-sprite {
  position: relative;
  width: 200px;
  height: 200px;
}

/* 攻击斩击 */
.slash {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slash-line {
  position: absolute;
  height: 3px;
  background: $neon-cyan;
  box-shadow:
    0 0 12px $neon-cyan,
    0 0 25px $neon-cyan;
  border-radius: 2px;
  opacity: 0;

  &.l1 {
    width: 120px;
    transform: rotate(-35deg);
    animation: slash-sweep 0.4s ease-out 0.05s forwards;
  }

  &.l2 {
    width: 90px;
    transform: rotate(-20deg);
    background: $neon-cyan-light;
    animation: slash-sweep 0.35s ease-out 0.1s forwards;
  }

  &.l3 {
    width: 60px;
    transform: rotate(-50deg);
    background: #fff;
    animation: slash-sweep 0.3s ease-out 0.15s forwards;
  }
}

.slash-spark {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #fff;
  box-shadow:
    0 0 10px $neon-cyan,
    0 0 20px $neon-cyan,
    0 0 40px $neon-magenta;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  animation: spark-burst 0.5s ease-out 0.2s forwards;
  opacity: 0;
}

@keyframes slash-sweep {
  0% {
    opacity: 0;
    transform: rotate(-35deg) scaleX(0);
  }

  30% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: rotate(-35deg) scaleX(1.3) translateX(30px);
  }
}

@keyframes spark-burst {
  0% {
    opacity: 0;
    transform: scale(0);
  }

  50% {
    opacity: 1;
    transform: scale(2);
  }

  100% {
    opacity: 0;
    transform: scale(3);
  }
}

/* 调查波纹 */
.search {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-ring {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 2px solid $neon-cyan;
  border-radius: 50%;
  opacity: 0;
  animation: ring-pulse 0.8s ease-out forwards;

  &.r2 {
    animation-delay: 0.1s;
  }

  &.r3 {
    animation-delay: 0.2s;
    width: 30px;
    height: 30px;
  }
}

.search-mag {
  position: absolute;
  font-size: 32px;
  animation: mag-bounce 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes ring-pulse {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }

  40% {
    opacity: 0.6;
  }

  100% {
    opacity: 0;
    transform: scale(3);
  }
}

@keyframes mag-bounce {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-30deg);
  }

  50% {
    opacity: 1;
    transform: scale(1.15) rotate(5deg);
  }

  100% {
    opacity: 0;
    transform: scale(1) rotate(0deg) translateY(-40px);
  }
}
</style>
