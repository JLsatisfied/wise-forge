<script setup lang="ts">
import { ref } from 'vue'
import { aiModelsObject } from '@/utils/types/ai'

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
  </nav>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

.pixel-nav {
  margin: 12px 16px 0;
  background: $pixel-dialog-bg;
  border: 2px solid $pixel-border;
  box-shadow:
    0 0 30px rgba($neon-cyan, 0.15),
    0 0 60px rgba($neon-magenta, 0.1);
  max-width: calc(100% - 32px);
  box-sizing: border-box;
}

.pixel-title {
  font-family: myFirstFont, "VT323", ui-monospace, monospace;
  font-weight: normal;
  color: #fff;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 10px $neon-cyan,
    0 0 20px $neon-cyan;
}

.pixel-nav-user {
  color: $pixel-text;
  font-weight: 600;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pixel-user-trigger {
  border: 2px solid transparent;
  clip-path: polygon(
    0 4px, 4px 4px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
  );
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.1);
    border-color: rgba($neon-cyan, 0.4);
    box-shadow: 0 0 10px rgba($neon-cyan, 0.2);
  }

  &:active {
    transform: translate(1px, 2px);
    background: rgba($neon-cyan, 0.15);
    box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.2);
  }
}

.pixel-chip {
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

  @include pixel-press-btn;
}

.pixel-chip-label {
  color: $pixel-text;
  font-weight: 600;
}

.pixel-dropdown {
  background: $pixel-dialog-bg;
  border: 2px solid $pixel-border;
  box-shadow:
    0 0 30px rgba($neon-cyan, 0.3),
    0 0 60px rgba($neon-magenta, 0.2),
    0 10px 40px rgba(0, 0, 0, 0.6);
  padding: 4px 0;
  z-index: 100;
}

.pixel-dropdown-divider {
  border-color: rgba($neon-cyan, 0.15);
}

.pixel-dropdown-item {
  color: $pixel-text;
  background: transparent;
  border: none;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    filter 0.07s ease-out,
    background 0.12s ease;

  &:hover {
    background: rgba($neon-cyan, 0.15);
  }

  &:active {
    transform: translate(1px, 2px);

    @include pixel-press-shadow;

    filter: brightness(0.94);
  }
}

.pixel-dropdown-item--on {
  background: rgba($neon-cyan, 0.22);
  font-weight: 600;
  color: $neon-cyan-light;
}

.pixel-menu-link {
  color: $pixel-text;
  text-decoration: none;
  transition:
    transform 0.07s ease-out,
    box-shadow 0.07s ease-out,
    background 0.15s ease;

  &:hover {
    background: rgba($neon-cyan, 0.12);
  }

  &:active {
    transform: translate(1px, 2px);

    @include pixel-press-shadow;

    background: rgba($neon-cyan, 0.18);
  }
}

.pixel-menu-danger {
  color: #c97b7b;
}

.pixel-hr {
  border: none;
  border-top: 2px dashed rgba($neon-cyan, 0.15);
}

.pixel-avatar {
  border: 2px solid $neon-cyan;
  box-shadow: 0 0 10px rgba($neon-cyan, 0.4), 0 0 20px rgba($neon-cyan, 0.2);
  clip-path: polygon(
    0 4px, 4px 4px, 4px 0,
    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
  );
}
</style>
