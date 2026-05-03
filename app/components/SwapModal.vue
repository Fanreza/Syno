<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import { Button } from '~/components/ui/button'
import { X, ArrowDown, RefreshCw, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const open = defineModel<boolean>('open', { required: true })
const { apiFetch } = useAuth()
const { balance, refresh: refreshBalance } = useBalance()

const SOL_MINT = 'So11111111111111111111111111111111111111112'

const fromToken = ref<JupToken>(SOL_TOKEN)
const toToken = ref<JupToken>({
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
})

const amountRaw = ref('')
const slippage = ref(0.5)

const loading = ref(false)
const quoteLoading = ref(false)
const error = ref('')
const quote = ref<any>(null)
const result = ref<{ signature: string; outAmount: string; outputMint: string } | null>(null)

const amountNum = computed(() => parseFloat(amountRaw.value) || 0)

const fromBalance = computed(() => {
  if (!balance.value) return 0
  if (fromToken.value.address === SOL_MINT) return balance.value.sol ?? 0
  return balance.value.tokens?.find((t: any) => t.mint === fromToken.value.address)?.balance ?? 0
})

const exceedsBalance = computed(() => amountNum.value > 0 && amountNum.value > fromBalance.value)

const outAmount = computed(() => {
  if (!quote.value?.outAmount) return null
  return Number(quote.value.outAmount) / Math.pow(10, toToken.value.decimals)
})

const rate = computed(() => {
  if (!outAmount.value || !amountNum.value) return null
  return (outAmount.value / amountNum.value).toFixed(6)
})

const priceImpact = computed(() => {
  if (!quote.value?.priceImpactPct) return null
  return (Number(quote.value.priceImpactPct) * 100).toFixed(2)
})

let quoteTimer: ReturnType<typeof setTimeout> | null = null

watch([amountRaw, fromToken, toToken, slippage], () => {
  quote.value = null
  error.value = ''
  if (!amountNum.value || fromToken.value.address === toToken.value.address) return
  if (quoteTimer) clearTimeout(quoteTimer)
  quoteTimer = setTimeout(fetchQuote, 600)
})

async function fetchQuote() {
  if (!amountNum.value || exceedsBalance.value) return
  quoteLoading.value = true
  try {
    quote.value = await apiFetch('/api/swap/quote', {
      query: {
        inputMint: fromToken.value.address,
        outputMint: toToken.value.address,
        amount: amountNum.value,
        inputDecimals: fromToken.value.decimals,
        slippageBps: Math.round(slippage.value * 100),
      },
    })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not get quote'
  } finally {
    quoteLoading.value = false
  }
}

function swapTokens() {
  const tmp = fromToken.value
  fromToken.value = toToken.value
  toToken.value = tmp
  amountRaw.value = ''
  quote.value = null
}

async function onSwap() {
  error.value = ''
  loading.value = true
  try {
    const res = await apiFetch<{ signature: string; outAmount: string; outputMint: string }>('/api/swap/execute', {
      method: 'POST',
      body: {
        inputMint: fromToken.value.address,
        outputMint: toToken.value.address,
        amount: amountNum.value,
        inputDecimals: fromToken.value.decimals,
        slippageBps: Math.round(slippage.value * 100),
      },
    })
    result.value = res
    await refreshBalance()
    setTimeout(() => refreshBalance(), 3000)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Swap failed'
  } finally {
    loading.value = false }
}

const canSwap = computed(() =>
  amountNum.value > 0 &&
  !exceedsBalance.value &&
  !!quote.value &&
  fromToken.value.address !== toToken.value.address &&
  !loading.value
)

function reset() {
  amountRaw.value = ''; quote.value = null; error.value = ''; result.value = null
  fromToken.value = SOL_TOKEN
}

watch(open, (v) => { if (!v) setTimeout(reset, 300) })
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 mx-4 sm:mx-0">

        <!-- Success -->
        <div v-if="result" class="p-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 class="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle class="text-xl font-bold">Swap complete</DialogTitle>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ formatAmount(amountNum) }} {{ fromToken.symbol }}
            → {{ formatAmount(Number(result.outAmount) / Math.pow(10, toToken.decimals)) }} {{ toToken.symbol }}
          </p>
          <a
            :href="`https://solscan.io/tx/${result.signature}`"
            target="_blank"
            class="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            View on Solscan <ExternalLink class="h-3 w-3" />
          </a>
          <div class="mt-6 flex gap-3">
            <Button variant="outline" class="flex-1" @click="reset">Swap again</Button>
            <Button class="flex-1" @click="open = false">Done</Button>
          </div>
        </div>

        <!-- Form -->
        <template v-else>
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <div class="flex items-center gap-2">
              <RefreshCw class="h-4 w-4 text-primary" />
              <DialogTitle class="text-base font-bold">Swap</DialogTitle>
            </div>
            <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="open = false">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-3 p-6">

            <!-- From -->
            <div class="rounded-2xl border border-border bg-secondary/40 p-4">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">You pay</span>
                <button
                  class="text-xs text-muted-foreground transition hover:text-foreground"
                  @click="amountRaw = fromBalance.toFixed(fromToken.decimals > 6 ? 6 : fromToken.decimals)"
                >
                  Balance: {{ formatAmount(fromBalance) }} {{ fromToken.symbol }}
                </button>
              </div>
              <div class="flex items-center gap-3">
                <input
                  v-model="amountRaw"
                  inputmode="decimal"
                  placeholder="0.00"
                  class="min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground/40"
                />
                <TokenPicker v-model="fromToken" label="" />
              </div>
            </div>

            <!-- Swap direction button -->
            <div class="flex justify-center">
              <button
                class="rounded-xl border border-border bg-card p-2 transition hover:bg-accent active:scale-95"
                @click="swapTokens"
              >
                <ArrowDown class="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <!-- To -->
            <div class="rounded-2xl border border-border bg-secondary/40 p-4">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">You receive</span>
              </div>
              <div class="flex items-center gap-3">
                <div class="min-w-0 flex-1">
                  <p v-if="quoteLoading" class="text-2xl font-bold text-muted-foreground/40 animate-pulse">...</p>
                  <p v-else class="text-2xl font-bold" :class="outAmount ? '' : 'text-muted-foreground/40'">
                    {{ outAmount ? formatAmount(outAmount) : '0.00' }}
                  </p>
                </div>
                <TokenPicker v-model="toToken" label="" />
              </div>
            </div>

            <!-- Quote details -->
            <div v-if="quote && outAmount" class="rounded-xl border border-border bg-secondary/30 px-4 py-3 space-y-1.5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Rate</span>
                <span class="font-medium">1 {{ fromToken.symbol }} ≈ {{ rate }} {{ toToken.symbol }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Slippage</span>
                <div class="flex items-center gap-1">
                  <button
                    v-for="s in [0.1, 0.5, 1.0]"
                    :key="s"
                    class="rounded-lg px-2 py-0.5 text-xs font-semibold transition"
                    :class="slippage === s ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'"
                    @click="slippage = s"
                  >{{ s }}%</button>
                </div>
              </div>
              <div v-if="priceImpact" class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Price impact</span>
                <span :class="Number(priceImpact) > 1 ? 'text-destructive font-semibold' : 'text-muted-foreground'">
                  {{ priceImpact }}%
                </span>
              </div>
            </div>

            <!-- Errors -->
            <div v-if="exceedsBalance" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />Not enough {{ fromToken.symbol }}. You have {{ formatAmount(fromBalance) }}.
            </div>
            <div v-else-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />{{ error }}
            </div>

            <Button class="w-full" size="lg" :disabled="!canSwap || loading" @click="onSwap">
              <RefreshCw v-if="!loading" class="h-4 w-4" />
              {{ loading ? 'Swapping…' : `Swap ${fromToken.symbol} → ${toToken.symbol}` }}
            </Button>

            <p class="text-center text-xs text-muted-foreground">Best rate via Jupiter</p>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
