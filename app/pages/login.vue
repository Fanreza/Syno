<script setup lang="ts">
import ConnectModal from '~/components/ConnectModal.vue'
import Logo from '~/components/Logo.vue'

definePageMeta({ layout: false })

const { isReady, isAuthenticated, user } = useAuth()
const showModal = ref(false)

watchEffect(() => {
  if (isReady.value && isAuthenticated.value) {
    navigateTo(user.value ? '/app' : '/onboarding')
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background">
    <div class="mb-8 text-center">
      <Logo size="lg" class="mx-auto mb-4" />
      <h1 class="text-2xl font-bold tracking-tight">Syno</h1>
      <p class="mt-2 text-sm text-muted-foreground">Send crypto like sending a DM</p>
    </div>
    <button
      class="rounded-xl bg-primary px-10 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 active:scale-95"
      @click="showModal = true"
    >
      Get Started
    </button>
    <ConnectModal v-model:open="showModal" />
  </div>
</template>
