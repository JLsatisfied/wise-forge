<script setup lang="ts">
import { ref, watch } from 'vue'

defineOptions({ name: 'ChatInput' })

const props = defineProps<{
  filenameAll: { isFileContent: boolean; name: string; size: string; type: string; status: string; url: string }
  isAnswering: boolean
  isStopText: boolean
  isDeepThinking: boolean
  isDisabled: boolean
  contentText: string
}>()

const emit = defineEmits<{
  'update:contentText': [value: string]
  'send': [value: string]
  'stop-export': []
  'toggle-deep-thinking': []
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
      <el-tooltip class="box-item" effect="dark" content="投递卷轴" placement="top">
        <button type="button" class="p-2 pixel-tool-btn cursor-pointer" @click="openFile">
          <i class="fas fa-paperclip pixel-text-muted"></i>
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
@use '@/styles/pixel-theme' as *;

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
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
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
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );

  &:focus {
    border-color: $neon-cyan;
    box-shadow:
      inset 0 0 10px rgba(0, 0, 0, 0.3),
      0 0 15px rgba($neon-cyan, 0.4),
      0 0 30px rgba($neon-cyan, 0.2);
  }
}

.loading {
    animation: api-debug_load__hsrQ8 2s linear infinite;
    border-right: 2px solid $neon-cyan;
    border-top: 2px solid $neon-cyan;
    content: "";
    display: block;
    height: 20px;
    width: 20px;
}

.load {
    display: flex;
    letter-spacing: .5px;
    line-height: 24px;
    color: $pixel-text-muted;
}

.area-disabled {
    cursor: no-drop;
}

.textarea-dialogue {
    overflow: hidden;
}
</style>
