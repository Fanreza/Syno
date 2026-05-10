<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const id = route.params.id as string
const { isReady, isAuthenticated, user, apiFetch } = useAuth()

const { data: gift, error: fetchError, refresh: refreshGift } = await useFetch<{
  id: string
  total_amount: number
  token: string
  total_slots: number
  claimed_count: number
  amount_per_claim: number
  remaining_slots: number
  is_exhausted: boolean
  is_expired: boolean
  already_claimed: boolean
  expires_at: string | null
  distribution: 'even' | 'random'
  creator: { username: string; wallet_address: string }
}>(`/api/gifts/${id}`)

const claiming = ref(false)
const claimError = ref('')
const claimResult = ref<{ signature: string; amount: number } | null>(null)

const alreadyClaimed = computed(() => !!gift.value?.already_claimed || _alreadyClaimed.value)
const _alreadyClaimed = ref(false)

const KNOWN_MINTS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
}
const tokenSymbol = computed(() => {
  const t = gift.value?.token
  if (!t) return 'SOL'
  return KNOWN_MINTS[t] ?? (t.length <= 8 ? t : t.slice(0, 6) + '…')
})

const progress = computed(() => gift.value
  ? (gift.value.claimed_count / gift.value.total_slots) * 100
  : 0
)

async function claim() {
  if (!isAuthenticated.value) {
    navigateTo(`/login?next=/gift/${id}`)
    return
  }
  claiming.value = true
  claimError.value = ''
  try {
    const res = await apiFetch<{ signature: string; amount: number }>('/api/gifts/claim', {
      method: 'POST',
      body: { giftId: id }
    })
    claimResult.value = res
    await refreshGift()
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Claim failed'
    if (msg === 'Already claimed') _alreadyClaimed.value = true
    else claimError.value = msg
  } finally { claiming.value = false }
}

// wait for auth ready before anything
if (import.meta.client) {
  watchEffect(async () => {
    if (isReady.value && isAuthenticated.value && gift.value && !claimResult.value) {
      try {
        const res = await apiFetch<{ already_claimed: boolean }>(`/api/gifts/${id}`)
        if (res.already_claimed) _alreadyClaimed.value = true
      } catch {}
    }
  })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-6">
    <div class="w-full max-w-sm">

      <!-- Logo -->
      <div class="mb-8 flex items-center justify-center gap-2">
        <img src="/syno-logo.jpeg" alt="Syno" class="h-8 w-8 rounded-xl object-cover shadow-sm" />
        <span class="text-lg font-bold tracking-tight">Syno</span>
      </div>

      <!-- Not found -->
      <div v-if="fetchError || !gift" class="rounded-2xl border border-border bg-card p-8 text-center">
        <p class="text-4xl">🎁</p>
        <h2 class="mt-3 text-lg font-bold">Gift not found</h2>
        <p class="mt-2 text-sm text-muted-foreground">This link may be invalid or expired.</p>
        <NuxtLink to="/" class="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
          Go to Syno
        </NuxtLink>
      </div>

      <!-- Gift card -->
      <div v-else class="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">

        <!-- Header gradient -->
        <div class="relative overflow-hidden px-6 py-8 text-center"
          style="background: linear-gradient(135deg, hsl(38 90% 48%) 0%, hsl(30 95% 55%) 100%)">
          <div class="pointer-events-none absolute inset-0 opacity-[0.15]"
            style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 20px 20px" />
          <div class="relative z-10">
            <p class="text-5xl">{{ gift.distribution === 'random' ? '🎲' : '🎁' }}</p>
            <p class="mt-3 text-sm font-semibold text-white/70">from @{{ gift.creator?.username }}</p>
            <template v-if="gift.distribution === 'random'">
              <h1 class="mt-1 text-4xl font-extrabold text-white">
                {{ gift.total_amount.toFixed(4) }} {{ tokenSymbol }}
              </h1>
              <p class="mt-1 text-sm text-white/70">🎲 Random amounts · {{ gift.total_slots }} slots</p>
            </template>
            <template v-else>
              <h1 class="mt-1 text-4xl font-extrabold text-white">
                {{ gift.amount_per_claim.toFixed(4) }} {{ tokenSymbol }}
              </h1>
              <p class="mt-1 text-sm text-white/70">≈ per person</p>
            </template>
          </div>
        </div>

        <div class="p-6 space-y-5">

          <!-- Expiry notice -->
          <div v-if="gift.expires_at && !gift.is_expired" class="flex items-center justify-center gap-1.5 text-xs text-amber-500">
            <span>Expires {{ new Date(gift.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
          </div>

          <!-- Progress -->
          <div>
            <div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ gift.claimed_count }} of {{ gift.total_slots }} claimed</span>
              <span>{{ gift.remaining_slots }} left</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                class="h-full rounded-full transition-all"
                style="background: linear-gradient(90deg, hsl(38 90% 48%), hsl(30 95% 55%))"
                :style="{ width: `${progress}%` }"
              />
            </div>
          </div>

          <!-- Claim result -->
          <div v-if="claimResult" class="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
            <p class="text-2xl">🎉</p>
            <p class="mt-2 font-bold text-green-600 dark:text-green-400">You got {{ claimResult.amount.toFixed(4) }} {{ tokenSymbol }}!</p>
            <a
              :href="`https://solscan.io/tx/${claimResult.signature}`"
              target="_blank"
              class="mt-2 inline-block text-xs text-muted-foreground underline hover:text-foreground"
            >
              View transaction
            </a>
            <NuxtLink
              to="/app"
              class="mt-4 flex w-full items-center justify-center rounded-2xl py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style="background: linear-gradient(135deg, hsl(38 90% 48%) 0%, hsl(30 95% 55%) 100%)"
            >
              Back to Dashboard
            </NuxtLink>
          </div>

          <!-- Already claimed -->
          <div v-else-if="alreadyClaimed" class="space-y-3 text-center">
            <div class="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
              You already claimed this gift.
            </div>
            <NuxtLink
              to="/app"
              class="flex w-full items-center justify-center rounded-2xl py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style="background: linear-gradient(135deg, hsl(38 90% 48%) 0%, hsl(30 95% 55%) 100%)"
            >
              Back to Dashboard
            </NuxtLink>
          </div>

          <!-- Expired -->
          <div v-else-if="gift.is_expired" class="rounded-xl border border-border bg-secondary px-4 py-3 text-center text-sm text-muted-foreground">
            This gift has expired.
          </div>

          <!-- Exhausted -->
          <div v-else-if="gift.is_exhausted" class="rounded-xl border border-border bg-secondary px-4 py-3 text-center text-sm text-muted-foreground">
            All slots have been claimed.
          </div>

          <!-- Claim button -->
          <template v-else>
            <div v-if="claimError" class="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-center text-sm text-destructive">
              {{ claimError }}
            </div>

            <button
              v-if="!isAuthenticated"
              class="w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style="background: linear-gradient(135deg, hsl(38 90% 48%) 0%, hsl(30 95% 55%) 100%)"
              @click="navigateTo(`/login?next=/gift/${id}`)"
            >
              Sign in to claim
            </button>
            <button
              v-else
              :disabled="claiming"
              class="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
              style="background: linear-gradient(135deg, hsl(38 90% 48%) 0%, hsl(30 95% 55%) 100%)"
              @click="claim"
            >
              <span v-if="claiming" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {{ claiming ? 'Claiming…' : gift.distribution === 'random' ? '🎲 Open gift' : `Claim ${gift.amount_per_claim.toFixed(4)} ${tokenSymbol}` }}
            </button>
          </template>

          <p class="text-center text-xs text-muted-foreground">
            Powered by <span class="font-semibold text-foreground">Syno</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
