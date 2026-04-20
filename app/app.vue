<script setup lang="ts">
const route = useRoute()
const isApp = computed(() => route.path.startsWith('/app'))
const showNav = computed(() => isApp.value && !route.path.startsWith('/app/pay/'))

const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <div v-if="isApp" class="flex min-h-screen bg-background">
    <SideNav v-if="showNav" />
    <main class="flex-1 min-w-0">
      <NuxtPage />
    </main>
  </div>
  <div v-else class="min-h-screen">
    <NuxtPage />
  </div>
</template>
