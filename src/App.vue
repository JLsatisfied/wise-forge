<script setup lang="ts">
import { onMounted, ref } from 'vue'

let Icon = ref('')

onMounted(() => {
  let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
  Icon.value = navigator.onLine ? '/brave.jpeg' : '/brave_gray.jpg'
  if (favicon) {
    favicon.href = `${Icon.value}?v=${Date.now()}`
  }
})
</script>

<template>
  <main>
    <router-view></router-view>
  </main>
</template>
