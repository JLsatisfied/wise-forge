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
    <div class="flex-1 overflow-y-auto space-y-2 new-dialogue px-2 pb-3">
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
@use '@/styles/pixel-theme' as *;

.pixel-sidebar {
  @include neon-pixel-panel;

  margin: 0;
  height: 100vh;
  width: $sidebar-w;
  max-width: $sidebar-w;
  box-sizing: border-box;
  border-radius: 0;
  border-top: none;
  border-bottom: none;
  border-left: none;
  background: rgba(13, 22, 36, 0.96);
  box-shadow:
    4px 0 30px rgba(0, 0, 0, 0.4),
    inset -3px 0 0 rgba($neon-cyan, 0.05);
  clip-path: none;
}

.pixel-sidebar-head {
  border-bottom: 2px dashed rgba($neon-cyan, 0.2);
}

.pixel-icon-tile {
  background: rgba($neon-cyan, 0.1);
  border: 2px solid $pixel-border;
  border-radius: 0;
  box-shadow:
    0 0 10px rgba($neon-cyan, 0.3),
    inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  transition:
    transform 0.1s ease,
    box-shadow 0.08s ease,
    filter 0.1s ease;
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

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.1);
    box-shadow: 0 0 15px rgba($neon-cyan, 0.5);
  }

  &:active {
    transform: translate(1px, 2px);
    filter: brightness(0.9);
    box-shadow:
      inset 2px 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      1px 1px 0 rgba(0, 0, 0, 0.2);
  }
}

.pixel-list-text {
  color: $pixel-text;
}

.pixel-list-item {
  border: 2px solid transparent;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.1);
    border-color: rgba($neon-cyan, 0.3);
    box-shadow: 0 0 10px rgba($neon-cyan, 0.15);
  }

  &:active {
    transform: translate(1px, 2px);
    background: rgba($neon-cyan, 0.15);
    box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.pixel-list-item--active {
  background: rgba($neon-cyan, 0.2);
  border-color: rgba($neon-cyan, 0.4);
  box-shadow: 0 0 15px rgba($neon-cyan, 0.25);
}

.new-dialogue::-webkit-scrollbar {
  width: 5px;
}

.new-dialogue::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 5px;
  transition: all 1s;
}

.new-dialogue:hover::-webkit-scrollbar-thumb {
  background-color: rgba($neon-cyan, 0.3);
}

.list-icon {
  position: relative;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.restrict {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 185px;
}

.header {
  font-size: 14px;
  color: $pixel-text;
  display: flex;
  align-items: center;
  padding-bottom: 14px;
  user-select: none;
}

.header .profile {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid $neon-cyan;
  box-shadow: 0 0 10px rgba($neon-cyan, 0.3);
}

.header.effect {
  padding-bottom: 0;
  padding: 10px 5px;
  transition: all 1s;
  margin-top: 20px;
}

.header.effect:first-child {
  margin-top: 0;
}

.header-right {
  margin-left: 10px;
}

/* ===== 侧边栏特色按钮 ===== */
.sb-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  color: $pixel-text;
  font-size: 14px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
  position: relative;

  & + & {
    margin-top: 10px;
  }

  .sb-btn-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all 0.18s ease;
    flex-shrink: 0;
  }

  .sb-btn-text {
    transition: all 0.18s ease;
  }

  &:hover {
    .sb-btn-icon {
      transform: scale(1.1);
    }
  }

  &:active {
    .sb-btn-icon {
      transform: scale(0.95);
    }
  }

  /* 开启冒险 - 青绿 */
  &--quest {
    background: linear-gradient(90deg, rgba($neon-cyan, 0.08), transparent);
    border-left: 2px solid rgba($neon-cyan, 0.3);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);

    .sb-btn-icon {
      background: rgba($neon-cyan, 0.12);
      border: 1px solid rgba($neon-cyan, 0.25);
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

    .sb-btn-icon i {
      color: $neon-cyan;
    }
    .sb-btn-text {
      color: $neon-cyan-light;
    }

    &:hover {
      background: linear-gradient(90deg, rgba($neon-cyan, 0.14), transparent);
      border-left-color: rgba($neon-cyan, 0.55);
      .sb-btn-icon {
        background: rgba($neon-cyan, 0.2);
        border-color: rgba($neon-cyan, 0.45);
      }
    }
  }

  /* 冒险者公会 - 紫色 */
  &--guild {
    background: linear-gradient(90deg, rgba($neon-purple, 0.08), transparent);
    border-left: 2px solid rgba($neon-purple, 0.3);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);

    .sb-btn-icon {
      background: rgba($neon-purple, 0.12);
      border: 1px solid rgba($neon-purple, 0.25);
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

    .sb-btn-icon i {
      color: $neon-purple;
    }
    .sb-btn-text {
      color: #b8c5e0;
    }

    &:hover {
      background: linear-gradient(90deg, rgba($neon-purple, 0.14), transparent);
      border-left-color: rgba($neon-purple, 0.55);
      .sb-btn-icon {
        background: rgba($neon-purple, 0.2);
        border-color: rgba($neon-purple, 0.45);
      }
    }
  }

  /* 冒险模式 - 金色 */
  &--adventure {
    background: linear-gradient(90deg, rgba($neon-magenta, 0.08), transparent);
    border-left: 2px solid rgba($neon-magenta, 0.3);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);

    .sb-btn-icon {
      background: rgba($neon-magenta, 0.12);
      border: 1px solid rgba($neon-magenta, 0.25);
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

    .sb-btn-icon i {
      color: $neon-magenta;
    }
    .sb-btn-text {
      color: #ffe0a0;
    }

    &:hover {
      background: linear-gradient(90deg, rgba($neon-magenta, 0.14), transparent);
      border-left-color: rgba($neon-magenta, 0.55);
      .sb-btn-icon {
        background: rgba($neon-magenta, 0.2);
        border-color: rgba($neon-magenta, 0.45);
      }
    }
  }
}
</style>
