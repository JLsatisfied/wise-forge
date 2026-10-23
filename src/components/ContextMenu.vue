<script setup lang='ts'>
import { ref } from 'vue'
import useContextMenu from '../composables/useContextMenu';
const containerRef = ref(null)
const { x, y, showMenu } = useContextMenu(containerRef);
type menuObject = {
  label: string;
  id: number;
}
defineProps<{ menu: Array<menuObject> }>()
// 声明一个事件，选中菜单项的时候返回数据
const emit = defineEmits(['select']);

const handleClick = (item: menuObject) => {
  showMenu.value = false
  emit('select', item)
}
</script>

<template>
    <div ref="containerRef">
      <!-- 定义插槽，传递的内容就要显示在插槽之中 -->
      <slot></slot>
      <!-- 设置一个 div 用来显示菜单 -->
      <Teleport to="body">
        <Transition name="fade">
            <div class="menu-list" v-if="showMenu" :style="{
            left: x + 'px',
            top: y + 'px'
          }">
              <!-- 循环遍历菜单项，显示出来 -->
              <div @click="handleClick(item)" class="menu-item" v-for="item in menu" :key="item.label">
                {{ item.label }}
              </div>
            </div>
        </Transition>
      </Teleport>
    </div>
  </template>

<style scoped>
.menu-list {
  position: absolute;
  z-index: 1000;
  width: 112px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-md);
}

.menu-item {
  padding: 7px 10px;
  border-radius: 6px;
  color: var(--text-2);
  font-size: 13px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.menu-item:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}
</style>
