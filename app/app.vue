<script setup lang="ts">
const route = useRoute()
const isApp = computed(() => route.path.startsWith('/app'))
const showNav = computed(() => isApp.value && !route.path.startsWith('/app/pay/'))

const { init, isDark } = useTheme()
onMounted(() => init())

// Only apply dark class when inside /app routes
watch([isApp, isDark], ([app, dark]) => {
  document.documentElement.classList.toggle('dark', app && dark)
}, { immediate: false })
</script>

<template>
  <div v-if="isApp" class="flex min-h-screen bg-background">
    <SideNav v-if="showNav" />
    <main class="flex-1 min-w-0">
      <NuxtPage />
    </main>
  </div>
  <div v-else class="min-h-screen bg-white text-foreground">
    <NuxtPage />
  </div>
</template>
