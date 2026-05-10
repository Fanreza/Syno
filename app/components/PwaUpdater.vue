<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { toast } from 'vue-sonner'

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisterError(e) { console.warn('[SW]', e) }
})

// When a new SW is waiting, show a toast — never auto-reload.
// Prevents reload loops from cascading SW updates during rapid deploys.
watch(needRefresh, (yes) => {
  if (!yes) return
  toast('Update available', {
    description: 'A new version is ready.',
    action: {
      label: 'Refresh',
      onClick: () => updateServiceWorker(true),
    },
    duration: Infinity,
  })
})
</script>

<template><slot /></template>
