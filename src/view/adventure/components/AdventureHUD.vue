<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerStats } from '../composables/useAdventureState'

defineOptions({ name: 'AdventureHUD' })

const props = defineProps<{
  player: PlayerStats
  playerName: string
  location: string
  inventory: string[]
}>()

const hpPercent = computed(() =>
  props.player.maxHp > 0 ? Math.max(0, (props.player.hp / props.player.maxHp) * 100) : 0
)
const mpPercent = computed(() =>
  props.player.maxMp > 0 ? Math.max(0, (props.player.mp / props.player.maxMp) * 100) : 0
)

// HP 低于 30% 时闪烁警告
const hpLow = computed(() => hpPercent.value < 30)

// 根据 HP 比例返回颜色
const hpBarColor = computed(() => {
  if (hpPercent.value < 30) return '#c97b7b' // 红色警告
  if (hpPercent.value < 60) return '#f3c766' // 黄色
  return '#7dd8c7' // 正常青色
})

// 背包物品分类图标
const itemCategory = (item: string): string => {
  if (/剑|斧|弓|矛|匕首|锤|刃|枪/.test(item)) return '⚔️'
  if (/盾|甲|铠|袍|盔|靴|手套|披风/.test(item)) return '🛡️'
  if (/药水|药剂|卷轴|符|书|魔/.test(item)) return '🧪'
  if (/面包|肉|干粮|果实|酒|水/.test(item)) return '🍞'
  if (/金|银|宝石|钻石|戒指|项链/.test(item)) return '💎'
  if (/钥匙|地图|罗盘|火把|绳|镐/.test(item)) return '🔧'
  return '📦'
}
</script>

<template>
  <aside class="hud">
    <!-- 顶部装饰线 -->
    <div class="hud-ornament">
      <span class="orn-line"></span>
      <span class="orn-gem">◆</span>
      <span class="orn-line"></span>
    </div>

    <!-- 角色头像区 -->
    <div class="hud-portrait">
      <div class="portrait-frame">
        <div class="portrait-bg">
          <i class="fas fa-user-astronaut portrait-icon"></i>
        </div>
        <div class="portrait-border-inner"></div>
      </div>
      <div class="portrait-info">
        <div class="portrait-name">{{ playerName }}</div>
        <div class="portrait-level">Lv.{{ player.level }}</div>
      </div>
    </div>

    <!-- 血条 & 蓝条 -->
    <div class="hud-bars">
      <!-- HP -->
      <div class="stat-row">
        <div class="stat-icon stat-icon--hp">♥</div>
        <div class="stat-bar-wrap">
          <div class="stat-bar-bg">
            <div
              class="stat-bar-fill stat-bar-fill--hp"
              :class="{ 'is-low': hpLow }"
              :style="{ width: hpPercent + '%', '--bar-color': hpBarColor }"
            ></div>
          </div>
          <span class="stat-bar-num"
            >{{ player.hp }}<span class="stat-bar-sep">/</span>{{ player.maxHp }}</span
          >
        </div>
      </div>

      <!-- MP -->
      <div class="stat-row">
        <div class="stat-icon stat-icon--mp">✦</div>
        <div class="stat-bar-wrap">
          <div class="stat-bar-bg">
            <div class="stat-bar-fill stat-bar-fill--mp" :style="{ width: mpPercent + '%' }"></div>
          </div>
          <span class="stat-bar-num"
            >{{ player.mp }}<span class="stat-bar-sep">/</span>{{ player.maxMp }}</span
          >
        </div>
      </div>
    </div>

    <!-- 金币 & 位置 -->
    <div class="hud-info">
      <div class="info-item info-gold">
        <span class="info-icon">🪙</span>
        <span class="info-value">{{ player.gold }}</span>
        <span class="info-suffix">G</span>
      </div>
      <div class="info-item info-location" v-if="location">
        <span class="info-icon">📍</span>
        <span class="info-value loc-text">{{ location }}</span>
      </div>
    </div>

    <!-- 分隔 -->
    <div class="hud-sep">
      <span class="sep-dot"></span>
      <span class="sep-line"></span>
      <span class="sep-dot"></span>
    </div>

    <!-- 背包 -->
    <div class="hud-bag">
      <div class="bag-header">
        <span class="bag-icon">🎒</span>
        <span class="bag-title">背包</span>
        <span class="bag-count">{{ inventory.length }}</span>
      </div>
      <div class="bag-list" v-if="inventory.length">
        <div
          v-for="(item, i) in inventory"
          :key="i"
          class="bag-item"
          :style="{ animationDelay: i * 0.05 + 's' }"
        >
          <span class="bag-item-icon">{{ itemCategory(item) }}</span>
          <span class="bag-item-name">{{ item }}</span>
        </div>
      </div>
      <div v-else class="bag-empty">— 空空如也 —</div>
    </div>

    <!-- 底部装饰 -->
    <div class="hud-footer">
      <span class="footer-text">✦ 冒险进行中 ✦</span>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
@use '@/styles/pixel-theme' as *;

/* ==================== 容器 ==================== */
.hud {
  width: 240px;
  height: 100vh;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 18px 16px 12px;
  background: linear-gradient(
    180deg,
    rgba(10, 20, 40, 0.98) 0%,
    rgba(13, 22, 36, 0.97) 30%,
    rgba(16, 28, 46, 0.96) 100%
  );
  border-right: 1px solid rgba($neon-cyan, 0.12);
  box-shadow:
    6px 0 40px rgba(0, 0, 0, 0.5),
    inset -1px 0 0 rgba($neon-cyan, 0.04);
  overflow-y: auto;
  overflow-x: hidden;
  gap: 0;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba($neon-cyan, 0.008) 3px,
      rgba($neon-cyan, 0.008) 4px
    );
    pointer-events: none;
    z-index: 0;
  }
}

/* ==================== 顶部装饰 ==================== */
.hud-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.orn-line {
  width: 50px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba($neon-cyan, 0.3), transparent);
}

.orn-gem {
  font-size: 8px;
  color: $neon-magenta;
  text-shadow: 0 0 8px rgba($neon-magenta, 0.6);
  animation: gem-pulse 2s ease-in-out infinite;
}

@keyframes gem-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
    filter: drop-shadow(0 0 6px $neon-magenta);
  }
}

/* ==================== 头像区 ==================== */
.hud-portrait {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  padding: 0 4px;
  position: relative;
  z-index: 1;
}

.portrait-frame {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.portrait-bg {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 30% 30%, rgba($neon-cyan, 0.12), transparent 70%),
    rgba(6, 14, 28, 0.9);
  border: 2px solid rgba($neon-cyan, 0.3);
  box-shadow:
    0 0 12px rgba($neon-cyan, 0.15),
    inset 0 0 12px rgba(0, 0, 0, 0.5);
  clip-path: polygon(
    0 6px,
    6px 6px,
    6px 0,
    calc(100% - 6px) 0,
    calc(100% - 6px) 6px,
    100% 6px,
    100% calc(100% - 6px),
    calc(100% - 6px) calc(100% - 6px),
    calc(100% - 6px) 100%,
    6px 100%,
    6px calc(100% - 6px),
    0 calc(100% - 6px)
  );
}

.portrait-icon {
  font-size: 28px;
  color: rgba($neon-cyan, 0.6);
  filter: drop-shadow(0 0 8px rgba($neon-cyan, 0.4));
}

.portrait-border-inner {
  position: absolute;
  inset: 4px;
  border: 1px solid rgba($neon-cyan, 0.08);
  pointer-events: none;
}

.portrait-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.portrait-name {
  font-family: myFirstFont, 'VT323', monospace;
  font-size: 18px;
  color: #fff;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba($neon-cyan, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.portrait-level {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: $neon-magenta;
  text-shadow: 0 0 8px rgba($neon-magenta, 0.4);
  width: fit-content;
  padding: 2px 10px;
  background: rgba($neon-magenta, 0.08);
  border: 1px solid rgba($neon-magenta, 0.2);
  letter-spacing: 2px;
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

/* ==================== 血条 & 蓝条 ==================== */
.hud-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  width: 22px;
  font-size: 14px;
  text-align: center;
  flex-shrink: 0;
  line-height: 1;

  &--hp {
    color: #c97b7b;
    text-shadow: 0 0 6px rgba(#c97b7b, 0.5);
    font-size: 16px;
    animation: heartbeat 1.2s ease-in-out infinite;
    animation-play-state: paused;

    .is-low ~ & {
      animation-play-state: running;
    }
  }

  &--mp {
    color: #6d7fb6;
    text-shadow: 0 0 6px rgba(#6d7fb6, 0.5);
    font-size: 12px;
  }
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  10% {
    transform: scale(1.15);
    opacity: 0.9;
  }
  20% {
    transform: scale(1);
    opacity: 1;
  }
}

.stat-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-bar-bg {
  height: 14px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba($neon-cyan, 0.1);
  position: relative;
  overflow: hidden;
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

.stat-bar-fill {
  height: 100%;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;

  &--hp {
    background: linear-gradient(
      90deg,
      rgba(var(--bar-color, #7dd8c7), 0.5),
      rgba(var(--bar-color, #7dd8c7), 0.85),
      rgba(var(--bar-color, #7dd8c7), 0.6)
    );
    box-shadow:
      0 0 6px rgba(var(--bar-color, #7dd8c7), 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);

    &.is-low {
      animation: hp-flash 0.8s ease-in-out infinite;
    }

    &::after {
      content: '';
      position: absolute;
      top: 1px;
      left: 2px;
      right: 2px;
      height: 40%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent);
      border-radius: 1px;
    }
  }

  &--mp {
    background: linear-gradient(90deg, rgba(#6d7fb6, 0.5), rgba(#6d7fb6, 0.85), rgba(#b5a8e0, 0.6));
    box-shadow:
      0 0 6px rgba(#6d7fb6, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);

    &::after {
      content: '';
      position: absolute;
      top: 1px;
      left: 2px;
      right: 2px;
      height: 40%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.15), transparent);
      border-radius: 1px;
    }
  }
}

@keyframes hp-flash {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.stat-bar-num {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  text-align: right;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
  letter-spacing: 0.5px;
}

.stat-bar-sep {
  color: rgba($pixel-text-muted, 0.4);
  margin: 0 1px;
}

/* ==================== 信息行 ==================== */
.hud-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba($neon-cyan, 0.06);
}

.info-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.info-suffix {
  font-size: 11px;
  color: rgba($pixel-text-muted, 0.5);
  font-weight: 600;
}

.info-gold {
  .info-value {
    color: $neon-yellow;
    text-shadow: 0 0 8px rgba($neon-yellow, 0.3);
    font-family: 'VT323', monospace;
    font-size: 16px;
  }
}

.info-location {
  border-style: dashed;
}

.loc-text {
  font-size: 12px !important;
  color: $neon-cyan-light !important;
  text-shadow: 0 0 6px rgba($neon-cyan, 0.2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== 分隔线 ==================== */
.hud-sep {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.sep-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba($neon-cyan, 0.1),
    rgba($neon-magenta, 0.1),
    rgba($neon-cyan, 0.1),
    transparent
  );
}

.sep-dot {
  width: 3px;
  height: 3px;
  background: rgba($neon-cyan, 0.2);
  flex-shrink: 0;
  transform: rotate(45deg);
}

/* ==================== 背包 ==================== */
.hud-bag {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  z-index: 1;
}

.bag-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.bag-icon {
  font-size: 14px;
}

.bag-title {
  font-family: myFirstFont, 'VT323', monospace;
  font-size: 14px;
  color: rgba($pixel-text, 0.7);
  letter-spacing: 3px;
  flex: 1;
}

.bag-count {
  font-size: 11px;
  color: rgba($pixel-text-muted, 0.5);
  padding: 1px 6px;
  background: rgba($neon-cyan, 0.06);
  border: 1px solid rgba($neon-cyan, 0.1);
  font-weight: 600;
}

.bag-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  flex: 1;

  &::-webkit-scrollbar {
    width: 2px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba($neon-cyan, 0.1);
  }
}

.bag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 12px;
  color: rgba($pixel-text-muted, 0.7);
  border: 1px solid transparent;
  transition: all 0.15s ease;
  animation: item-enter 0.3s ease both;
  cursor: default;

  &:hover {
    background: rgba($neon-cyan, 0.05);
    border-color: rgba($neon-cyan, 0.1);
    color: $pixel-text;
  }
}

@keyframes item-enter {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.bag-item-icon {
  font-size: 13px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.bag-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.bag-empty {
  font-size: 12px;
  color: rgba($pixel-text-muted, 0.25);
  text-align: center;
  padding: 16px 0;
  font-style: italic;
  letter-spacing: 2px;
}

/* ==================== 底部 ==================== */
.hud-footer {
  margin-top: auto;
  padding-top: 10px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.footer-text {
  font-size: 10px;
  color: rgba($neon-cyan, 0.2);
  letter-spacing: 4px;
  animation: footer-glow 3s ease-in-out infinite;
}

@keyframes footer-glow {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.7;
    color: rgba($neon-cyan, 0.4);
  }
}
</style>
