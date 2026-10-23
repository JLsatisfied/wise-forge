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
  if (hpPercent.value < 30) return 'var(--danger)'
  if (hpPercent.value < 60) return 'var(--warning)'
  return 'var(--success)'
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
.hud {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 20;
  width: 240px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px 16px 16px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  overflow-y: auto;
  box-sizing: border-box;
}

.hud-ornament {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.orn-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.orn-gem {
  color: var(--accent);
  font-size: 7px;
  opacity: 0.7;
}

.hud-portrait {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.portrait-frame {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}

.portrait-bg {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-2);
}

.portrait-icon {
  color: var(--accent);
  font-size: 20px;
}

.portrait-border-inner {
  position: absolute;
  inset: -3px;
  border: 1px solid var(--accent-soft);
  border-radius: 17px;
  pointer-events: none;
}

.portrait-info {
  min-width: 0;
}

.portrait-name {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.portrait-level {
  margin-top: 3px;
  color: var(--text-3);
  font-size: 11px;
}

.hud-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  width: 16px;
  flex-shrink: 0;
  font-size: 11px;
  text-align: center;
}

.stat-icon--hp {
  color: var(--danger);
}

.stat-icon--mp {
  color: var(--info);
}

.stat-bar-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-bar-bg {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s var(--ease);
}

.stat-bar-fill--hp {
  background: var(--bar-color, var(--success));

  &.is-low {
    animation: hp-pulse 1.4s ease-in-out infinite;
  }
}

.stat-bar-fill--mp {
  background: var(--info);
}

@keyframes hp-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.stat-bar-num {
  flex-shrink: 0;
  min-width: 48px;
  color: var(--text-3);
  font-size: 10px;
  text-align: right;
  white-space: nowrap;
}

.stat-bar-sep {
  margin: 0 1px;
  color: var(--border-strong);
}

.hud-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 12px;
  min-width: 0;
}

.info-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.info-value {
  color: var(--text);
  font-weight: 500;
}

.info-suffix {
  color: var(--text-3);
  font-size: 10px;
}

.loc-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
  color: var(--text-2);
}

.hud-sep {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
}

.sep-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.sep-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--border-strong);
}

.hud-bag {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bag-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.bag-icon {
  font-size: 12px;
}

.bag-title {
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
}

.bag-count {
  margin-left: auto;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-3);
  font-size: 10px;
}

.bag-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  color: var(--text-2);
  font-size: 12px;
  transition: background-color 0.15s var(--ease);
  animation: bag-enter 0.25s var(--ease) both;

  &:hover {
    background: var(--surface-2);
  }
}

.bag-item-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.bag-item-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes bag-enter {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.bag-empty {
  padding: 14px 8px;
  color: var(--text-3);
  font-size: 11px;
  text-align: center;
}

.hud-footer {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.footer-text {
  display: block;
  color: var(--text-3);
  font-size: 10px;
  letter-spacing: 0.8px;
  text-align: center;
}
</style>
