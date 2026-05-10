<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const route = useRoute()

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisterError(e) { console.warn('[SW]', e) }
})

const AUTH_PATHS = ['/auth/', '/login', '/onboarding']
const isAuthRoute = computed(() => AUTH_PATHS.some(p => route.path.startsWith(p)))

// Auto-update SW, but defer if user is in the middle of auth flow
watch(needRefresh, (yes) => {
  if (!yes) return
  if (!isAuthRoute.value) {
    updateServiceWorker(true)
    return
  }
  // On auth route — wait until user navigates away, then update
  const stop = watch(isAuthRoute, (onAuth) => {
    if (!onAuth) {
      stop()
      updateServiceWorker(true)
    }
  })
})
</script>

<template><slot /></template>
