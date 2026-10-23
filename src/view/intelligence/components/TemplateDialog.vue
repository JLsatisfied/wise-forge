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
  set: val => emit('update:dialogTableVisible', val)
})

const currentPage = computed({
  get: () => props.page,
  set: val => emit('update:page', val)
})
</script>

<template>
  <el-dialog class="template-list-dialog app-dialog" v-model="visible" title="冒险副本">
    <p class="subtitle">挑选适合你的冒险副本</p>
    <ul class="template-category">
      <li
        class="pixel-prompt-pill"
        v-for="(item, index) in promptList"
        :key="item.id"
        @click="emit('select-prompt', item, index)"
        :class="promptIndex == index ? 'pixel-prompt-pill--active' : ''"
      >
        {{ item.name }}
      </li>
    </ul>
    <ul class="prompt">
      <li v-for="item in templateList" :key="item.id">
        <div class="detail">
          <div class="detail-icon"><i class="fas fa-layer-group"></i></div>
          <div class="detail-content">
            <p>
              <strong class="detail-title">{{ item.name }}</strong>
            </p>
            <p class="into" :title="item.info">{{ item.info }}</p>
          </div>
        </div>
        <div
          class="action-use pixel-btn-primary cursor-pointer"
          @click="emit('cite-template', item)"
        >
          进入副本
        </div>
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

<!-- el-dialog 内容会被 Teleport 到 body，必须用 .template-list-dialog 包裹所有选择器避免冲突 -->
<style lang="scss">
.template-list-dialog {
  width: 900px;
  max-width: calc(100vw - 32px);
  border-radius: var(--radius-lg);

  .el-dialog__body {
    color: var(--text);
  }

  .el-dialog__title {
    color: var(--text);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .subtitle {
    margin: 0 0 16px;
    color: var(--text-3);
    font-size: 13px;
    font-weight: 400;
  }
}

.template-list-dialog .template-category {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.template-list-dialog .pixel-prompt-pill {
  flex-shrink: 0;
  height: 32px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 999px;
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
    color: var(--text);
  }
}

.template-list-dialog .pixel-prompt-pill--active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.template-list-dialog .prompt {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  max-height: 48vh;
  margin: 20px 0 0;
  padding: 2px;
  list-style: none;
  overflow-y: auto;
}

.template-list-dialog .prompt > li {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  transition:
    border-color 0.18s var(--ease),
    box-shadow 0.18s var(--ease),
    transform 0.18s var(--ease);

  &:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }
}

.template-list-dialog .detail {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.template-list-dialog .detail-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
}

.template-list-dialog .detail-content {
  flex: 1;
  min-width: 0;
}

.template-list-dialog .detail-title {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.template-list-dialog .detail-content p {
  margin: 0;
}

.template-list-dialog .detail-content .into {
  display: -webkit-box;
  margin-top: 5px;
  height: 36px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.template-list-dialog .action-use {
  align-self: flex-end;
  min-width: 76px;
  height: 30px;
  margin-top: 12px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);

  &:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }
}

.template-list-dialog .el-pagination {
  margin-top: 20px;
  justify-content: center;
}

.template-list-dialog .el-pagination .btn-prev,
.template-list-dialog .el-pagination .btn-next {
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  color: var(--text-2);

  &:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent-ring);
    background: var(--accent-soft);
  }

  &:disabled {
    color: var(--text-3);
    background: transparent;
    border-color: var(--border);
  }
}

.template-list-dialog .el-pagination .el-pager li {
  min-width: 32px;
  height: 32px;
  line-height: 32px;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
  color: var(--text-2);
  font-weight: 500;

  &:hover {
    color: var(--accent);
  }
}

.template-list-dialog .el-pagination .el-pager li.is-active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}

.template-list-dialog .el-pagination .el-input__wrapper {
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--surface);
  box-shadow: none;
}

.template-list-dialog .el-pagination .el-input__inner {
  color: var(--text);
  text-align: center;
}

@media (width <= 640px) {
  .template-list-dialog {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    margin: 0 auto;
  }

  .template-list-dialog .prompt {
    grid-template-columns: 1fr;
    max-height: 52vh;
  }
}
</style>
