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

  // Give Privy's iframe time to initialize before calling loginWithCode.
  // The iframe is created on Privy SDK instantiation, but needs ~500-1500ms
  // to set up messaging. Without this wait, loginWithCode can hang silently.
  await new Promise(r => setTimeout(r, 1500))

  try {
    await Promise.race([
      completeOAuthLogin(code, state),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sign in timed out. Please try again.')), 12000)
      ),
    ])
    await navigateTo(user.value?.privy_user_id ? '/app' : '/onboarding')
  } catch (e: any) {
    const msg: string = e?.message || ''
    if (msg.includes('already linked') || msg.includes('already exists')) {
      error.value = 'This account is already linked to another sign-in method. Go back and use email or wallet to sign in.'
    } else {
      error.value = msg || 'Sign in failed. Please try again.'
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
