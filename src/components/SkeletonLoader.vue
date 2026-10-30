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
.pixel-skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  background: var(--skeleton-bg);

  &__shimmer {
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent 0%,
      transparent 30%,
      var(--skeleton-shimmer) 50%,
      transparent 70%,
      transparent 100%
    );
  }

  &--animate &__shimmer {
    animation: shimmer-slide 1.6s var(--ease) infinite;
  }

  // 变体样式：圆角与页面列表/头像保持一致
  &--text {
    height: 1rem;
    border-radius: 4px;
  }

  &--avatar {
    border-radius: 9px;
  }

  &--card {
    height: 120px;
    border-radius: 12px;
  }

  &--bubble {
    height: 3.5rem;
    border-radius: 12px;
  }

  &--list-item {
    height: 56px;
    border-radius: 10px;
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
