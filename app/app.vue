<script setup lang="ts">
const route = useRoute()
const isApp = computed(() => route.path.startsWith('/app'))
const showNav = computed(() => isApp.value && !route.path.startsWith('/app/pay/'))

const { init, isDark } = useTheme()
onMounted(() => init())

watch(isDark, (dark) => {
  document.documentElement.classList.toggle('dark', dark)
}, { immediate: false })

const showSendGlobal = useState<boolean>('global-show-send', () => false)
const showSwapGlobal = useState<boolean>('global-show-swap', () => false)
const showRequestGlobal = useState<boolean>('global-show-request', () => false)
const showSplitGlobal = useState<boolean>('global-show-split', () => false)
const showGiftGlobal = useState<boolean>('global-show-gift', () => false)
const showPayrollGlobal = useState<boolean>('global-show-payroll', () => false)
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
    <SendModal v-model:open="showSendGlobal" />
    <SwapModal v-model:open="showSwapGlobal" />
    <RequestModal v-model:open="showRequestGlobal" />
    <SplitModal v-model:open="showSplitGlobal" />
    <GiftModal v-model:open="showGiftGlobal" />
    <PayrollModal v-model:open="showPayrollGlobal" />
  </div>
  <div v-else class="min-h-screen bg-background text-foreground">
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
