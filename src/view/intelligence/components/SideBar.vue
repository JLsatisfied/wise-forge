<script setup lang="ts">
import ContextMenu from '@/components/ContextMenu.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { categories, menuObject } from '@/utils/types/ai'
import { useRouter } from 'vue-router'

defineOptions({ name: 'SideBar' })

defineProps<{
  isLoadingCategories: boolean
  categoryData: categories[]
  currentIndex: number
}>()

const emit = defineEmits<{
  'add-classify': []
  'select-message': [item: categories]
  'remove-classify': [item: menuObject]
  'go-customer-service': []
}>()

const router = useRouter()
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
    </div>
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
