<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import Button from '~/components/ui/Button.vue'
import Input from '~/components/ui/Input.vue'
import Logo from '~/components/Logo.vue'
import { Loader2 } from 'lucide-vue-next'

definePageMeta({ layout: false })

const { registerUsername, solanaAddress } = useAuth()
const username = ref('')
const loading = ref(false)
const error = ref('')

// Wait for embedded wallet to be ready before allowing submit
const walletReady = computed(() => !!solanaAddress.value)

async function onSubmit() {
  if (!walletReady.value) {
    error.value = 'Wallet is still initializing, please wait...'
    return
  }
  loading.value = true; error.value = ''
  try {
    await registerUsername(username.value)
    await navigateTo('/app')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-6">
    <div class="mb-6 w-full max-w-sm text-center">
      <Logo size="lg" class="mx-auto mb-4" />
      <h1 class="text-2xl font-bold tracking-tight">Pick a username</h1>
      <p class="mt-1 text-sm text-muted-foreground">This is how friends will find and pay you.</p>
    </div>
    <Card class="w-full max-w-sm p-6">
      <div class="flex items-center rounded-lg border border-input bg-background pl-3">
        <span class="text-muted-foreground">@</span>
        <Input v-model="username" placeholder="alex" class="border-0 focus-visible:ring-0" />
      </div>
      <p class="mt-2 text-xs text-muted-foreground">3-20 chars, a-z 0-9 _</p>

      <div v-if="!walletReady" class="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />
        Setting up your wallet…
      </div>

      <Button
        class="mt-5 w-full"
        size="lg"
        :loading="loading"
        :disabled="!username || !walletReady"
        @click="onSubmit"
      >
        Create Account &amp; Wallet
      </Button>
      <p v-if="error" class="mt-3 text-center text-sm text-destructive">{{ error }}</p>
    </Card>
  </div>
</template>
