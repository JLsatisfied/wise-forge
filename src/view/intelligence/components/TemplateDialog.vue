<script setup lang="ts">
import { computed } from 'vue'
import { promptObject, templateObject } from '@/utils/types/ai'

defineOptions({ name: 'TemplateDialog' })

const props = defineProps<{
  dialogTableVisible: boolean
  promptList: promptObject[]
  promptIndex: number
  templateList: templateObject[]
  page: number
  pageSize: number
  total: number
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:dialogTableVisible': [value: boolean]
  'update:page': [value: number]
  'select-prompt': [item: promptObject, index: number]
  'cite-template': [item: templateObject]
  'page-change': [val: number]
}>()

const visible = computed({
  get: () => props.dialogTableVisible,
  set: (val) => emit('update:dialogTableVisible', val)
})

const currentPage = computed({
  get: () => props.page,
  set: (val) => emit('update:page', val)
})
</script>

<template>
  <el-dialog class="template-list-dialog" v-model="visible" title="冒险副本">
    <p class="subtitle">挑选适合你的冒险副本</p>
    <ul class="template-category">
      <li
        class="pixel-prompt-pill"
        v-for="(item, index) in promptList"
        :key="item.id"
        @click="emit('select-prompt', item, index)"
        :class="promptIndex == index ? 'pixel-prompt-pill--active' : ''"
      >{{ item.name }}</li>
    </ul>
    <ul class="prompt">
      <li v-for="item in templateList" :key="item.id">
        <div class="detail">
          <div class="detail-icon">⚔️</div>
          <div class="detail-content">
            <p><strong class="detail-title">{{ item.name }}</strong></p>
            <p class="into" :title="item.info">{{ item.info }}</p>
          </div>
        </div>
        <div class="action-use pixel-btn-primary cursor-pointer" @click="emit('cite-template', item)">进入副本</div>
      </li>
    </ul>
    <el-pagination
      v-model:current-page="currentPage"
      :page-size="pageSize"
      :disabled="disabled"
      layout="prev, pager, next, jumper"
      :total="total"
      @current-change="(val: number) => emit('page-change', val)"
    />
  </el-dialog>
</template>

<!-- el-dialog 内容会被 Teleport 到 body，必须用非 scoped 样式 -->
<style lang="scss">
@use '@/styles/pixel-theme' as *;

.template-list-dialog {
    width: 900px;
    background: $pixel-dialog-bg;
    border: 2px solid $pixel-border;
    backdrop-filter: blur(20px);
    clip-path: polygon(
      0 8px, 8px 8px, 8px 0,
      calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px,
      100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%,
      8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px)
    );
    box-shadow:
      0 0 30px rgba($neon-cyan, 0.3),
      0 0 60px rgba($neon-magenta, 0.2),
      0 25px 50px rgba(0, 0, 0, 0.5);

    .el-dialog__title {
        font-family: myFirstFont, "VT323", ui-monospace, monospace;
        font-weight: normal;
        font-size: 1.5rem;
        letter-spacing: 0.06em;
        color: #fff;
        text-shadow: 0 0 10px $neon-cyan;
    }

    .el-pagination button {
        transition:
            transform 0.07s ease-out,
            filter 0.07s ease-out;
        color: $pixel-text;
        background: rgba($neon-cyan, 0.1);
        border: 1px solid rgba($neon-cyan, 0.3);

        &:active:not(:disabled) {
            transform: translate(1px, 2px);
            filter: brightness(0.9);
        }

        &:disabled {
            color: $pixel-text-muted;
            background: transparent;
        }
    }
}

.subtitle {
    font-size: 12px;
    font-weight: 400;
    color: $pixel-text-muted;
    margin-bottom: 5px;
}

.template-category {
    padding: 0;
    list-style: none;
    display: flex;
    flex-flow: row wrap;
    column-gap: 32px;
    row-gap: 15px;

    li {
        flex-shrink: 0;
        width: 80px;
        height: 30px;
        line-height: 26px;
        text-align: center;
        font-size: 12px;
        cursor: pointer;
        color: $pixel-text;
        border: 2px solid rgba($neon-cyan, 0.4);
        background: rgba($neon-cyan, 0.1);
        backdrop-filter: blur(10px);
        box-shadow: 0 0 10px rgba($neon-cyan, 0.2);
        transition:
            transform 0.07s ease-out,
            box-shadow 0.07s ease-out,
            filter 0.07s ease-out,
            background 0.15s ease,
            border-color 0.15s ease;

        &:active {
            transform: translate(2px, 3px);
            @include pixel-press-shadow;
            filter: brightness(0.93);
        }
    }

    li.pixel-prompt-pill--active {
        background: rgba($neon-cyan, 0.3);
        border-color: $neon-cyan;
        font-weight: 700;
        color: #fff;
        box-shadow: 0 0 15px rgba($neon-cyan, 0.5);
    }
}

.prompt {
    padding: 0;
    list-style: none;
    display: flex;
    column-gap: 41px;
    row-gap: 25px;
    overflow-y: auto;
    margin-top: 30px;

    li {
        position: relative;
        width: 262px;
        box-sizing: border-box;
        padding: 10px 11px;
        cursor: pointer;
        border: 2px solid rgba($neon-cyan, 0.3);
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(10px);
        box-shadow: 0 0 15px rgba($neon-cyan, 0.1);
        clip-path: polygon(
          0 4px, 4px 4px, 4px 0,
          calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
          100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
          4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
        );
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

        &:hover {
            border-color: $neon-cyan;
            transform: translateY(-2px);
            box-shadow: 0 0 25px rgba($neon-cyan, 0.3);
        }
    }
}

.detail {
    display: flex;
}

.detail-title {
    font-size: 14px;
    color: $pixel-text;
    font-weight: 600;
}

.detail-icon {
    font-size: 20px;
    margin-right: 10px;
    display: flex;
    align-items: center;
}

.detail-content .into {
    line-height: 18px;
    font-size: 12px;
    font-weight: 400;
    color: $pixel-text-muted;
    height: 38px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
}

.action-use {
    width: 70px;
    height: 25px;
    line-height: 23px;
    font-size: 12px;
    color: #fff;
    text-align: center;
    float: right;
    margin-top: 10px;
    border: 2px solid $neon-purple;
    background: linear-gradient(180deg,
      rgba($neon-purple, 0.4) 0%,
      rgba($neon-purple, 0.2) 50%,
      rgba($neon-purple, 0.1) 100%);
    box-shadow:
      0 0 10px rgba($neon-purple, 0.4),
      inset 1px 1px 0 rgba(255, 255, 255, 0.1);
    clip-path: polygon(
      0 3px, 3px 3px, 3px 0,
      calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
      100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
      3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
    );
    font-weight: 600;
    transition:
        transform 0.07s ease-out,
        box-shadow 0.07s ease-out,
        filter 0.07s ease-out;

    &:active {
        transform: translate(2px, 3px);
        @include pixel-press-shadow;
        filter: brightness(0.92);
    }
}

.el-pagination {
    margin-top: 30px;
    --el-text-color-regular: #{$pixel-text};
}

.el-pager li {
    color: $pixel-text-muted !important;
    background: rgba($neon-cyan, 0.08);
    border: 1px solid transparent;
    min-width: 32px;
    height: 32px;
    line-height: 32px;
    border-radius: 0 !important;
    font-weight: 600;
    transition: all 0.15s ease;
    clip-path: polygon(
      0 3px, 3px 3px, 3px 0,
      calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
      100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
      3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
    );

    &:hover {
      color: $neon-cyan-light !important;
      background: rgba($neon-cyan, 0.18);
      border-color: rgba($neon-cyan, 0.4);
    }
}

.el-pager li.is-active {
    color: #fff !important;
    font-weight: 700;
    background: rgba($neon-cyan, 0.25);
    border-color: $neon-cyan;
    text-shadow: 0 0 8px $neon-cyan;
    box-shadow: 0 0 12px rgba($neon-cyan, 0.4);
}

.el-pagination .btn-prev,
.el-pagination .btn-next {
    color: $pixel-text !important;
    background: rgba($neon-cyan, 0.1);
    border: 1px solid rgba($neon-cyan, 0.2);
    border-radius: 0 !important;
    transition: all 0.15s ease;
    clip-path: polygon(
      0 3px, 3px 3px, 3px 0,
      calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
      100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
      3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
    );

    &:hover:not(:disabled) {
      color: $neon-cyan-light !important;
      background: rgba($neon-cyan, 0.22);
      border-color: $neon-cyan;
    }
}

.el-pagination .btn-prev:disabled,
.el-pagination .btn-next:disabled {
    color: rgba($pixel-text-muted, 0.4) !important;
    background: transparent;
    border-color: transparent;
}

.el-pagination .el-input__wrapper {
    border: 2px solid rgba($neon-cyan, 0.3);
    color: $pixel-text;
    box-shadow: inset 1px 1px 0 rgba(0, 0, 0, 0.3);
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0;
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

.el-pagination .el-input__inner {
    color: $pixel-text;
    text-align: center;
}

.el-input__wrapper {
    border: 2px solid rgba($neon-cyan, 0.3);
    color: $pixel-text;
    box-shadow: inset 1px 1px 0 rgba(0, 0, 0, 0.3);
    background: rgba(0, 0, 0, 0.3);
}

.el-dialog {
    background: $pixel-dialog-bg !important;
}

.el-dialog__body {
    color: $pixel-text;
}
</style>
