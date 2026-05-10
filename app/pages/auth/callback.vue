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

  // Retry loginWithCode — Privy's iframe may not be ready immediately after page reload.
  // We retry with backoff for up to ~10s before giving up.
  const delays = [800, 1200, 2000, 3000]
  let lastErr: any

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      // Wrap with timeout — Privy's loginWithCode can hang silently when
      // window.ethereum is a non-writable getter (MetaMask conflict).
      await Promise.race([
        completeOAuthLogin(code, state),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Sign in timed out')), 8000)
        ),
      ])
      await navigateTo(user.value?.privy_user_id ? '/app' : '/onboarding')
      return
    } catch (e: any) {
      lastErr = e
      const msg: string = e?.message || ''
      // Non-retriable errors — surface immediately
      if (msg.includes('already linked') || msg.includes('already exists')) {
        error.value = 'This account is already linked to a different sign-in method. Go back and use email or wallet to sign in.'
        return
      }
      if (msg.includes('invalid') || msg.includes('expired') || msg.includes('code')) {
        error.value = msg || 'OAuth login failed'
        return
      }
      // Likely initialization issue — wait and retry
      if (attempt < delays.length) {
        await new Promise(r => setTimeout(r, delays[attempt]))
      }
    }
  }

  error.value = lastErr?.message || 'Sign in timed out. Please try again.'
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
