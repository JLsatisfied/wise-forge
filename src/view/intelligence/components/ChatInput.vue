<script setup lang="ts">
import { ref, watch } from 'vue'

defineOptions({ name: 'ChatInput' })

const props = defineProps<{
  filenameAll: { isFileContent: boolean; name: string; size: string; type: string; status: string; url: string }
  isAnswering: boolean
  isStopText: boolean
  isDeepThinking: boolean
  webSearch: boolean
  webSearchDisabled: boolean
  isDisabled: boolean
  contentText: string
}>()

const emit = defineEmits<{
  'update:contentText': [value: string]
  'send': [value: string]
  'stop-export': []
  'toggle-deep-thinking': []
  'toggle-web-search': []
  'parse-file-input': [event: Event]
  'clear-file-text': []
  'open-url': []
  'export-conversation': []
  'clear': []
  'keydown': [event: KeyboardEvent]
  'textarea-input': [event: Event]
}>()

const parseFile = ref<null | HTMLInputElement>(null)
const textareaDialogue = ref<null | HTMLElement>(null)

const openFile = () => { parseFile.value?.click() }

watch(() => props.contentText, (val) => {
  if (!val && textareaDialogue.value) {
    textareaDialogue.value.style.height = 'auto'
  }
})

watch(() => props.filenameAll.isFileContent, (val) => {
  if (!val && parseFile.value) {
    parseFile.value.value = ''
  }
})
</script>

<template>
  <div class="entying pixel-input-panel mt-4 p-4">
    <div class="space-y-2" :class="filenameAll.isFileContent ? 'pb-6 pixel-file-sep' : ''">
      <div v-if="filenameAll.isFileContent"
        class="pixel-file-card flex items-center justify-between px-4 py-2 w-3xs cursor-pointer" @click="emit('open-url')">
        <div class="flex items-center gap-3">
          <div class="loading" v-if="filenameAll.status == '1'"></div>
          <i class="fas fa-file pixel-gold" v-if="filenameAll.status == '2'"></i>
          <i class="fas fa-exclamation-circle pixel-danger" v-if="filenameAll.status == '3'"></i>
          <div>
            <div class="text-sm font-medium pixel-ink truncate w-43">{{ filenameAll.name }}</div>
            <div class="text-sm pixel-text-muted" v-if="filenameAll.status == '1'">上传中</div>
            <div class="text-sm pixel-danger" v-if="filenameAll.status == '3'">上传失败</div>
            <div class="text-xs pixel-text-muted" v-if="filenameAll.status == '2'">{{ filenameAll.size }}MB · {{ filenameAll.type }}</div>
          </div>
        </div>
        <button type="button" @click.stop="emit('clear-file-text')" class="pixel-icon-btn cursor-pointer">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2 min-w-0" :class="filenameAll.isFileContent ? 'mt-3' : ''">
      <input type="file" ref="parseFile" @change="(e) => emit('parse-file-input', e as Event)" style="display: none;">
      <div class="input-tools">
        <el-tooltip class="box-item" effect="dark" content="投递卷轴" placement="top">
          <button type="button" class="p-2 pixel-tool-btn cursor-pointer" @click="openFile">
            <i class="fas fa-paperclip pixel-text-muted"></i>
          </button>
        </el-tooltip>
        <el-tooltip
          class="box-item"
          effect="dark"
          :content="webSearchDisabled ? '讯飞模型暂不支持联网搜索' : webSearch ? '联网搜索已开启' : '联网搜索'"
          placement="top"
        >
          <button
            type="button"
            class="p-2 pixel-tool-btn cursor-pointer"
            :class="{ 'pixel-tool-btn--on': webSearch }"
            :disabled="webSearchDisabled"
            @click="emit('toggle-web-search')"
          >
            <i class="fas fa-globe" :class="webSearch ? '' : 'pixel-text-muted'"></i>
          </button>
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" :content="isAnswering ? '回答中，无法导出' : '导出卷轴'" placement="top">
          <button type="button" class="p-2 pixel-tool-btn cursor-pointer" :disabled="isAnswering" :style="isAnswering ? { opacity: '0.4', cursor: 'not-allowed' } : {}" @click="emit('export-conversation')">
            <i class="fas fa-download pixel-text-muted"></i>
          </button>
        </el-tooltip>
        <el-tooltip class="box-item" effect="dark" content="清除冒险日志" placement="top">
          <button type="button" class="p-2 pixel-tool-btn cursor-pointer" @click="emit('clear')">
            <i class="fas fa-trash-alt pixel-text-muted" title="清除冒险日志"></i>
          </button>
        </el-tooltip>
      </div>
      <textarea
        :value="contentText"
        @input="emit('update:contentText', ($event.target as HTMLTextAreaElement).value); emit('textarea-input', $event)"
        @keydown.enter.prevent="emit('keydown', $event)"
        rows="1"
        class="textarea-dialogue flex-1 min-w-0 resize-none px-4 py-2 text-sm pixel-textarea"
        placeholder="向冒险者公会诉说你的疑问..."
        ref="textareaDialogue"
      ></textarea>
      <button type="button" @click="emit('toggle-deep-thinking')" class="pixel-btn pixel-chip px-4 py-2 flex items-center gap-2 mr-2 cursor-pointer text-sm shrink-0" :class="{'pixel-chip--on': isDeepThinking}">
        <i class="fas fa-lightbulb text-sm"></i>
        贤者沉思
      </button>
      <button type="button" class="pixel-btn pixel-btn-primary px-4 py-2 cursor-pointer shrink-0" v-if="isStopText" @click="emit('stop-export')">
        <i class="fas fa-stop text-sm" title="停止生成"></i>
      </button>
      <button @click.stop="emit('send', contentText)"
        v-else
        :disabled="isDisabled"
        :class="contentText ? '': 'area-disabled'"
        class="pixel-btn pixel-btn-primary pixel-btn-send px-4 py-2 cursor-pointer shrink-0">
        <i class="fas fa-arrow-up text-sm"></i>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pixel-input-panel {
  flex-shrink: 0;
  margin-top: 16px;
  padding: 13px 14px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: 0 4px 16px rgba(16, 24, 40, 0.06);
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  transition:
    border-color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);

  &:focus-within {
    border-color: var(--border-strong);
    box-shadow: 0 6px 20px rgba(16, 24, 40, 0.09);
  }
}

.input-tools {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding-right: 8px;
  border-right: 1px solid var(--border);
}

.pixel-file-sep {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.pixel-file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  max-width: 330px;
  padding: 8px 10px 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  cursor: pointer;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);

  &:hover {
    border-color: var(--border-strong);
    background: var(--surface-3);
  }
}

.pixel-file-card .w-43 {
  max-width: 210px;
}

.pixel-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: var(--danger-soft);
    color: var(--danger);
  }
}

.pixel-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-3);
  font-size: 14px;
  cursor: pointer;
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  &:active {
    background: var(--surface-3);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.pixel-tool-btn--on {
  background: var(--accent-soft);
  color: var(--accent);

  i {
    color: var(--accent);
  }

  &:hover {
    background: var(--accent-soft);
    color: var(--accent);
  }
}

.pixel-textarea {
  flex: 1;
  min-width: 0;
  min-height: 40px;
  max-height: 168px;
  padding: 10px 13px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-size: 14px;
  line-height: 1.55;
  outline: none;
  overflow-y: auto;
  transition:
    background-color 0.18s var(--ease),
    border-color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);

  &::placeholder {
    color: var(--text-3);
  }

  &:focus {
    background: var(--surface);
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-ring);
  }
}

.pixel-input-panel .pixel-chip {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;

  i {
    color: var(--text-3);
  }

  &:hover:not(:disabled) {
    background: var(--surface-3);
    border-color: var(--border-strong);
    color: var(--text);
  }
}

.pixel-input-panel .pixel-chip--on {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);

  i {
    color: var(--accent);
  }

  &:hover:not(:disabled) {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
}

.pixel-input-panel .pixel-btn-primary {
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-size: 13px;
  box-shadow: 0 4px 12px var(--accent-ring);

  i {
    font-size: 13px;
  }

  &:hover:not(:disabled) {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }
}

.pixel-input-panel .pixel-btn-primary.area-disabled {
  opacity: 0.45;
  box-shadow: none;
  cursor: not-allowed;
}

.loading {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: input-spin 0.8s linear infinite;
}

@keyframes input-spin {
  to {
    transform: rotate(360deg);
  }
}

.area-disabled {
  cursor: not-allowed;
}

.textarea-dialogue {
  overflow: hidden;
  resize: none;
}

@media (width <= 900px) {
  .pixel-input-panel {
    padding: 10px;
  }

  .pixel-input-panel .pixel-chip {
    padding: 0 10px;
  }
}
</style>
