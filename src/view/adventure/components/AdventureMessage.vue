<script setup lang="ts">
import type { AdventureMessage } from '../composables/useAdventureState'

defineOptions({ name: 'AdventureMessage' })

defineProps<{
  message: AdventureMessage
}>()
</script>

<template>
  <!-- 旁白（AI 叙事） -->
  <div v-if="message.type === 'narration'" class="msg-narration">
    <div class="narration-avatar">
      <div class="narration-avatar-ring"></div>
      <i class="fas fa-crown narration-avatar-icon"></i>
    </div>
    <div class="narration-body">
      <div class="narration-speaker">
        <span class="speaker-name">命运织者</span>
        <span class="speaker-role">DM</span>
      </div>
      <div class="narration-content" v-html="message.content"></div>
      <div class="narration-tail">
        <span class="tail-line"></span>
        <span class="tail-dot"></span>
      </div>
    </div>
  </div>

  <!-- 玩家动作 -->
  <div v-else-if="message.type === 'player_action'" class="msg-action">
    <div class="action-body">
      <div class="action-roll" v-if="message.roll">
        <div class="roll-die" :class="message.roll >= 10 ? 'roll-success' : 'roll-fail'">
          <span class="roll-number">{{ message.roll }}</span>
          <span class="roll-max">/20</span>
        </div>
        <span class="roll-result" :class="message.roll >= 10 ? 'text-success' : 'text-fail'">
          {{ message.roll >= 10 ? '✦ 成功' : '✧ 失败' }}
        </span>
      </div>
      <div class="action-content">
        <span class="action-arrow">▸</span>
        <span class="action-text">{{ message.content }}</span>
      </div>
    </div>
  </div>

  <!-- 系统消息 -->
  <div v-else-if="message.type === 'system'" class="msg-system">
    <div class="system-dots">
      <span class="sys-dot"></span>
      <span class="sys-dot d2"></span>
      <span class="sys-dot d3"></span>
    </div>
    <span class="system-text">
      <i class="fas fa-feather-alt"></i>
      {{ message.content }}
    </span>
    <div class="system-dots">
      <span class="sys-dot d3"></span>
      <span class="sys-dot d2"></span>
      <span class="sys-dot"></span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

/* ==================== 旁白 ==================== */
.msg-narration {
  display: flex;
  gap: 14px;
  margin-bottom: 24px;
  animation: narration-enter 0.5s ease;
}

@keyframes narration-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.narration-avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.narration-avatar-ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba($neon-cyan, 0.3);
  animation: ring-spin 8s linear infinite;
  clip-path: polygon(
    0 5px,
    5px 5px,
    5px 0,
    calc(100% - 5px) 0,
    calc(100% - 5px) 5px,
    100% 5px,
    100% calc(100% - 5px),
    calc(100% - 5px) calc(100% - 5px),
    calc(100% - 5px) 100%,
    5px 100%,
    5px calc(100% - 5px),
    0 calc(100% - 5px)
  );
}

@keyframes ring-spin {
  0% {
    border-color: rgba($neon-cyan, 0.3);
  }

  50% {
    border-color: rgba($neon-magenta, 0.2);
  }

  100% {
    border-color: rgba($neon-cyan, 0.3);
  }
}

.narration-avatar-icon {
  font-size: 18px;
  color: $neon-cyan-light;
  filter: drop-shadow(0 0 8px rgba($neon-cyan, 0.6));
  z-index: 1;
}

.narration-body {
  flex: 1;
  min-width: 0;
}

.narration-speaker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  padding-left: 2px;
}

.speaker-name {
  font-size: 13px;
  font-weight: 600;
  color: $neon-cyan-light;
  text-shadow: 0 0 6px rgba($neon-cyan, 0.3);
  letter-spacing: 1px;
}

.speaker-role {
  font-size: 10px;
  color: rgba($pixel-text-muted, 0.4);
  padding: 1px 6px;
  border: 1px solid rgba($pixel-text-muted, 0.15);
  letter-spacing: 1px;
  font-weight: 600;
}

.narration-content {
  padding: 16px 20px;
  background: linear-gradient(
    160deg,
    rgba($neon-cyan, 0.06) 0%,
    rgba($neon-cyan, 0.02) 40%,
    rgba($neon-magenta, 0.02) 100%
  );
  border: 1px solid rgba($neon-cyan, 0.12);
  border-left: 2px solid rgba($neon-cyan, 0.25);
  color: $pixel-text;
  font-size: 14px;
  line-height: 1.85;
  position: relative;
  box-shadow:
    0 2px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.02);

  /* 引用角标 */
  &::before {
    content: '"';
    position: absolute;
    top: -4px;
    left: 10px;
    font-size: 36px;
    color: rgba($neon-cyan, 0.1);
    font-family: Georgia, serif;
    line-height: 1;
  }

  :deep(p) {
    margin: 0.5em 0;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(strong) {
    color: $neon-magenta-light;
    text-shadow: 0 0 6px rgba($neon-magenta, 0.2);
    font-weight: 600;
  }

  :deep(em) {
    color: $neon-cyan-light;
  }
}

.narration-tail {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0 0 2px;
  opacity: 0;
  animation: tail-appear 0.5s 0.3s ease forwards;
}

@keyframes tail-appear {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.tail-line {
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, rgba($neon-cyan, 0.2), transparent);
}

.tail-dot {
  width: 3px;
  height: 3px;
  background: rgba($neon-cyan, 0.15);
  transform: rotate(45deg);
}

/* ==================== 玩家动作 ==================== */
.msg-action {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
  animation: action-enter 0.35s ease;
}

@keyframes action-enter {
  from {
    opacity: 0;
    transform: translateX(16px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.action-body {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 85%;
}

.action-roll {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.roll-die {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: die-toss 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  clip-path: polygon(
    0 5px,
    5px 5px,
    5px 0,
    calc(100% - 5px) 0,
    calc(100% - 5px) 5px,
    100% 5px,
    100% calc(100% - 5px),
    calc(100% - 5px) calc(100% - 5px),
    calc(100% - 5px) 100%,
    5px 100%,
    5px calc(100% - 5px),
    0 calc(100% - 5px)
  );

  &.roll-success {
    background: rgba($neon-cyan, 0.15);
    border: 2px solid rgba($neon-cyan, 0.4);
    box-shadow:
      0 0 12px rgba($neon-cyan, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  &.roll-fail {
    background: rgba(#c97b7b, 0.1);
    border: 2px solid rgba(#c97b7b, 0.3);
    box-shadow:
      0 0 8px rgba(#c97b7b, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }
}

@keyframes die-toss {
  0% {
    transform: rotate(-15deg) scale(0.6);
    opacity: 0;
  }

  50% {
    transform: rotate(8deg) scale(1.08);
  }

  100% {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
}

.roll-number {
  font-family: 'VT323', monospace;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;

  .roll-success & {
    color: $neon-cyan-light;
    text-shadow: 0 0 12px rgba($neon-cyan, 0.5);
  }

  .roll-fail & {
    color: #c97b7b;
    text-shadow: 0 0 8px rgba(#c97b7b, 0.4);
  }
}

.roll-max {
  font-size: 9px;
  color: rgba($pixel-text-muted, 0.3);
  position: absolute;
  right: 4px;
  bottom: 2px;
}

.roll-result {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;

  &.text-success {
    color: $neon-cyan;
    text-shadow: 0 0 4px rgba($neon-cyan, 0.3);
  }

  &.text-fail {
    color: #c97b7b;
    text-shadow: 0 0 4px rgba(#c97b7b, 0.2);
  }
}

.action-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  background: linear-gradient(135deg, rgba($neon-purple, 0.25), rgba($neon-purple, 0.1));
  border: 1px solid rgba($neon-purple, 0.3);
  border-right: 2px solid rgba($neon-purple, 0.4);
  box-shadow:
    0 2px 15px rgba($neon-purple, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.action-arrow {
  font-size: 12px;
  color: $neon-purple;
  flex-shrink: 0;
}

.action-text {
  font-size: 14px;
  color: rgba(#fff, 0.85);
  line-height: 1.5;
}

/* ==================== 系统消息 ==================== */
.msg-system {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 16px;
  margin-bottom: 16px;
  animation: system-enter 0.6s ease;
}

@keyframes system-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.system-dots {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sys-dot {
  width: 4px;
  height: 4px;
  background: rgba($neon-magenta, 0.3);
  transform: rotate(45deg);
  animation: sys-dot-pulse 2s ease-in-out infinite;

  &.d2 {
    animation-delay: 0.15s;
    width: 3px;
    height: 3px;
  }

  &.d3 {
    animation-delay: 0.3s;
    width: 2px;
    height: 2px;
  }
}

@keyframes sys-dot-pulse {
  0%,
  100% {
    opacity: 0.3;
  }

  50% {
    opacity: 0.8;
    background: $neon-magenta;
  }
}

.system-text {
  font-size: 13px;
  color: rgba($neon-magenta, 0.7);
  text-shadow: 0 0 8px rgba($neon-magenta, 0.2);
  letter-spacing: 2px;
  white-space: nowrap;

  i {
    font-size: 10px;
    margin-right: 6px;
    animation: feather-float 2s ease-in-out infinite;
  }
}

@keyframes feather-float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.6;
  }

  50% {
    transform: translateY(-3px) rotate(-8deg);
    opacity: 1;
  }
}
</style>
