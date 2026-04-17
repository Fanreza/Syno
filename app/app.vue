<script setup lang="ts">
const route = useRoute()
const showNav = computed(() => route.path.startsWith('/app') && !route.path.startsWith('/app/pay/'))
</script>

<template>
  <div :class="route.path.startsWith('/app') ? 'mx-auto min-h-screen max-w-md bg-background pb-20' : 'min-h-screen'">
    <NuxtPage />
    <BottomNav v-if="showNav" />
  </div>
</template>
