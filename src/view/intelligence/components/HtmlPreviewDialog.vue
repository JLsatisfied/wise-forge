<script setup lang="ts">
import { computed, ref, watch } from 'vue'

defineOptions({ name: 'HtmlPreviewDialog' })

const props = defineProps<{
  modelValue: boolean
  code: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

type DeviceType = 'desktop' | 'tablet' | 'mobile'

const device = ref<DeviceType>('desktop')
const reloadKey = ref(0)

const DEVICE_WIDTH: Record<DeviceType, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px'
}

const deviceWidth = computed(() => DEVICE_WIDTH[device.value])

// 沙箱里只允许内联脚本、内联样式和 https 外链，禁止访问本站接口与存储
const CSP_META = [
  '<meta http-equiv="Content-Security-Policy" content="',
  "default-src 'none'; ",
  "script-src 'unsafe-inline' https:; ",
  "style-src 'unsafe-inline' https:; ",
  'img-src data: blob: https:; ',
  'font-src data: https:; ',
  'media-src data: blob: https:; ',
  'connect-src https:; ',
  '">'
].join('')

const VIEWPORT_META = '<meta name="viewport" content="width=device-width, initial-scale=1" />'

// 模型给出的经常是片段：补全成完整文档，保证预览和在浏览器里打开一致
// withCsp 只在预览时开启，下载的文件不注入策略，避免用户本地打开时资源被拦
const buildDocument = (source: string, withCsp = true) => {
  const headMeta = withCsp ? `${CSP_META}${VIEWPORT_META}` : VIEWPORT_META
  if (/<head[\s>]/i.test(source)) {
    return source.replace(/<head([^>]*)>/i, `<head$1>${headMeta}`)
  }
  if (/<html[\s>]/i.test(source)) {
    return source.replace(/<html([^>]*)>/i, `<html$1><head>${headMeta}</head>`)
  }
  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    `<head><meta charset="utf-8" />${headMeta}`,
    '<style>html, body { margin: 0; padding: 0; min-height: 100%; }</style>',
    '</head>',
    `<body>${source}</body>`,
    '</html>'
  ].join('')
}

const documentHtml = computed(() => buildDocument(props.code || ''))

watch(
  () => props.code,
  () => {
    reloadKey.value++
  }
)

const reload = () => {
  reloadKey.value++
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    ElMessage.success('代码已复制')
  } catch {
    ElMessage.error('复制失败，请手动选中代码复制')
  }
}

const download = () => {
  const blob = new Blob([buildDocument(props.code, false)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'preview.html'
  link.click()
  URL.revokeObjectURL(url)
}

const DEVICES: Array<{ key: DeviceType; label: string; icon: string }> = [
  { key: 'desktop', label: '桌面', icon: 'fas fa-display' },
  { key: 'tablet', label: '平板', icon: 'fas fa-tablet-screen-button' },
  { key: 'mobile', label: '手机', icon: 'fas fa-mobile-screen-button' }
]
</script>

<template>
  <el-dialog
    v-model="visible"
    class="app-dialog html-preview-dialog"
    width="min(1100px, 94vw)"
    top="5vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="hp-head">
        <div class="hp-title">
          <i class="fas fa-code"></i>
          <span>HTML 预览</span>
          <span class="hp-badge">沙箱运行</span>
        </div>
        <div class="hp-actions">
          <div class="hp-devices">
            <button
              v-for="item in DEVICES"
              :key="item.key"
              type="button"
              class="hp-device cursor-pointer"
              :class="{ 'is-active': device === item.key }"
              :title="item.label"
              @click="device = item.key"
            >
              <i :class="item.icon"></i>
            </button>
          </div>
          <button type="button" class="hp-btn cursor-pointer" title="重新运行" @click="reload">
            <i class="fas fa-rotate-right"></i>
          </button>
          <button type="button" class="hp-btn cursor-pointer" @click="copyCode">
            <i class="fas fa-copy"></i>
            复制代码
          </button>
          <button type="button" class="hp-btn hp-btn--primary cursor-pointer" @click="download">
            <i class="fas fa-download"></i>
            下载 HTML
          </button>
        </div>
      </div>
    </template>

    <div class="hp-body">
      <iframe
        :key="reloadKey"
        :srcdoc="documentHtml"
        :style="{ width: deviceWidth }"
        class="hp-frame"
        title="HTML 预览"
        sandbox="allow-scripts allow-modals allow-popups"
        referrerpolicy="no-referrer"
      ></iframe>
    </div>

    <p class="hp-tip">
      <i class="fas fa-shield-halved"></i>
      预览在隔离的沙箱中运行，无法访问本站账号、Cookie 或本地存储。
    </p>
  </el-dialog>
</template>

<style lang="scss">
/* el-dialog 会被 teleport 到 body，这里用全局样式限定在自身 class 下 */
.html-preview-dialog {
  .el-dialog__header {
    padding: 14px 20px;
    margin-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .el-dialog__body {
    padding: 0;
  }
}

.html-preview-dialog .hp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 24px;
}

.html-preview-dialog .hp-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;

  i {
    color: var(--accent);
  }
}

.html-preview-dialog .hp-badge {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 500;
}

.html-preview-dialog .hp-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.html-preview-dialog .hp-devices {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
}

.html-preview-dialog .hp-device {
  width: 30px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-3);
  font-size: 12px;
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    color: var(--text);
  }

  &.is-active {
    background: var(--surface);
    color: var(--accent);
    box-shadow: var(--shadow-xs);
  }
}

.html-preview-dialog .hp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-2);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 0.15s var(--ease),
    border-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
    color: var(--text);
  }
}

.html-preview-dialog .hp-btn--primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;

  &:hover {
    border-color: var(--accent-hover);
    background: var(--accent-hover);
    color: #fff;
  }
}

.html-preview-dialog .hp-body {
  height: 68vh;
  min-height: 320px;
  display: flex;
  justify-content: center;
  padding: 16px;
  background: var(--surface-2);
  box-sizing: border-box;
}

.html-preview-dialog .hp-frame {
  height: 100%;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: width 0.2s var(--ease);
}

.html-preview-dialog .hp-tip {
  margin: 0;
  padding: 10px 20px 14px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;

  i {
    margin-right: 4px;
  }
}

@media (width <= 760px) {
  .html-preview-dialog .hp-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    padding-right: 20px;
  }

  .html-preview-dialog .hp-actions {
    justify-content: flex-start;
  }

  .html-preview-dialog .hp-body {
    height: 60vh;
    padding: 10px;
  }
}
</style>
