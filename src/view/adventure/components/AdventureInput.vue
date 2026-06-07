<script setup lang="ts">
defineOptions({ name: 'AdventureInput' })

defineProps<{
  isAnswering: boolean
}>()

const emit = defineEmits<{
  action: [action: string]
}>()

const actions = [
  { key: 'attack', icon: '⚔️', label: '攻击', hotkey: '1' },
  { key: 'talk', icon: '💬', label: '交谈', hotkey: '2' },
  { key: 'investigate', icon: '🔍', label: '调查', hotkey: '3' },
  { key: 'inventory', icon: '🎒', label: '背包', hotkey: '4' },
  { key: 'move', icon: '🏃', label: '移动', hotkey: '5' }
]
</script>

<template>
  <div class="action-bar">
    <div class="action-label-row">
      <span class="action-section-icon">▸</span>
      <span class="action-section-text">快捷行动</span>
    </div>
    <div class="action-btn-row">
      <button
        v-for="act in actions"
        :key="act.key"
        class="action-btn"
        :data-action="act.key"
        :disabled="isAnswering"
        @click="emit('action', act.key)"
      >
        <span class="action-btn-icon">{{ act.icon }}</span>
        <span class="action-btn-label">{{ act.label }}</span>
        <span class="action-btn-hotkey">{{ act.hotkey }}</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

/* ==================== 容器 ==================== */
.action-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0 16px;
  max-width: 800px;
  margin: 0 auto;
}

.action-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.action-section-icon {
  font-size: 10px;
  color: rgba($neon-cyan, 0.4);
}

.action-section-text {
  font-size: 12px;
  color: rgba($pixel-text-muted, 0.5);
  letter-spacing: 3px;
  font-weight: 600;
  text-transform: uppercase;
}

/* ==================== 按钮 ==================== */
.action-btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: linear-gradient(180deg, rgba($neon-cyan, 0.06) 0%, rgba($neon-cyan, 0.02) 100%);
  border: 1px solid rgba($neon-cyan, 0.15);
  color: rgba($pixel-text, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
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
  overflow: hidden;

  /* 底部光条 */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 4px;
    right: 4px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba($neon-cyan, 0.2), transparent);
    transition: all 0.18s ease;
    opacity: 0;
  }

  &:hover:not(:disabled) {
    background: rgba($neon-cyan, 0.12);
    border-color: rgba($neon-cyan, 0.35);
    color: #fff;
    transform: translateY(-2px);
    box-shadow:
      0 4px 20px rgba($neon-cyan, 0.12),
      0 0 40px rgba($neon-cyan, 0.05);

    &::after {
      opacity: 1;
      background: linear-gradient(90deg, transparent, $neon-cyan, transparent);
    }

    .action-btn-hotkey {
      opacity: 0.6;
      transform: translateY(0);
    }

    /* 各按钮 hover 配色 */
    &[data-action='attack'] {
      border-color: rgba(#e8794b, 0.5);
      background: rgba(#e8794b, 0.1);
      box-shadow:
        0 4px 20px rgba(#e8794b, 0.12),
        0 0 40px rgba(#e8794b, 0.05);

      &::after {
        background: linear-gradient(90deg, transparent, #e8794b, transparent);
      }
    }

    &[data-action='talk'] {
      border-color: rgba(#5b9ad9, 0.5);
      background: rgba(#5b9ad9, 0.1);
      box-shadow:
        0 4px 20px rgba(#5b9ad9, 0.12),
        0 0 40px rgba(#5b9ad9, 0.05);

      &::after {
        background: linear-gradient(90deg, transparent, #5b9ad9, transparent);
      }
    }

    &[data-action='investigate'] {
      border-color: rgba($neon-magenta, 0.5);
      background: rgba($neon-magenta, 0.1);
      box-shadow:
        0 4px 20px rgba($neon-magenta, 0.12),
        0 0 40px rgba($neon-magenta, 0.05);

      &::after {
        background: linear-gradient(90deg, transparent, $neon-magenta, transparent);
      }
    }

    &[data-action='inventory'] {
      border-color: rgba(#4db87f, 0.5);
      background: rgba(#4db87f, 0.1);
      box-shadow:
        0 4px 20px rgba(#4db87f, 0.12),
        0 0 40px rgba(#4db87f, 0.05);

      &::after {
        background: linear-gradient(90deg, transparent, #4db87f, transparent);
      }
    }

    &[data-action='move'] {
      border-color: rgba($neon-purple, 0.5);
      background: rgba($neon-purple, 0.1);
      box-shadow:
        0 4px 20px rgba($neon-purple, 0.12),
        0 0 40px rgba($neon-purple, 0.05);

      &::after {
        background: linear-gradient(90deg, transparent, $neon-purple, transparent);
      }
    }
  }

  &:active:not(:disabled) {
    transform: translate(1px, 2px);
    filter: brightness(0.9);
    transition: all 0.05s ease;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    filter: grayscale(0.4);
  }
}

.action-btn-icon {
  font-size: 16px;
  line-height: 1;
  transition: transform 0.18s ease;

  .action-btn:hover:not(:disabled) & {
    transform: scale(1.15);
  }
}

.action-btn-label {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 1px;
}

.action-btn-hotkey {
  font-size: 10px;
  color: rgba($pixel-text-muted, 0.3);
  padding: 1px 5px;
  border: 1px solid rgba($pixel-text-muted, 0.15);
  font-weight: 600;
  transition: all 0.18s ease;
  transform: translateY(0);
}
</style>
