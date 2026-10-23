<script setup lang="ts">
import { computed } from 'vue'
import { EditPen, CopyDocument } from '@element-plus/icons-vue'
import { allInstall, searchResultObject } from '@/utils/types/ai'
import type { BranchVersion } from '../useConversationBranches'

defineOptions({ name: 'ChatMessageItem' })

const props = defineProps<{
  item: allInstall
  index: number
  nickImg: string
  aiAvatarUrl: string
  hoveredIndex: number | null
  isAnswering: boolean
  /** 编辑态：只隐藏用户消息，保留下面的 AI 回答 */
  editing: boolean
  speakingIndex: number | null
  userVersion: BranchVersion
  assistantVersion: BranchVersion
}>()

const emit = defineEmits<{
  'set-hovered': [index: number | null]
  'edit-chat': [index: number, text: string]
  'copy-document': []
  speak: [index: number, html: string]
  'toggle-think': [item: allInstall]
  'switch-version': [role: 'user' | 'assistant', delta: number]
  'copy-answer': []
  regenerate: []
  'open-search-sources': [results: searchResultObject[], focusIndex?: number]
}>()

const thinkStatus = (item: allInstall) => {
  if (item.thinkContent?.status == '1') return '思考中...'
  if (item.thinkContent?.status == '2') return '思考已停止'
  if (item.thinkContent?.status == '3') return '已思考完毕'
}

// ===== 回答里的引用标签 =====
const CITATION_PATTERN = /\[(\d{1,2})\]|【(\d{1,2})】/g

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

const escapeHtml = (value?: string | null): string =>
  String(value ?? '').replace(/[&<>"']/g, char => HTML_ESCAPE[char])

// 接口日期格式不固定，统一显示为 YYYY/MM/DD
const formatTipDate = (date?: string | null): string => {
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

// 引用标签 + 纯 CSS :hover 展示的资料浮层
const buildCitation = (num: number, target: number, source: searchResultObject): string => {
  const date = formatTipDate(source.date)
  // 默认图标常驻，站点图标加载失败时隐藏 img 即可回退到默认图标
  const icon = [
    '<i class="fas fa-globe"></i>',
    source.site_icon
      ? `<img class="citation-popover-favicon" src="${escapeHtml(source.site_icon)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
      : ''
  ].join('')
  return [
    `<button type="button" class="answer-citation" data-citation="${target}">`,
    `<span class="answer-citation-ref">${num}</span>`,
    '<span class="citation-popover" role="tooltip">',
    '<span class="citation-popover-head">',
    `<span class="citation-popover-icon">${icon}</span>`,
    `<span class="citation-popover-site">${escapeHtml(source.site_name || '网页')}</span>`,
    date ? `<span class="citation-popover-date">${date}</span>` : '',
    '</span>',
    `<span class="citation-popover-title">${escapeHtml(source.title || source.url)}</span>`,
    `<span class="citation-popover-summary">${escapeHtml(source.summary || source.snippet || '暂无摘要')}</span>`,
    '<span class="citation-popover-hint"><i class="fas fa-arrow-up-right-from-square"></i> 点击跳转到该资料</span>',
    '</span>',
    '</button>'
  ].join('')
}

// 把 [1] / 【1】 转成可交互的引用标签，跳过代码块和已有链接
const answerHtml = computed(() => {
  const html = props.item.adminContent.adminText
  const results = props.item.searchResults || []
  if (!results.length || !html) return html
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<a[\s\S]*?<\/a>)/gi)
    .map((part, index) => {
      if (index % 2 === 1) return part
      return part.replace(CITATION_PATTERN, (match, half, full) => {
        const num = Number(half || full)
        const target = num - 1
        if (!Number.isInteger(num) || target < 0 || target >= results.length) return match
        return buildCitation(num, target, results[target])
      })
    })
    .join('')
})

// 点击引用标签或悬浮资料卡：直接在新页面打开对应资料
const onCitationClick = (event: MouseEvent) => {
  const el = (event.target as HTMLElement).closest('.answer-citation') as HTMLElement | null
  if (!el) return
  const target = Number(el.dataset.citation)
  const source = Number.isInteger(target) ? (props.item.searchResults || [])[target] : null
  if (!source || !/^https?:\/\//i.test(source.url || '')) return
  window.open(source.url, '_blank', 'noopener,noreferrer')
}

// 站点图标加载失败时隐藏 img，露出底下的默认图标
const onCitationIconError = (event: Event) => {
  const target = event.target as HTMLElement | null
  if (target instanceof HTMLImageElement && target.classList.contains('citation-popover-favicon')) {
    target.style.display = 'none'
  }
}
</script>

<template>
  <!-- 用户消息（编辑时由父组件的输入框替代，AI 回答仍然保留） -->
  <div
    v-if="!editing"
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
      <div class="group-util" :class="{ show: hoveredIndex == index || userVersion.total > 1 }">
        <div v-if="userVersion.total > 1" class="version-pager">
          <button
            type="button"
            class="version-arrow cursor-pointer"
            aria-label="上一个版本"
            :disabled="userVersion.index <= 0 || isAnswering"
            @click="emit('switch-version', 'user', -1)"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="version-count">{{ userVersion.index + 1 }}/{{ userVersion.total }}</span>
          <button
            type="button"
            class="version-arrow cursor-pointer"
            aria-label="下一个版本"
            :disabled="userVersion.index >= userVersion.total - 1 || isAnswering"
            @click="emit('switch-version', 'user', 1)"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
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
        <div
          class="px-4 py-3 pixel-bubble-ai max-w-[100%] min-w-0"
          :class="{
            'pixel-bubble-ai--has-citation': item.searchResults && item.searchResults.length
          }"
        >
          <button
            v-if="item.searchResults && item.searchResults.length"
            type="button"
            class="search-sources-toggle cursor-pointer"
            @click="emit('open-search-sources', item.searchResults)"
          >
            <i class="fas fa-globe"></i>
            联网资料 {{ item.searchResults.length }} 条
            <i class="fas fa-chevron-right search-sources-chevron"></i>
          </button>
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
          <div
            v-else
            class="text-sm leading-7 ai-txt"
            v-html="answerHtml"
            @click="onCitationClick"
            @error.capture="onCitationIconError"
          ></div>
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
      <div v-if="!editing" class="ai-util">
        <div v-if="assistantVersion.total > 1" class="version-pager">
          <button
            type="button"
            class="version-arrow cursor-pointer"
            aria-label="上一个版本"
            :disabled="assistantVersion.index <= 0 || isAnswering"
            @click="emit('switch-version', 'assistant', -1)"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="version-count">
            {{ assistantVersion.index + 1 }}/{{ assistantVersion.total }}
          </span>
          <button
            type="button"
            class="version-arrow cursor-pointer"
            aria-label="下一个版本"
            :disabled="assistantVersion.index >= assistantVersion.total - 1 || isAnswering"
            @click="emit('switch-version', 'assistant', 1)"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <button
          type="button"
          class="ai-action cursor-pointer"
          :disabled="!item.adminContent.adminText || item.adminContent.isShow"
          @click="emit('copy-answer')"
        >
          <i class="fas fa-copy"></i>
          复制
        </button>
        <button
          type="button"
          class="ai-action cursor-pointer"
          :disabled="isAnswering"
          @click="emit('regenerate')"
        >
          <i class="fas fa-rotate-right"></i>
          重新生成
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pixel-avatar-sm {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 50%;
  object-fit: cover;
  background: var(--surface-2);
}

.pixel-bubble-user {
  max-width: 100%;
  padding: 11px 15px;
  border: 1px solid var(--accent);
  border-radius: 16px 16px 4px;
  background: var(--accent);
  color: #fff;
  box-sizing: border-box;
  overflow-x: auto;

  .text-word {
    color: #fff;
    line-height: 1.65;
  }
}

.pixel-bubble-ai {
  position: relative;
  max-width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 16px 16px 16px 4px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-xs);
  box-sizing: border-box;
  overflow-x: auto;
}

/* 有引用标签时允许悬浮层溢出气泡，并在悬停时盖住后续消息 */
.pixel-bubble-ai--has-citation {
  overflow: visible;

  &:hover {
    z-index: 20;
  }
}

.search-sources-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  margin-bottom: 11px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 500;
  transition:
    background 0.15s var(--ease),
    border-color 0.15s var(--ease),
    color 0.15s var(--ease);

  > i:first-child {
    color: var(--accent);
    font-size: 11px;
  }

  &:hover {
    border-color: var(--accent-ring);
    background: var(--accent-soft);
    color: var(--accent);

    .search-sources-chevron {
      color: var(--accent);
      transform: translateX(2px);
    }
  }
}

.search-sources-chevron {
  color: var(--text-3);
  font-size: 9px;
  transition:
    color 0.15s var(--ease),
    transform 0.15s var(--ease);
}

.pixel-think-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  user-select: none;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);

  i {
    font-size: 11px;
    color: var(--warning);
  }

  &:hover {
    background: var(--surface-3);
    border-color: var(--border-strong);
    color: var(--text);
  }
}

.think-txt {
  position: relative;
  margin: 10px 0 0;
  padding-left: 13px;
}

.think-txt .line {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 0;
  width: 2px;
  border-radius: 2px;
  background: var(--border-strong);
}

.pixel-think-body {
  color: var(--text-3);
}

.pixel-speech-row {
  display: flex;
}

.pixel-speech-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);

  &:hover {
    background: var(--accent-soft);
    border-color: var(--accent-ring);
    color: var(--accent);
  }
}

.pixel-speech-btn--active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);

  &:hover {
    background: var(--accent-soft);
  }
}

.ai-txt {
  line-height: 1.75;
  overflow-wrap: break-word;

  :deep(p) {
    margin: 0 0 10px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 16px 0 8px;
    color: var(--text);
    font-weight: 600;
    line-height: 1.4;
  }

  :deep(h1) {
    font-size: 20px;
  }

  :deep(h2) {
    font-size: 18px;
  }

  :deep(h3) {
    font-size: 16px;
  }

  :deep(ul),
  :deep(ol) {
    margin: 8px 0 10px;
    padding-left: 22px;
  }

  :deep(ul) {
    list-style: disc;
  }

  :deep(ol) {
    list-style: decimal;
  }

  :deep(li) {
    margin: 4px 0;
    list-style: inherit;
  }

  :deep(blockquote) {
    margin: 10px 0;
    padding: 8px 14px;
    border-left: 3px solid var(--border-strong);
    background: var(--surface-2);
    color: var(--text-2);
    border-radius: 0 8px 8px 0;
  }

  :deep(a) {
    color: var(--accent);
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  /* 回答里的 [1] 引用标签 */
  :deep(.answer-citation) {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    margin: 0 2px;
    padding: 0 4px;
    border: 1px solid var(--accent-ring);
    border-radius: 5px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    vertical-align: 1px;
    cursor: pointer;
    transition:
      background 0.15s var(--ease),
      border-color 0.15s var(--ease),
      color 0.15s var(--ease);

    /* 扩大一点悬浮命中范围 */
    &::after {
      position: absolute;
      inset: -3px;
      content: '';
    }

    &:hover {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;

      .citation-popover {
        display: block;
      }
    }
  }

  :deep(.answer-citation-ref) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* 引用资料浮层：纯 CSS :hover 展示 */
  :deep(.citation-popover) {
    position: absolute;
    bottom: calc(100% + 9px);
    left: 50%;
    z-index: 30;
    display: none;
    width: 300px;
    max-width: 70vw;
    padding: 11px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.6;
    text-align: left;
    white-space: normal;
    box-shadow: var(--shadow-lg);
    transform: translateX(-50%);
    cursor: pointer;
    pointer-events: auto;

    /* 铺满标签与浮层之间的空隙，鼠标可以平滑移入卡片 */
    &::before {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      height: 12px;
      content: '';
    }
  }

  :deep(.citation-popover-head) {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    color: var(--text-3);
    font-size: 11px;
  }

  :deep(.citation-popover-icon) {
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
  }

  :deep(.citation-popover-favicon) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: var(--surface);
    object-fit: contain;
  }

  :deep(.citation-popover-site) {
    overflow: hidden;
    max-width: 170px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :deep(.citation-popover-date::before) {
    margin-right: 5px;
    content: '·';
  }

  :deep(.citation-popover-title) {
    display: -webkit-box;
    margin-bottom: 5px;
    overflow: hidden;
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  :deep(.citation-popover-summary) {
    display: -webkit-box;
    margin-bottom: 6px;
    overflow: hidden;
    color: var(--text-2);
    font-size: 12px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  :deep(.citation-popover-hint) {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--accent);
    font-size: 11px;

    i {
      font-size: 9px;
    }
  }

  :deep(code) {
    padding: 2px 5px;
    border-radius: 4px;
    background: var(--surface-3);
    color: var(--accent-active);
    font-family: var(--font-mono);
    font-size: 0.92em;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  :deep(table) {
    width: 100%;
    margin: 10px 0;
    border-collapse: collapse;
    font-size: 13px;
  }

  :deep(th) {
    padding: 8px 10px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 600;
    text-align: left;
  }

  :deep(td) {
    padding: 8px 10px;
    border: 1px solid var(--border);
    color: var(--text-2);
  }
}

.ai_detail {
  :deep(table) {
    border-collapse: collapse;
  }

  :deep(th) {
    padding: 5px 8px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
  }

  :deep(td) {
    padding: 8px 10px;
    border: 1px solid var(--border);
    color: var(--text-2);
  }

  :deep(a) {
    color: var(--accent);
    text-decoration: none;
  }
}

/* 代码块 */
:deep(.pre-code-box) {
  margin: 12px 0;
  border: 1px solid #30333c;
  border-radius: 10px;
  overflow: hidden;
  background: #1b1d23;
}

:deep(.pre-code-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 14px;
  background: #23252c;
  color: #a9adb7;
  font-size: 12px;
  line-height: 38px;
}

:deep(.code-block-header__lang) {
  color: #c7cad2;
  font-size: 12px;
  font-weight: 500;
}

:deep(.code-block-header__actions) {
  display: flex;
  gap: 10px;
}

:deep(.code-block-header__copy),
:deep(.code-block-header__download) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  color: #a9adb7;
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
}

:deep(.code-block-header__copy::before) {
  content: '📋';
  font-size: 12px;
}

:deep(.code-block-header__download::before) {
  content: '⬇️';
  font-size: 12px;
}

:deep(.pre-code code.hljs) {
  display: block;
  padding: 14px 16px;
  border: none;
  background: #1b1d23;
  color: #e6e8ee;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow-x: auto;
}

/* 思考中 */
.load {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-3);
  font-size: 13px;
  line-height: 24px;
}

.load.active {
  margin: 4px 0 6px;
}

.load p {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

.loading {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: msg-spin 0.8s linear infinite;
}

@keyframes msg-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 悬浮操作 */
.group-util {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-width: 150px;
  gap: 4px;
  margin-top: 8px;
  margin-right: 44px;
  visibility: hidden;

  &.show {
    visibility: visible;
  }
}

.ai-util {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0 44px;
}

.version-pager {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 1px;
  height: 28px;
  margin-right: 2px;
  padding: 0 4px;
  border-radius: 8px;
  color: var(--text-3);
  font-size: 12px;
  user-select: none;
}

.version-arrow {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-3);
  font-size: 10px;
  transition:
    background 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text);
  }

  &:disabled {
    opacity: 0.32;
    cursor: not-allowed;
  }
}

.version-count {
  min-width: 32px;
  text-align: center;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.ai-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
  transition:
    background 0.15s var(--ease),
    border-color 0.15s var(--ease),
    color 0.15s var(--ease);

  i {
    font-size: 11px;
  }

  &:hover:not(:disabled) {
    background: var(--accent-soft);
    border-color: var(--accent-ring);
    color: var(--accent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.edit,
.copyDocument {
  width: 28px;
  height: 28px;
  padding: 5px;
  border-radius: 7px;
  color: var(--text-3);
  box-sizing: border-box;
  cursor: pointer;
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.edit {
  margin-right: 2px;
}

.think {
  width: fit-content;
  user-select: none;
}

.text-word {
  white-space: pre-wrap;
}

@media (width <= 900px) {
  .pixel-bubble-user,
  .pixel-bubble-ai {
    padding: 10px 13px;
  }
}
</style>
