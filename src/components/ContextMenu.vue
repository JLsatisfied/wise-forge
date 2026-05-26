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
              <div @click="handleClick(item)" class="menu-item text-sm hover:bg-indigo-600" v-for="item in menu" :key="item.label">
                {{ item.label }}
              </div>
            </div>
        </Transition>
      </Teleport>
    </div>
  </template>

<style scoped>
.menu-list {
  width: 100px;
  position: absolute;
  padding: 6px;
  background-color: #fff;
  color: #000;
  border-radius: 5px;
  box-shadow: 0 0 10px 5px rgba(199, 182, 231, 0.5)
}

.menu-item {
  cursor: pointer;
  margin-top: 5px;
  padding: 3px;
  border-radius: 5px;
}

.menu-item:hover {
  color: #fff;
}

.menu-item:first-child {
  margin-top: 0;
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.5s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
