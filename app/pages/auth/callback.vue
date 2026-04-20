<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const { isReady, completeOAuthLogin, user } = useAuth()
const error = ref('')

onMounted(async () => {
  const code = route.query.privy_oauth_code as string | undefined
  const state = route.query.privy_oauth_state as string | undefined
  if (!code || !state) {
    error.value = 'Missing OAuth response'
    return
  }

  // Wait for the Privy iframe to be ready before calling completeOAuthLogin
  if (!isReady.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(isReady, (v) => {
        if (v) { stop(); resolve() }
      }, { immediate: true })
    })
  }

  try {
    await completeOAuthLogin(code, state)
    // user.value is refreshed inside completeOAuthLogin — check after await
    await navigateTo(user.value?.privy_user_id ? '/app' : '/onboarding')
  } catch (e: any) {
    const msg: string = e?.message || ''
    if (msg.includes('already linked') || msg.includes('already exists')) {
      error.value = 'This email is already registered with a different sign-in method. Go back and use email or wallet to sign in.'
    } else {
      error.value = msg || 'OAuth login failed'
    }
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <div v-if="!error" class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p v-if="!error" class="mt-4 text-sm text-muted-foreground">Signing you in…</p>
      <div v-else class="space-y-3">
        <p class="text-sm text-destructive">{{ error }}</p>
        <NuxtLink to="/login" class="inline-block text-sm text-primary underline underline-offset-4">Back to sign in</NuxtLink>
      </div>
    </div>
  </div>
</template>
