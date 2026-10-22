<script setup lang="ts">
import { EditPen, CopyDocument } from '@element-plus/icons-vue'
import { allInstall } from '@/utils/types/ai'

defineOptions({ name: 'ChatMessageItem' })

defineProps<{
  item: allInstall
  index: number
  nickImg: string
  aiAvatarUrl: string
  hoveredIndex: number | null
  isAnswering: boolean
  speakingIndex: number | null
}>()

const emit = defineEmits<{
  'set-hovered': [index: number | null]
  'edit-chat': [index: number, text: string]
  'copy-document': []
  speak: [index: number, html: string]
  'toggle-think': [item: allInstall]
}>()

const thinkStatus = (item: allInstall) => {
  if (item.thinkContent?.status == '1') return '思考中...'
  if (item.thinkContent?.status == '2') return '思考已停止'
  if (item.thinkContent?.status == '3') return '已思考完毕'
}
</script>

<template>
  <!-- 用户消息 -->
  <div
    class="flex justify-end"
    @mouseenter="emit('set-hovered', index)"
    @mouseleave="emit('set-hovered', null)"
  >
    <div class="order-2 max-w-[70%] min-w-0 relative">
      <div class="flex gap-2 flex-row-reverse min-w-0">
        <img
          :src="nickImg"
          class="w-10 h-10 object-cover pixel-avatar-sm shrink-0"
          alt="用户头像"
        />
        <div class="px-4 py-3 pixel-bubble-user text-word-wrap min-w-0">
          <p class="text-sm text-word">{{ item.userText }}</p>
          <div
            :id="'documentText' + index"
            style="position: absolute; top: -9999px; left: -9999px; z-index: -9999"
          >
            {{ item.userText }}
          </div>
        </div>
      </div>
      <div class="group-util" :class="{ show: hoveredIndex == index }">
        <el-tooltip class="box-item" effect="dark" content="编辑消息" placement="top">
          <el-icon class="edit" size="20" @click="emit('edit-chat', index, item.userText)"
            ><EditPen
          /></el-icon>
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="复制" placement="top">
          <el-icon
            class="copyDocument"
            size="20"
            @click="emit('copy-document')"
            :data-clipboard-target="'#documentText' + index"
            ><CopyDocument
          /></el-icon>
        </el-tooltip>
      </div>
    </div>
  </div>

  <!-- AI 消息 -->
  <div class="flex justify-start min-w-0 mt-3 mb-12">
    <div class="order-1 max-w-[100%] min-w-0">
      <div class="flex gap-2 min-w-0">
        <img
          :src="aiAvatarUrl"
          class="w-10 h-10 object-cover pixel-avatar-sm shrink-0"
          alt="ai头像"
        />
        <div class="px-4 py-3 pixel-bubble-ai max-w-[100%] min-w-0">
          <div v-if="item.thinkContent && item.thinkContent.isShow">
            <div
              @click="emit('toggle-think', item)"
              class="think pixel-think-toggle px-4 py-2 flex items-center gap-2 mr-2 cursor-pointer text-sm"
            >
              <i class="fas fa-lightbulb text-sm"></i>
              {{ thinkStatus(item) }}
              <i
                class="fas text-sm"
                :class="item.thinkContent.isOpen ? 'fa-angle-up' : 'fa-angle-down'"
              ></i>
            </div>
            <div class="think-txt px-3" v-show="item.thinkContent.isOpen">
              <div class="line"></div>
              <div
                class="text-sm leading-7 ai-txt pixel-think-body"
                v-html="item.thinkContent.thinkText"
              ></div>
            </div>
          </div>
          <div
            class="load"
            :class="item.thinkContent ? 'active' : ''"
            v-if="item.adminContent.isShow"
          >
            <div class="loading"></div>
            <p v-if="!item.thinkContent">回答中...</p>
          </div>
          <div class="text-sm leading-7 ai-txt" v-else v-html="item.adminContent.adminText"></div>
          <div
            v-if="!item.adminContent.isShow && item.adminContent.adminText"
            class="pixel-speech-row mt-3"
          >
            <button
              type="button"
              class="pixel-speech-btn flex items-center gap-1.5 cursor-pointer"
              :class="{ 'pixel-speech-btn--active': speakingIndex === index }"
              @click="emit('speak', index, item.adminContent.adminText)"
            >
              <i
                class="fas text-xs"
                :class="speakingIndex === index ? 'fa-volume-up' : 'fa-volume-high'"
              ></i>
              {{ speakingIndex === index ? '停止朗读' : '朗读' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

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

.text-word {
  white-space: pre-wrap;
}
</style>
