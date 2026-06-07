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
              <div class="card-glow"></div>
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
            <i class="fas fa-swords"></i>
            <span>开始冒险</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

$dragon: #e8794b;
$forest: #4db87f;
$ruins: #5b9ad9;

/* ===== 遮罩 ===== */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 8, 16, 0.88);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/* ===== 主框架 ===== */
.dialog-frame {
  position: relative;
  width: min(600px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #0f1a2e 0%, #0a1220 100%);
  border: 1px solid rgba($neon-cyan, 0.15);
  padding: 32px 32px 28px;
  box-shadow:
    0 0 40px rgba($neon-cyan, 0.08),
    inset 0 0 80px rgba(0, 0, 0, 0.4);
  scrollbar-width: thin;
  scrollbar-color: rgba($neon-cyan, 0.15) transparent;

  &::-webkit-scrollbar {
    width: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba($neon-cyan, 0.2);
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

/* ===== 返回 ===== */
.back-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba($neon-cyan, 0.15);
  color: rgba($pixel-text-muted, 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;

  &:hover {
    color: $pixel-text;
    border-color: rgba($neon-cyan, 0.3);
    background: rgba($neon-cyan, 0.06);
  }
}

/* ===== 标题 ===== */
.title-section {
  text-align: center;
  margin-bottom: 20px;
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
  background: linear-gradient(90deg, transparent, rgba($neon-cyan, 0.3));

  &:last-child {
    background: linear-gradient(90deg, rgba($neon-cyan, 0.3), transparent);
  }
}

.title-bar-glow {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, $neon-cyan, $neon-magenta);
  box-shadow: 0 0 10px rgba($neon-cyan, 0.4);
}

.title {
  font-family: myFirstFont, 'VT323', monospace;
  font-size: 26px;
  color: #fff;
  margin: 0 0 6px;
  letter-spacing: 8px;
  font-weight: 400;
}

.subtitle {
  font-size: 13px;
  color: rgba($pixel-text-muted, 0.5);
  margin: 0;
  letter-spacing: 2px;
}

/* ===== 冒险者 ===== */
.hero-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 22px;
}

.hero-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-label {
  font-size: 13px;
  color: rgba($pixel-text-muted, 0.4);
  letter-spacing: 3px;
}

.hero-divider {
  font-size: 7px;
  color: rgba($neon-cyan, 0.2);
}

.hero-value {
  font-family: myFirstFont, 'VT323', monospace;
  font-size: 20px;
  color: $neon-cyan-light;
  letter-spacing: 6px;
  text-shadow: 0 0 20px rgba($neon-cyan, 0.3);
  font-weight: 400;
}

/* ===== 场景卡片 ===== */
.scene-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.scene-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba($neon-cyan, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba($neon-cyan, 0.18);
  }

  &.is-dragon:hover {
    border-color: rgba($dragon, 0.3);
  }
  &.is-forest:hover {
    border-color: rgba($forest, 0.3);
  }
  &.is-ruins:hover {
    border-color: rgba($ruins, 0.3);
  }

  &.is-active {
    border-color: rgba($neon-cyan, 0.25);

    &.is-dragon {
      border-color: rgba($dragon, 0.4);
    }
    &.is-forest {
      border-color: rgba($forest, 0.4);
    }
    &.is-ruins {
      border-color: rgba($ruins, 0.4);
    }

    &.is-dragon .card-glow {
      background: radial-gradient(ellipse at 0% 50%, rgba($dragon, 0.06), transparent 70%);
    }
    &.is-forest .card-glow {
      background: radial-gradient(ellipse at 0% 50%, rgba($forest, 0.06), transparent 70%);
    }
    &.is-ruins .card-glow {
      background: radial-gradient(ellipse at 0% 50%, rgba($ruins, 0.06), transparent 70%);
    }
  }
}

.card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card-icon-wrap {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 1px solid rgba($neon-cyan, 0.12);

  .is-dragon & {
    color: $dragon;
    border-color: rgba($dragon, 0.2);
  }
  .is-forest & {
    color: $forest;
    border-color: rgba($forest, 0.2);
  }
  .is-ruins & {
    color: $ruins;
    border-color: rgba($ruins, 0.2);
  }
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1px;
}

.card-name {
  font-size: 15px;
  font-weight: 600;
  color: $pixel-text;
}

.card-diff {
  font-size: 11px;
  color: rgba($pixel-text-muted, 0.6);
}

.card-sub {
  display: block;
  font-size: 12px;
  color: rgba($pixel-text-muted, 0.4);
  margin-bottom: 4px;
}

.card-desc {
  font-size: 13px;
  color: rgba($pixel-text, 0.45);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== 开始按钮 ===== */
.start-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba($neon-cyan, 0.12);
  color: rgba($pixel-text-muted, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 4px;

  &:disabled {
    cursor: not-allowed;
  }

  &.is-ready {
    color: $neon-cyan-light;
    border-color: rgba($neon-cyan, 0.2);
    background: rgba($neon-cyan, 0.04);

    &:hover {
      background: rgba($neon-cyan, 0.08);
      border-color: rgba($neon-cyan, 0.35);
      box-shadow: 0 0 20px rgba($neon-cyan, 0.08);
    }
  }
}

/* ===== 过渡 ===== */
.dialog-fade-enter-active {
  transition: opacity 0.25s ease;
  .dialog-frame {
    transition:
      transform 0.25s ease,
      opacity 0.25s ease;
  }
}

.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
  .dialog-frame {
    transition:
      transform 0.15s ease,
      opacity 0.15s ease;
  }
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
  .dialog-frame {
    transform: scale(0.96);
    opacity: 0;
  }
}
</style>
