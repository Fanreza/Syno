<script setup lang="ts">
import { CheckCircle2, AlertCircle, ExternalLink, Copy, Check, LogIn, Search, ChevronDown } from 'lucide-vue-next'
import { formatAmount, shortAddr, formatUsd } from '~/utils'

definePageMeta({ layout: false })

const route = useRoute()
const id = route.params.id as string
const { isAuthenticated, user, apiFetch, isReady } = useAuth()
const { balance } = useBalance()

const SOL_MINT = 'So11111111111111111111111111111111111111112'

const { data: payment, error: fetchError } = await useFetch<{
  id: string
  amount: number
  token: string  // now a mint address
  status: string
  memo: string | null
  receiver_address: string
  receiver: { username: string; wallet_address: string } | null
}>(`/api/payments/${id}`)

const pageUrl = computed(() => {
  if (import.meta.server) return ''
  return window.location.href
})

const copiedAddr = ref(false)

// ---- Output token info ----
const USDC_TOKEN: JupToken = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
}

const outputTokenInfo = ref<JupToken>(SOL_TOKEN)

// Fetch output token metadata
onMounted(async () => {
  const mint = payment.value?.token
  if (!mint || mint === SOL_MINT || mint === 'SOL') { outputTokenInfo.value = SOL_TOKEN; return }
  if (mint === 'USDC' || mint === USDC_TOKEN.address) { outputTokenInfo.value = USDC_TOKEN; return }
  try {
    const t = await $fetch<JupToken>(`/api/tokens/search?q=${mint}`)
    if (Array.isArray(t) && t[0]) outputTokenInfo.value = t[0]
  } catch {}
})

// ---- Input token picker (what payer pays with) ----
const popularInputTokens = computed<JupToken[]>(() => {
  if (!balance.value) return [SOL_TOKEN, USDC_TOKEN]
  const result: JupToken[] = []
  if (balance.value.sol > 0) result.push(SOL_TOKEN)
  for (const t of balance.value.tokens ?? []) {
    if (t.balance > 0) result.push({ address: t.mint, symbol: t.symbol, name: t.name, decimals: 0, logoURI: t.logoURI })
  }
  return result.length > 0 ? result : [SOL_TOKEN, USDC_TOKEN]
})
const inputToken = ref<JupToken>(SOL_TOKEN)
const showInputPicker = ref(false)
const inputSearchQuery = ref('')
const inputSearchResults = ref<JupToken[]>([])
const inputSearching = ref(false)
let inputSearchTimer: ReturnType<typeof setTimeout>

watch(inputSearchQuery, (q) => {
  clearTimeout(inputSearchTimer)
  if (!q.trim()) { inputSearchResults.value = []; return }
  inputSearching.value = true
  inputSearchTimer = setTimeout(async () => {
    try {
      const res = await $fetch<JupToken[]>(`/api/tokens/search?q=${encodeURIComponent(q.trim())}`)
      inputSearchResults.value = res
    } catch { inputSearchResults.value = [] }
    finally { inputSearching.value = false }
  }, 300)
})

const displayInputTokens = computed(() => inputSearchQuery.value ? inputSearchResults.value : popularInputTokens.value)

function selectInputToken(token: JupToken) {
  inputToken.value = token
  showInputPicker.value = false
  inputSearchQuery.value = ''
  inputSearchResults.value = []
}

const needsSwap = computed(() =>
  inputToken.value.address !== (payment.value?.token ?? SOL_MINT) &&
  !(inputToken.value.address === SOL_MINT && (payment.value?.token === 'SOL' || !payment.value?.token))
)

const loading = ref(false)
const error = ref('')
const successSig = ref('')

async function onPay() {
  if (!isReady.value) return
  if (!isAuthenticated.value) {
    await navigateTo(`/login?next=/pay/${id}`)
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await apiFetch<{ signature: string }>('/api/payments/send', {
      method: 'POST',
      body: {
        paymentLinkId: id,
        amount: Number(payment.value!.amount),
        memo: payment.value!.memo ?? undefined,
        inputToken: inputToken.value.address,
        outputToken: payment.value!.token,
      }
    })
    successSig.value = res.signature
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Payment failed'
  } finally { loading.value = false }
}

const isSelf = computed(() =>
  isAuthenticated.value && user.value?.wallet_address === payment.value?.receiver_address
)

const selectedInputBalance = computed(() => {
  if (!balance.value) return null
  if (inputToken.value.address === SOL_MINT) {
    return { amount: balance.value.sol, usd: balance.value.usd, symbol: 'SOL' }
  }
  const t = balance.value.tokens?.find((t: any) => t.mint === inputToken.value.address)
  if (!t) return { amount: 0, usd: 0, symbol: inputToken.value.symbol }
  return { amount: t.balance, usd: t.usd, symbol: t.symbol }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background overflow-x-hidden">

    <!-- Top bar -->
    <header class="flex items-center justify-between border-b border-border px-6 py-4">
      <NuxtLink to="/" class="flex items-center gap-2">
        <img src="/syno-logo.jpeg" alt="Syno" class="h-7 w-7 rounded-lg object-cover" />
        <span class="text-base font-bold tracking-tight">Syno</span>
      </NuxtLink>
      <NuxtLink
        v-if="!isAuthenticated"
        to="/login"
        class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <LogIn class="h-3.5 w-3.5" /> Sign in
      </NuxtLink>
      <NuxtLink
        v-else
        to="/app"
        class="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        Dashboard
      </NuxtLink>
    </header>

    <!-- Body -->
    <main class="flex flex-1 justify-center px-4 py-6">
      <div class="w-full max-w-sm space-y-4">

        <!-- Not found -->
        <div v-if="fetchError || !payment" class="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircle class="mx-auto mb-3 h-10 w-10 text-destructive" />
          <p class="font-semibold">Payment link not found</p>
          <p class="mt-1 text-sm text-muted-foreground">This link may be invalid or expired.</p>
        </div>

        <!-- Success -->
        <div v-else-if="successSig" class="rounded-2xl border border-border bg-card p-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 class="h-8 w-8 text-green-500" />
          </div>
          <p class="text-xl font-bold">Payment sent</p>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ formatAmount(Number(payment.amount)) }} {{ outputTokenInfo.symbol }} to
            <span class="font-semibold text-foreground">
              {{ payment.receiver ? '@' + payment.receiver.username : shortAddr(payment.receiver_address) }}
            </span>
          </p>
          <a
            :href="`https://solscan.io/tx/${successSig}`"
            target="_blank"
            class="mt-4 flex items-center justify-center gap-1.5 text-xs text-primary hover:opacity-80 transition"
          >
            <ExternalLink class="h-3.5 w-3.5" />
            View on Explorer
          </a>
        </div>

        <!-- Payment card -->
        <template v-else>

          <!-- Request details -->
          <div class="rounded-2xl border border-border bg-card p-6">
            <div class="mb-5 flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {{ (payment.receiver?.username ?? payment.receiver_address)?.[0]?.toUpperCase() }}
              </div>
              <div>
                <p class="font-semibold">
                  {{ payment.receiver ? '@' + payment.receiver.username : 'Wallet address' }}
                </p>
                <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(payment.receiver_address, 8) }}</p>
              </div>
            </div>

            <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Requesting</p>
            <div class="flex items-center gap-3">
              <img v-if="outputTokenInfo.logoURI" :src="outputTokenInfo.logoURI" class="h-10 w-10 rounded-full" />
              <p class="text-4xl font-bold tracking-tight">
                {{ formatAmount(Number(payment.amount)) }}
                <span class="text-2xl font-semibold text-muted-foreground">{{ outputTokenInfo.symbol }}</span>
              </p>
            </div>

            <p v-if="payment.memo" class="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
              "{{ payment.memo }}"
            </p>
          </div>

          <!-- QR code -->
          <div class="rounded-2xl border border-border bg-card p-4">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Scan to pay</p>
              <button
                class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent"
                @click="() => { navigator.clipboard.writeText(pageUrl); copiedAddr = true; setTimeout(() => copiedAddr = false, 1500) }"
              >
                <Check v-if="copiedAddr" class="h-3.5 w-3.5 text-green-500" />
                <Copy v-else class="h-3.5 w-3.5" />
                {{ copiedAddr ? 'Copied!' : 'Copy link' }}
              </button>
            </div>
            <div class="flex justify-center">
              <div class="w-48">
                <RequestQr :url="pageUrl" />
              </div>
            </div>
          </div>

          <!-- Pay section -->
          <div class="rounded-2xl border border-border bg-card p-5 space-y-3">

            <div v-if="isSelf" class="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
              This is your own payment link.
            </div>

            <!-- Pay with token picker -->
            <div v-if="!isSelf">
              <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pay with</p>
              <button
                class="flex w-full items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3 transition hover:bg-accent"
                @click="showInputPicker = !showInputPicker"
              >
                <img v-if="inputToken.logoURI" :src="inputToken.logoURI" class="h-7 w-7 rounded-full object-cover" />
                <div v-else class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">{{ inputToken.symbol[0] }}</div>
                <div class="flex-1 text-left">
                  <p class="text-sm font-semibold">{{ inputToken.symbol }}</p>
                  <p class="text-xs text-muted-foreground">{{ inputToken.name }}</p>
                </div>
                <ChevronDown class="h-4 w-4 text-muted-foreground transition" :class="showInputPicker ? 'rotate-180' : ''" />
              </button>

              <div v-if="showInputPicker" class="mt-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                <div class="flex items-center gap-2 border-b border-border px-3 py-2.5">
                  <Search class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    v-model="inputSearchQuery"
                    placeholder="Search token or paste CA..."
                    autofocus
                    class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div class="max-h-48 overflow-y-auto">
                  <button
                    v-for="token in displayInputTokens"
                    :key="token.address"
                    class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-accent"
                    :class="inputToken.address === token.address ? 'bg-accent' : ''"
                    @click="selectInputToken(token)"
                  >
                    <img v-if="token.logoURI" :src="token.logoURI" class="h-8 w-8 rounded-full object-cover" />
                    <div v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{{ token.symbol[0] }}</div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold">{{ token.symbol }}</p>
                      <p class="truncate text-xs text-muted-foreground">{{ token.name }}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-xs font-semibold">
                        {{ token.address === SOL_MINT
                          ? balance?.sol.toFixed(4)
                          : (balance?.tokens?.find((t: any) => t.mint === token.address)?.balance ?? 0).toFixed(4) }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ formatUsd(token.address === SOL_MINT
                          ? (balance?.sol ?? 0) * (balance?.solPrice ?? 0)
                          : (balance?.tokens?.find((t: any) => t.mint === token.address)?.usd ?? 0)) }}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <p v-if="needsSwap" class="mt-1.5 text-xs text-muted-foreground pl-1">
                Auto-converted to {{ outputTokenInfo.symbol }} via Jupiter
              </p>

              <!-- Balance -->
              <div v-if="isAuthenticated && balance && selectedInputBalance" class="mt-3 flex items-center justify-between rounded-xl bg-secondary px-4 py-2.5 text-xs">
                <span class="text-muted-foreground">Your balance</span>
                <span class="font-semibold">
                  {{ selectedInputBalance.amount.toFixed(4) }} {{ selectedInputBalance.symbol }}
                  <span v-if="selectedInputBalance.usd" class="font-normal text-muted-foreground">· {{ formatUsd(selectedInputBalance.usd) }}</span>
                </span>
              </div>
            </div>

            <div v-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />{{ error }}
            </div>

            <button
              v-if="!isSelf"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              :disabled="loading"
              @click="onPay"
            >
              <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <template v-else>
                {{ isAuthenticated
                  ? `Pay ${formatAmount(Number(payment.amount))} ${outputTokenInfo.symbol}${needsSwap ? ' via Jupiter' : ''}`
                  : 'Sign in to pay' }}
              </template>
            </button>

            <p class="text-center text-xs text-muted-foreground">
              Powered by <span class="font-semibold text-foreground">Syno</span> on Solana
            </p>
          </div>

        </template>
      </div>
    </main>
  </div>
</template>
