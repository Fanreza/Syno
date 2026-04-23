<script setup lang="ts">
const route = useRoute()
const isApp = computed(() => route.path.startsWith('/app'))
const showNav = computed(() => isApp.value && !route.path.startsWith('/app/pay/'))

const { init, isDark } = useTheme()
onMounted(() => init())

watch([isApp, isDark], ([app, dark]) => {
  document.documentElement.classList.toggle('dark', app && dark)
}, { immediate: false })
</script>

<template>
  <PageProgress />
  <div v-if="isApp" class="flex min-h-screen bg-background">
    <SideNav v-if="showNav" />
    <main class="flex-1 min-w-0 pb-20 md:pb-0">
      <NuxtPage :transition="{
        name: 'page',
        mode: 'out-in',
      }" />
    </main>
  </div>
  <div v-else class="min-h-screen bg-white text-foreground">
    <NuxtPage />
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-enter-active > div,
.sheet-leave-active > div {
  transition: transform 0.2s ease;
}
.sheet-enter-from { opacity: 0; }
.sheet-leave-to { opacity: 0; }
.sheet-enter-from > div { transform: translateY(100%); }
.sheet-leave-to > div { transform: translateY(100%); }
</style>
