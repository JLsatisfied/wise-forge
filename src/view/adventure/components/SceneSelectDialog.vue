<script setup lang="ts">
import { ref } from 'vue'
import type { AdventureScene } from '../data/adventureScenes'

defineOptions({ name: 'SceneSelectDialog' })

const props = defineProps<{
  visible: boolean
  scenes: AdventureScene[]
  defaultName: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [scene: AdventureScene, playerName: string]
  back: []
}>()

const selectedId = ref<string | null>(null)

const startAdventure = () => {
  if (!selectedId.value) return
  const scene = props.scenes.find(s => s.id === selectedId.value)
  if (scene) {
    emit('select', scene, props.defaultName)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click.self="() => {}">
        <div class="dialog-frame">
          <!-- 返回 -->
          <button class="back-btn" @click="emit('back')">
            <i class="fas fa-times"></i>
          </button>

          <!-- 标题区 -->
          <div class="title-section">
            <div class="title-bar">
              <span class="title-bar-edge"></span>
              <span class="title-bar-glow"></span>
              <span class="title-bar-edge"></span>
            </div>
            <h2 class="title">选择你的冒险</h2>
            <p class="subtitle">—— 世界「艾瑟兰」在等待一位英雄 ——</p>
          </div>

          <!-- 冒险者 -->
          <div class="hero-row">
            <span class="hero-name">
              <span class="hero-label">冒险者</span>
              <span class="hero-divider">✦</span>
              <span class="hero-value">{{ defaultName }}</span>
            </span>
          </div>

          <!-- 场景列表 -->
          <div class="scene-list">
            <div
              v-for="scene in scenes"
              :key="scene.id"
              class="scene-card"
              :class="{
                'is-active': selectedId === scene.id,
                'is-dragon': scene.id === 'dragon_peak',
                'is-forest': scene.id === 'whisper_forest',
                'is-ruins': scene.id === 'sunken_ruins'
              }"
              @click="selectedId = scene.id"
            >
              <div class="card-icon-wrap">
                <i v-if="scene.id === 'dragon_peak'" class="fas fa-dragon"></i>
                <i v-else-if="scene.id === 'whisper_forest'" class="fas fa-spa"></i>
                <i v-else class="fas fa-landmark"></i>
              </div>
              <div class="card-body">
                <div class="card-top">
                  <span class="card-name">{{ scene.name }}</span>
                  <span class="card-diff">{{ scene.difficulty }}</span>
                </div>
                <span class="card-sub">{{ scene.subtitle }}</span>
                <p class="card-desc">{{ scene.description }}</p>
              </div>
            </div>
          </div>

          <!-- 开始 -->
          <button
            class="start-btn"
            :class="{ 'is-ready': selectedId }"
            :disabled="!selectedId"
            @click="startAdventure"
          >
            <i class="fas fa-play"></i>
            <span>开始冒险</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
/* ===== 遮罩 ===== */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 18, 25, 0.45);
  backdrop-filter: blur(4px);
}

/* ===== 主框架 ===== */
.dialog-frame {
  position: relative;
  width: min(600px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: 30px 28px 26px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: var(--border-strong);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

/* ===== 返回 ===== */
.back-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-3);
  font-size: 13px;
  cursor: pointer;
  transition:
    background-color 0.15s var(--ease),
    color 0.15s var(--ease);

  &:hover {
    background: var(--surface-2);
    color: var(--text);
  }
}

/* ===== 标题 ===== */
.title-section {
  margin-bottom: 18px;
  text-align: center;
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.title-bar-edge {
  width: 32px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-strong));

  &:last-child {
    background: linear-gradient(90deg, var(--border-strong), transparent);
  }
}

.title-bar-glow {
  width: 44px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--info));
}

.title {
  margin: 0 0 6px;
  color: var(--text);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 1px;
}

.subtitle {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

/* ===== 冒险者 ===== */
.hero-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.hero-name {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
}

.hero-label {
  color: var(--text-3);
  font-size: 12px;
}

.hero-divider {
  color: var(--border-strong);
  font-size: 7px;
}

.hero-value {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

/* ===== 场景卡片 ===== */
.scene-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.scene-card {
  --scene-color: var(--accent);

  position: relative;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    box-shadow 0.16s var(--ease);

  &.is-dragon {
    --scene-color: #e2673f;
  }

  &.is-forest {
    --scene-color: #16a34a;
  }

  &.is-ruins {
    --scene-color: #2563eb;
  }

  &:hover {
    border-color: var(--border-strong);
    background: var(--surface-2);
  }

  &.is-active {
    border-color: var(--scene-color);
    background: var(--surface);
    box-shadow: 0 0 0 3px var(--accent-ring);
  }
}

.card-icon-wrap {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--scene-color);
  font-size: 16px;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 2px;
}

.card-name {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.card-diff {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-3);
  font-size: 11px;
}

.card-sub {
  display: block;
  margin-bottom: 4px;
  color: var(--text-2);
  font-size: 12px;
}

.card-desc {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ===== 开始按钮 ===== */
.start-btn {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-3);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1px;
  cursor: not-allowed;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);

  &.is-ready {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;

    &:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }
  }
}

/* ===== 过渡 ===== */
.dialog-fade-enter-active {
  transition: opacity 0.2s var(--ease);

  .dialog-frame {
    transition:
      transform 0.2s var(--ease),
      opacity 0.2s var(--ease);
  }
}

.dialog-fade-leave-active {
  transition: opacity 0.15s var(--ease);

  .dialog-frame {
    transition:
      transform 0.15s var(--ease),
      opacity 0.15s var(--ease);
  }
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;

  .dialog-frame {
    transform: scale(0.97);
    opacity: 0;
  }
}

@media (width <= 520px) {
  .dialog-frame {
    padding: 26px 16px 20px;
  }

  .title {
    font-size: 19px;
  }
}
</style>
