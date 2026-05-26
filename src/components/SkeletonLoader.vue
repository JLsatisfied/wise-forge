<script setup lang="ts">
defineProps<{
  width?: string
  height?: string
  rounded?: string
  variant?: 'text' | 'avatar' | 'card' | 'bubble' | 'list-item'
  animate?: boolean
}>()
</script>

<template>
  <div
    class="pixel-skeleton"
    :class="[`pixel-skeleton--${variant || 'text'}`, { 'pixel-skeleton--animate': animate !== false }]"
    :style="{
      width: width || '100%',
      height: height || '1rem',
      borderRadius: rounded || undefined,
    }"
  >
    <div class="pixel-skeleton__shimmer"></div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

.pixel-skeleton {
  position: relative;
  overflow: hidden;
  background: rgba($neon-cyan, 0.06);
  border: 1px solid rgba($neon-cyan, 0.12);
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.3);

  &__shimmer {
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      105deg,
      transparent 0%,
      transparent 35%,
      rgba($neon-cyan, 0.08) 40%,
      rgba($neon-magenta, 0.06) 48%,
      rgba($neon-cyan, 0.08) 56%,
      transparent 60%,
      transparent 100%
    );
  }

  &--animate &__shimmer {
    animation: shimmer-slide 2s ease-in-out infinite;
  }

  // 变体样式
  &--text {
    height: 1rem;
    clip-path: polygon(
      0 2px, 2px 2px, 2px 0,
      calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px,
      100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%,
      2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px)
    );
  }

  &--avatar {
    border-radius: 0;
    clip-path: polygon(
      0 4px, 4px 4px, 4px 0,
      calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
      100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
      4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
    );
  }

  &--card {
    height: 120px;
    clip-path: polygon(
      0 6px, 6px 6px, 6px 0,
      calc(100% - 6px) 0, calc(100% - 6px) 6px, 100% 6px,
      100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
      6px 100%, 6px calc(100% - 6px), 0 calc(100% - 6px)
    );
  }

  &--bubble {
    height: 3.5rem;
    border-radius: 0;
    clip-path: polygon(
      0 4px, 4px 4px, 4px 0,
      calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
      100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
      4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
    );
  }

  &--list-item {
    height: 56px;
    clip-path: polygon(
      0 4px, 4px 4px, 4px 0,
      calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
      100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
      4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
    );
  }
}

@keyframes shimmer-slide {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}
</style>
