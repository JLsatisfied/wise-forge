<script setup lang="ts">
import { ref } from 'vue'
import { aiModelsObject } from '@/utils/types/ai'
import ThemeToggle from '@/components/ThemeToggle.vue'

defineOptions({ name: 'NavBar' })

defineProps<{
  revealName: string
  nickImg: string
  nickname: string
  aiModels: aiModelsObject[]
  currentModel: string
}>()

const emit = defineEmits<{
  'switch-model': [modelId: string]
  'open-user-profile': []
  'out-login': []
}>()

const showModelMenu = ref(false)
const showUserMenu = ref(false)
</script>

<template>
  <nav class="pixel-nav px-6 py-3 flex justify-between items-center gap-3">
    <div class="flex items-center gap-4 min-w-0 flex-1">
      <div class="flex items-center gap-2 min-w-0">
        <i class="fas fa-robot text-2xl pixel-icon-accent shrink-0"></i>
        <h1 class="pixel-title text-xl font-bold truncate min-w-0">
          {{ revealName }}</h1>
      </div>
      <div class="relative group">
        <button @click="showModelMenu = !showModelMenu"
          class="pixel-chip flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap cursor-pointer">
          <i class="fas fa-microchip pixel-icon-accent mr-1"></i>
          <span class="pixel-chip-label">{{ aiModels.find(m => m.id === currentModel)!.name }}</span>
          <i class="fas fa-chevron-down pixel-text-muted text-sm"></i>
        </button>
        <div v-if="showModelMenu"
          class="pixel-dropdown absolute left-0 mt-2 w-52 py-2 z-10">
          <div class="px-4 py-2 text-xs pixel-text-muted border-b pixel-dropdown-divider">选择不同的 AI 模型来应对不同场景</div>
          <button v-for="model in aiModels" :key="model.id" @click="emit('switch-model', model.id); showModelMenu = false"
            class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 cursor-pointer pixel-dropdown-item"
            :class="{ 'pixel-dropdown-item--on': currentModel === model.id }">
            <i class="fas fa-check text-xs" :class="{ 'opacity-0': currentModel !== model.id }"></i>
            {{ model.name }}
          </button>
        </div>
      </div>
    </div>
    <div class="pixel-nav-actions">
      <ThemeToggle />
      <div class="relative">
      <button @click="showUserMenu = !showUserMenu"
        class="pixel-user-trigger flex items-center gap-2 px-3 py-2 cursor-pointer">
        <img :src="nickImg" class="w-8 h-8 object-cover pixel-avatar" alt="用户头像" />
        <span class="pixel-nav-user">{{ nickname }}</span>
        <i class="fas fa-chevron-down pixel-text-muted text-sm"></i>
      </button>
      <div v-if="showUserMenu" class="pixel-dropdown pixel-user-menu absolute right-0 mt-2 w-48 py-2">
        <a href="#" class="block px-4 py-2 pixel-menu-link" @click.prevent="emit('open-user-profile'); showUserMenu = false">
          <i class="fas fa-user mr-2 pixel-text-muted"></i>冒险者档案
        </a>
        <hr class="my-2 pixel-hr" />
        <a @click="emit('out-login')" class="block px-4 py-2 pixel-menu-link pixel-menu-danger cursor-pointer">
          <i class="fas fa-sign-out-alt mr-2"></i>离开冒险
        </a>
      </div>
      </div>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.pixel-nav {
  position: relative;
  z-index: 5;
  flex-shrink: 0;
  height: 64px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
  box-sizing: border-box;
}

.pixel-title {
  color: var(--text);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.pixel-nav .fa-robot {
  color: var(--accent);
  font-size: 18px;
}

.pixel-nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.pixel-nav-user {
  max-width: 8rem;
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pixel-user-trigger {
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border);
  }

  &:active {
    background: var(--surface-3);
  }
}

.pixel-avatar {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 50%;
  object-fit: cover;
  background: var(--surface-2);
}

.pixel-chip {
  height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);

  i {
    font-size: 11px;
  }

  &:hover {
    background: var(--surface-3);
    border-color: var(--border-strong);
  }
}

.pixel-chip-label {
  color: var(--text);
  font-weight: 500;
}

.pixel-icon-accent {
  color: var(--accent);
}

.pixel-text-muted {
  color: var(--text-3);
}

.pixel-dropdown {
  z-index: 100;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.pixel-dropdown-divider {
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.5;
}

.pixel-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.pixel-dropdown-item--on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;

  &:hover {
    background: var(--accent-soft);
    color: var(--accent);
  }
}

.pixel-menu-link {
  display: flex;
  align-items: center;
  padding: 9px 10px;
  border-radius: var(--radius-xs);
  color: var(--text-2);
  font-size: 13px;
  text-decoration: none;
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.pixel-menu-danger {
  color: var(--danger);

  &:hover {
    background: var(--danger-soft);
    color: var(--danger);
  }
}

.pixel-hr {
  margin: 6px 4px;
  border: none;
  border-top: 1px solid var(--border);
}

@media (width <= 640px) {
  .pixel-nav {
    padding: 0 12px;
  }

  .pixel-nav-user {
    display: none;
  }

  .pixel-title {
    font-size: 15px;
  }
}
</style>
