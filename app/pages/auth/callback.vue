<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const { completeOAuthLogin, user } = useAuth()
const error = ref('')

onMounted(async () => {
  const code = route.query.privy_oauth_code as string | undefined
  const state = route.query.privy_oauth_state as string | undefined
  if (!code || !state) {
    error.value = 'Missing OAuth response'
    return
  }
  try {
    await completeOAuthLogin(code, state)
    await navigateTo(user.value ? '/app' : '/onboarding')
  } catch (e: any) {
    error.value = e?.message || 'OAuth login failed'
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <div v-if="!error" class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p v-if="!error" class="mt-4 text-sm text-muted-foreground">Signing you in…</p>
      <p v-else class="text-sm text-destructive">{{ error }}</p>
    </div>
  </div>
</template>
