<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import ContextMenu from '@/components/ContextMenu.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { categories, menuObject } from '@/utils/types/ai'
import type { DeepseekConversationMeta, DeepseekGroup } from '../useDeepseekHistory'
import { useRouter } from 'vue-router'

defineOptions({ name: 'SideBar' })

const props = defineProps<{
  isLoadingCategories: boolean
  categoryData: categories[]
  currentIndex: number
  deepseekGroups: DeepseekGroup[]
  activeDeepseekId: string
}>()

const emit = defineEmits<{
  'add-classify': []
  'select-message': [item: categories]
  'remove-classify': [item: menuObject]
  'go-customer-service': []
  'new-deepseek-chat': []
  'select-deepseek': [item: DeepseekConversationMeta]
  'remove-deepseek': [item: DeepseekConversationMeta]
  'pin-deepseek': [item: DeepseekConversationMeta]
  'rename-deepseek': [payload: { id: string; title: string }]
}>()

const router = useRouter()

// ===== 行内“更多”菜单：置顶 / 重命名 =====
const MENU_WIDTH = 128
const MENU_HEIGHT = 128
const menuItem = ref<DeepseekConversationMeta | null>(null)
const menuPosition = reactive({ x: 0, y: 0 })

const closeRowMenu = () => {
  menuItem.value = null
}

const findConversation = (id: string) =>
  props.deepseekGroups.flatMap(group => group.items).find(item => item.id === id)

// 菜单里的文案跟随列表实时状态：已置顶时显示“取消置顶”
const menuConversation = computed(() => {
  const item = menuItem.value
  if (!item) return null
  return findConversation(item.id) || item
})

const openRowMenu = (event: MouseEvent, item: DeepseekConversationMeta) => {
  event.stopPropagation()
  if (menuItem.value?.id === item.id) {
    closeRowMenu()
    return
  }
  // 弹层贴在三点按钮下方展开，而不是向左侧弹出
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menuPosition.x = Math.min(window.innerWidth - MENU_WIDTH - 8, Math.max(8, rect.left))
  menuPosition.y =
    rect.bottom + 6 + MENU_HEIGHT > window.innerHeight
      ? Math.max(8, rect.top - MENU_HEIGHT - 6)
      : rect.bottom + 6
  menuItem.value = item
}

// ===== 行内重命名 =====
const RENAME_MAX_LENGTH = 30
const renamingId = ref('')
const renameText = ref('')

const handleSelect = (item: DeepseekConversationMeta) => {
  // 重命名过程中点击当前行不切换会话
  if (renamingId.value === item.id) return
  emit('select-deepseek', item)
}

const startRename = (item: DeepseekConversationMeta) => {
  closeRowMenu()
  renamingId.value = item.id
  renameText.value = item.title
  nextTick(() => {
    // 同一时刻只会有一个重命名输入框，直接取当前渲染出的那个
    const input = document.querySelector<HTMLInputElement>('.sb-rename-input')
    input?.focus()
    input?.select()
  })
}

const cancelRename = () => {
  renamingId.value = ''
  renameText.value = ''
}

const commitRename = () => {
  const id = renamingId.value
  if (!id) return
  const title = Array.from(renameText.value.replace(/\s+/g, ' ').trim())
    .slice(0, RENAME_MAX_LENGTH)
    .join('')
  // 先退出编辑态，避免 blur 再次提交
  cancelRename()
  if (!title || title === findConversation(id)?.title) return
  emit('rename-deepseek', { id, title })
}

const handlePin = () => {
  const item = menuConversation.value
  closeRowMenu()
  if (item) emit('pin-deepseek', item)
}

const handleRename = () => {
  const item = menuItem.value
  if (item) startRename(item)
}

const handleRemove = () => {
  const item = menuConversation.value
  closeRowMenu()
  if (item) emit('remove-deepseek', item)
}

const handleDocumentClick = () => closeRowMenu()

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  closeRowMenu()
  cancelRename()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
  // 捕获阶段监听滚动，侧边栏内部滚动时也能收起菜单
  window.addEventListener('scroll', closeRowMenu, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener('scroll', closeRowMenu, true)
})
</script>

<template>
  <div class="pixel-sidebar fixed left-0 top-0 h-screen flex flex-col shrink-0">
    <div class="pixel-sidebar-head p-4">
      <div class="grid grid-cols-4 gap-2 mb-3">
        <div class="pixel-icon-tile aspect-square flex items-center justify-center cursor-pointer">
          <i class="fas fa-dragon text-xl pixel-icon-accent"></i>
        </div>
        <div class="pixel-icon-tile aspect-square flex items-center justify-center cursor-pointer">
          <i class="fas fa-fort-awesome text-xl pixel-icon-accent"></i>
        </div>
        <div class="pixel-icon-tile aspect-square flex items-center justify-center cursor-pointer">
          <i class="fas fa-wand-sparkles text-xl pixel-icon-accent"></i>
        </div>
        <div class="pixel-icon-tile aspect-square flex items-center justify-center cursor-pointer">
          <i class="fas fa-scroll text-xl pixel-icon-accent"></i>
        </div>
      </div>
      <button class="sb-btn sb-btn--quest" @click="emit('add-classify')">
        <span class="sb-btn-icon"><i class="fas fa-plus"></i></span>
        <span class="sb-btn-text">开启冒险</span>
      </button>
      <button class="sb-btn sb-btn--guild" @click="emit('go-customer-service')">
        <span class="sb-btn-icon"><i class="fas fa-headset"></i></span>
        <span class="sb-btn-text">冒险者公会</span>
      </button>
      <button class="sb-btn sb-btn--adventure" @click="router.push('/adventure')">
        <span class="sb-btn-icon"><i class="fas fa-dungeon"></i></span>
        <span class="sb-btn-text">冒险模式</span>
      </button>
    </div>
    <div class="flex-1 overflow-y-auto new-dialogue">
      <p class="sb-section-label">最近对话</p>
      <template v-if="isLoadingCategories && !categoryData.length">
        <div class="p-1" v-for="n in 4" :key="'skeleton-sidebar-' + n">
          <div class="header effect pixel-list-item skeleton-list-item">
            <div class="list-icon">
              <SkeletonLoader variant="avatar" width="40px" height="40px" />
            </div>
            <div class="header-right pixel-list-text" style="flex: 1; margin-left: 10px">
              <SkeletonLoader width="60%" height="14px" style="margin-bottom: 6px" />
              <SkeletonLoader width="90%" height="12px" />
            </div>
          </div>
        </div>
      </template>
      <div
        class="p-1"
        v-for="item in categoryData"
        :key="item.category_id"
        @click="emit('select-message', item)"
      >
        <ContextMenu
          :menu="[{ label: '删除', id: item.category_id }]"
          @select="(menuItem: menuObject) => emit('remove-classify', menuItem)"
        >
          <div
            class="header effect pixel-list-item cursor-pointer"
            :class="currentIndex == item.category_id ? 'pixel-list-item--active' : ''"
          >
            <div class="list-icon">
              <img class="profile" :src="item.category_img" alt="" />
            </div>
            <div class="header-right pixel-list-text">
              <p class="name">{{ item.my_name }}</p>
              <p class="restrict" :title="item.self_introduction">{{ item.self_introduction }}</p>
            </div>
          </div>
        </ContextMenu>
      </div>

      <!-- DeepSeek 模型专属最近对话 -->
      <div class="sb-deepseek">
        <div class="sb-section-head">
          <p class="sb-section-label sb-section-label--inline">DeepSeek 对话</p>
          <button
            type="button"
            class="sb-section-add"
            title="新建 DeepSeek 对话"
            aria-label="新建 DeepSeek 对话"
            @click="emit('new-deepseek-chat')"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <template v-if="deepseekGroups.length">
          <div v-for="group in deepseekGroups" :key="group.label" class="sb-group">
            <p class="sb-group-label">{{ group.label }}</p>
            <div v-for="item in group.items" :key="item.id" class="sb-group-item">
              <div
                class="header effect pixel-list-item cursor-pointer sb-deepseek-item"
                :class="activeDeepseekId === item.id ? 'pixel-list-item--active' : ''"
                @click="handleSelect(item)"
              >
                <div class="list-icon sb-deepseek-icon">
                  <i class="fas fa-comment-dots"></i>
                </div>
                <div class="header-right pixel-list-text">
                  <input
                    v-if="renamingId === item.id"
                    v-model="renameText"
                    class="sb-rename-input"
                    maxlength="30"
                    @click.stop
                    @keydown.enter.prevent="commitRename"
                    @keydown.esc.prevent="cancelRename"
                    @blur="commitRename"
                  />
                  <p v-else class="name sb-deepseek-title">
                    <i v-if="item.pinned" class="fas fa-thumbtack sb-pin-icon"></i>
                    {{ item.title }}
                  </p>
                </div>
                <button
                  type="button"
                  class="sb-row-more"
                  :class="menuItem?.id === item.id ? 'sb-row-more--on' : ''"
                  title="更多操作"
                  aria-label="更多操作"
                  @click.stop="openRowMenu($event, item)"
                >
                  <i class="fas fa-ellipsis"></i>
                </button>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="sb-deepseek-empty">暂无 DeepSeek 对话</p>
      </div>
    </div>

    <!-- 行内操作菜单：置顶 / 重命名 -->
    <Teleport to="body">
      <div
        v-if="menuConversation"
        class="sb-row-menu"
        :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }"
        @click.stop
      >
        <button type="button" class="sb-row-menu-item" @click="handlePin">
          <i class="fas fa-thumbtack"></i>
          <span>{{ menuConversation.pinned ? '取消置顶' : '置顶' }}</span>
        </button>
        <button type="button" class="sb-row-menu-item" @click="handleRename">
          <i class="fas fa-pen"></i>
          <span>重命名</span>
        </button>
        <div class="sb-row-menu-divider"></div>
        <button
          type="button"
          class="sb-row-menu-item sb-row-menu-item--danger"
          @click="handleRemove"
        >
          <i class="fas fa-trash-can"></i>
          <span>删除</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.pixel-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 30;
  width: var(--sidebar-w);
  max-width: var(--sidebar-w);
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 16px 12px 12px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 2px 0 8px rgba(16, 24, 40, 0.03);
  box-sizing: border-box;
}

.pixel-sidebar-head {
  padding: 0 0 10px;
}

.pixel-icon-tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--text-3);
  cursor: pointer;
  transition:
    background-color 0.18s var(--ease),
    color 0.18s var(--ease);

  i {
    font-size: 16px;
    color: inherit;
  }

  &:hover {
    background: var(--accent-soft);
    color: var(--accent);
  }

  &:active {
    background: var(--surface-3);
  }
}

.pixel-icon-accent {
  color: var(--text-3);
}

.pixel-sidebar-head .grid {
  margin-bottom: 18px;
}

.sb-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.18s var(--ease),
    color 0.18s var(--ease);

  & + & {
    margin-top: 4px;
  }

  .sb-btn-text {
    color: inherit;
  }

  .sb-btn-icon {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text-2);
    font-size: 12px;
    transition:
      background-color 0.18s var(--ease),
      color 0.18s var(--ease);
  }

  &:hover {
    background: var(--surface-hover);
    color: var(--text);

    .sb-btn-icon {
      background: var(--surface-3);
    }
  }

  &:active {
    background: var(--surface-3);
  }

  &--quest {
    background: var(--accent);
    color: #fff;

    .sb-btn-icon {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
    }

    &:hover {
      background: var(--accent-hover);
      color: #fff;

      .sb-btn-icon {
        background: rgba(255, 255, 255, 0.24);
      }
    }

    &:active {
      background: var(--accent-active);
    }
  }

  &--guild {
    .sb-btn-icon {
      background: var(--info-soft);
      color: var(--info);
    }
  }

  &--adventure {
    .sb-btn-icon {
      background: var(--warning-soft);
      color: var(--warning);
    }
  }
}

.sb-section-label {
  margin: 16px 4px 8px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.4px;
}

.sb-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 4px 8px;
}

.sb-section-label--inline {
  margin: 0;
}

.sb-section-add {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-3);
  font-size: 11px;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);

  &:hover {
    background: var(--accent-soft);
    color: var(--accent);
  }
}

.sb-deepseek {
  margin-top: 10px;
  border-top: 1px solid var(--border);
}

.sb-group-label {
  margin: 10px 6px 4px;
  color: var(--text-3);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.sb-group-item {
  padding: 0 4px;
}

.sb-deepseek-icon {
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-2);
  color: var(--accent);
  font-size: 12px;
}

.sb-deepseek-title {
  margin-bottom: 0 !important;
}

.sb-deepseek-item {
  position: relative;
  padding-right: 30px;
}

.sb-pin-icon {
  margin-right: 3px;
  color: var(--accent);
  font-size: 10px;
}

/* 悬停时在行最右侧显示三点按钮 */
.sb-row-more {
  position: absolute;
  top: 50%;
  right: 4px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transform: translateY(-50%);
  transition:
    opacity 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);

  &:hover {
    background: var(--surface-3);
    color: var(--text);
  }
}

.sb-deepseek-item:hover .sb-row-more,
.pixel-list-item--active .sb-row-more,
.sb-row-more--on {
  opacity: 1;
}

@media (hover: none) {
  .sb-row-more {
    opacity: 1;
  }
}

.sb-rename-input {
  width: 100%;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  line-height: 22px;
  outline: none;
  box-shadow: 0 0 0 2px var(--accent-ring);
}

.sb-row-menu {
  position: fixed;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 128px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.sb-row-menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.14s var(--ease),
    color 0.14s var(--ease);

  i {
    width: 12px;
    color: var(--text-3);
    font-size: 11px;
    transition: color 0.14s var(--ease);
  }

  &:hover {
    background: var(--accent-soft);
    color: var(--accent);

    i {
      color: var(--accent);
    }
  }

  &--danger {
    color: var(--danger);

    i {
      color: var(--danger);
    }

    &:hover {
      background: var(--danger-soft);
      color: var(--danger);

      i {
        color: var(--danger);
      }
    }
  }
}

.sb-row-menu-divider {
  height: 1px;
  margin: 0 4px;
  background: var(--border);
}

.sb-deepseek-empty {
  margin: 4px 6px 10px;
  color: var(--text-3);
  font-size: 11px;
}

.new-dialogue {
  flex: 1;
  overflow-y: auto;
  margin: 0 -4px;
  padding: 0 4px 4px;
}

.pixel-list-item {
  display: flex;
  align-items: center;
  padding: 9px 8px;
  margin-bottom: 2px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text);
  user-select: none;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);

  &:hover {
    background: var(--surface-hover);
  }

  &:active {
    background: var(--surface-3);
  }
}

.pixel-list-item--active {
  background: var(--accent-soft);
  border-color: var(--accent-ring);

  &:hover {
    background: var(--accent-soft);
  }
}

.pixel-list-text {
  color: var(--text);
}

.list-icon {
  position: relative;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  margin-left: 2px;
}

.header .profile {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-2);
}

.header-right {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
}

.header-right .name {
  margin: 0 0 2px;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right .restrict {
  margin: 0;
  width: 100%;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skeleton-list-item {
  cursor: default;

  &:hover {
    background: transparent;
  }
}
</style>
