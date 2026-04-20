<script setup lang="ts">
import { TrendingUp, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertCircle, ExternalLink, Loader2, Zap, ArrowRight } from 'lucide-vue-next'
import TokenPicker from '~/components/TokenPicker.vue'

const { apiFetch } = useAuth()

type Market = {
  mint: string
  jlMint: string
  symbol: string
  name: string
  logoURI: string
  decimals: number
  price: number
  supplyApr: number
  totalAssets: number
  totalSupply: number
}

type Position = {
  mint: string
  jlMint: string
  symbol: string
  logoURI: string
  decimals: number
  supplyApr: number
  balance: number
  jlShares: string
}

const { data: markets, pending: loadingMarkets } = await useAsyncData<Market[]>('earn:markets', () =>
  $fetch('/api/earn/markets')
)

const { data: positions, refresh: refreshPositions } = await useAsyncData<Position[]>('earn:positions', () =>
  apiFetch('/api/earn/positions')
)

type ModalMode = 'deposit' | 'withdraw'
const modal = ref<{ mode: ModalMode; market: Market } | null>(null)
const amountRaw = ref('')
const inputToken = ref<JupToken>(SOL_TOKEN)
const loading = ref(false)
const error = ref('')
const successSig = ref('')

function openDeposit(market: Market) {
  modal.value = { mode: 'deposit', market }
  amountRaw.value = ''; error.value = ''; successSig.value = ''
  // default input token to the vault token if it's in POPULAR_TOKENS, else SOL
  const match = POPULAR_TOKENS.find(t => t.address === market.mint)
  inputToken.value = match ?? SOL_TOKEN
}

function openWithdraw(market: Market) {
  modal.value = { mode: 'withdraw', market }
  amountRaw.value = ''; error.value = ''; successSig.value = ''
}

function closeModal() {
  modal.value = null
  amountRaw.value = ''; error.value = ''; successSig.value = ''
}

function onAmountInput(e: Event) {
  let s = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
  amountRaw.value = s
}

const amountNum = computed(() => parseFloat(amountRaw.value) || 0)
const positionForModal = computed(() =>
  modal.value ? positions.value?.find(p => p.mint === modal.value!.market.mint) : null
)
const canSubmit = computed(() => amountNum.value > 0 && !loading.value && !successSig.value)

async function onSubmit() {
  if (!modal.value) return
  error.value = ''
  loading.value = true
  try {
    const { mint, decimals } = modal.value.market
    const endpoint = modal.value.mode === 'deposit' ? '/api/earn/deposit' : '/api/earn/withdraw'
    const isSwap = modal.value.mode === 'deposit' && inputToken.value.address !== mint
    const body: Record<string, any> = {
      mint,
      amount: amountNum.value,
      decimals: isSwap ? inputToken.value.decimals : decimals,
      ...(isSwap ? { inputMint: inputToken.value.address } : {}),
    }
    const res = await apiFetch<{ signature: string }>(endpoint, {
      method: 'POST',
      body,
    })
    successSig.value = res.signature
    await refreshPositions()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Transaction failed'
  } finally { loading.value = false }
}

function formatApr(apr: number | string) {
  const n = Number(apr)
  return n > 0 ? n.toFixed(2) + '%' : '—'
}

function formatTvl(totalAssets: number, decimals: number, price: number) {
  const usd = (totalAssets / Math.pow(10, decimals)) * price
  if (usd >= 1_000_000_000) return '$' + (usd / 1_000_000_000).toFixed(1) + 'B'
  if (usd >= 1_000_000) return '$' + (usd / 1_000_000).toFixed(1) + 'M'
  if (usd >= 1_000) return '$' + (usd / 1_000).toFixed(1) + 'K'
  return usd > 0 ? '$' + usd.toFixed(0) : '—'
}

function positionFor(mint: string) {
  return positions.value?.find(p => p.mint === mint)
}

const totalEarningUsd = computed(() => {
  if (!positions.value?.length || !markets.value?.length) return 0
  return positions.value.reduce((sum, p) => {
    const m = markets.value!.find(m => m.mint === p.mint)
    return sum + Number(p.balance) * (m?.price ?? 0)
  }, 0)
})
</script>

<template>
  <div class="min-h-screen p-8">

    <!-- Header row -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Earn</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Deposit tokens and earn yield via Jupiter Lend.</p>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-4">

      <!-- Hero card — your earnings summary -->
      <div
        class="col-span-7 relative overflow-hidden rounded-2xl border border-border p-6 shadow-lg"
        style="background: linear-gradient(135deg, hsl(142 60% 12%) 0%, hsl(142 50% 16%) 50%, hsl(142 60% 12%) 100%)"
      >
        <div class="pointer-events-none absolute inset-0 opacity-[0.03]"
          style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 20px 20px" />
        <div class="pointer-events-none absolute -top-6 right-8 h-32 w-32 rounded-full opacity-10"
          style="background: radial-gradient(circle, hsl(142 60% 60%) 0%, transparent 70%)" />

        <div class="relative z-10 flex h-full flex-col justify-between gap-6">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-white/50">Total deposited</p>
              <h2 class="mt-1 text-3xl font-bold tracking-tight text-white">
                {{ totalEarningUsd > 0 ? '$' + totalEarningUsd.toFixed(2) : positions?.length ? '—' : '$0.00' }}
              </h2>
              <p v-if="positions?.length" class="mt-0.5 text-sm text-white/40">
                across {{ positions.length }} position{{ positions.length > 1 ? 's' : '' }}
              </p>
              <p v-else class="mt-0.5 text-sm text-white/40">Start earning by depositing below</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <TrendingUp class="h-5 w-5 text-white/70" />
            </div>
          </div>

          <!-- Active positions -->
          <div v-if="positions?.length" class="flex flex-wrap gap-2">
            <div
              v-for="pos in positions"
              :key="pos.mint"
              class="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"
            >
              <img v-if="pos.logoURI" :src="pos.logoURI" class="h-5 w-5 rounded-full" />
              <span class="text-xs font-semibold text-white">{{ pos.symbol }}</span>
              <span class="text-xs text-white/60">{{ Number(pos.balance).toFixed(4) }}</span>
              <span class="rounded-md bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-300">{{ formatApr(pos.supplyApr) }}</span>
              <button
                class="ml-1 rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70 transition hover:bg-white/20"
                @click="openWithdraw({ mint: pos.mint, jlMint: pos.jlMint, symbol: pos.symbol, name: pos.symbol, logoURI: pos.logoURI, decimals: pos.decimals, supplyApr: pos.supplyApr, totalAssets: 0, totalSupply: 0, price: 0 })"
              >
                Withdraw
              </button>
            </div>
          </div>
          <div v-else class="flex items-center gap-2 rounded-xl bg-white/8 px-4 py-3">
            <Zap class="h-4 w-4 text-white/40" />
            <p class="text-xs text-white/40">No active positions. Pick a market below to get started.</p>
          </div>
        </div>
      </div>

      <!-- Stats sidebar -->
      <div class="col-span-5 grid grid-rows-3 gap-3">
        <div class="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Best APR</p>
            <p class="mt-1 text-2xl font-bold text-green-500">
              {{ markets?.length ? formatApr(Math.max(...markets.map(m => Number(m.supplyApr)))) : '—' }}
            </p>
          </div>
          <TrendingUp class="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
        <div class="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Markets</p>
            <p class="mt-1 text-2xl font-bold">
              {{ markets?.length ?? '—' }}
              <span class="text-sm font-medium text-muted-foreground">available</span>
            </p>
          </div>
          <ArrowDownToLine class="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
        <div class="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your positions</p>
            <p class="mt-1 text-2xl font-bold">
              {{ positions?.length ?? 0 }}
              <span class="text-sm font-medium text-muted-foreground">active</span>
            </p>
          </div>
          <ArrowUpFromLine class="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
      </div>

      <!-- Markets table -->
      <div class="col-span-12 rounded-2xl border border-border bg-card p-6">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="font-semibold">Available Markets</h3>
          <span class="text-xs text-muted-foreground">Powered by Jupiter Lend</span>
        </div>

        <div v-if="loadingMarkets" class="flex justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="!markets?.length" class="flex flex-col items-center justify-center py-12 text-center">
          <p class="font-medium">No markets available</p>
          <p class="mt-1 text-sm text-muted-foreground">Check back later.</p>
        </div>

        <div v-else class="divide-y divide-border">
          <div
            v-for="m in markets"
            :key="m.mint"
            class="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
          >
            <!-- Icon -->
            <img v-if="m.logoURI" :src="m.logoURI" class="h-9 w-9 rounded-full shrink-0" />
            <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {{ (m.symbol || '?')[0] }}
            </div>

            <!-- Name -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold">{{ m.symbol }}</p>
                <span
                  v-if="positionFor(m.mint)"
                  class="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400"
                >Deposited</span>
              </div>
              <p class="text-xs text-muted-foreground">TVL {{ formatTvl(m.totalAssets, m.decimals, m.price) }}</p>
            </div>

            <!-- APR -->
            <div class="text-right shrink-0 w-20">
              <p class="text-base font-bold text-green-500">{{ formatApr(m.supplyApr) }}</p>
              <p class="text-[10px] text-muted-foreground uppercase tracking-wide">APR</p>
            </div>

            <!-- Deposit -->
            <button
              class="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 active:scale-95"
              @click="openDeposit(m)"
            >
              <ArrowDownToLine class="h-3.5 w-3.5" /> Deposit
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modal" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal" />
        <div class="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">

          <div v-if="successSig" class="p-8 text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 class="h-8 w-8 text-green-500" />
            </div>
            <p class="text-xl font-bold">{{ modal.mode === 'deposit' ? 'Deposited' : 'Withdrawn' }}</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ amountNum.toFixed(4) }} {{ modal.market.symbol }}</p>
            <a :href="`https://explorer.solana.com/tx/${successSig}`" target="_blank"
              class="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              View on explorer <ExternalLink class="h-3 w-3" />
            </a>
            <button class="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90" @click="closeModal">
              Done
            </button>
          </div>

          <template v-else>
            <div class="flex items-center gap-3 border-b border-border px-5 py-4">
              <img v-if="modal.market.logoURI" :src="modal.market.logoURI" class="h-9 w-9 rounded-full" />
              <div v-else class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {{ (modal.market.symbol || '?')[0] }}
              </div>
              <div class="flex-1">
                <p class="font-bold">{{ modal.mode === 'deposit' ? 'Deposit' : 'Withdraw' }} {{ modal.market.symbol }}</p>
                <p class="text-xs text-green-500 font-semibold">{{ formatApr(modal.market.supplyApr) }} APR</p>
              </div>
              <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" @click="closeModal">
                <span class="text-sm leading-none">✕</span>
              </button>
            </div>

            <div class="space-y-4 p-5">
              <div v-if="positionForModal" class="flex items-center justify-between rounded-xl bg-secondary px-4 py-2.5 text-xs">
                <span class="text-muted-foreground">Currently deposited</span>
                <span class="font-semibold">{{ Number(positionForModal.balance).toFixed(4) }} {{ modal.market.symbol }}</span>
              </div>

              <!-- Pay with (deposit only) -->
              <div v-if="modal.mode === 'deposit'">
                <TokenPicker v-model="inputToken" label="Pay with" />
                <!-- swap indicator -->
                <div v-if="inputToken.address !== modal.market.mint" class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowRight class="h-3 w-3 shrink-0" />
                  <span>Auto-swap to <span class="font-semibold text-foreground">{{ modal.market.symbol }}</span> via Jupiter</span>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</label>
                <div class="flex items-center gap-2 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
                  <img v-if="modal.mode === 'deposit' && inputToken.logoURI" :src="inputToken.logoURI" class="h-5 w-5 rounded-full shrink-0" />
                  <img v-else-if="modal.market.logoURI" :src="modal.market.logoURI" class="h-5 w-5 rounded-full shrink-0" />
                  <span class="text-xs font-semibold text-muted-foreground shrink-0">{{ modal.mode === 'deposit' ? inputToken.symbol : modal.market.symbol }}</span>
                  <input
                    :value="amountRaw"
                    inputmode="decimal"
                    placeholder="0.00"
                    class="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                    @input="onAmountInput"
                  />
                </div>
              </div>

              <div v-if="error" class="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
                <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" /> {{ error }}
              </div>

              <button
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                :disabled="!canSubmit"
                @click="onSubmit"
              >
                <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                <template v-else>
                  {{ modal.mode === 'deposit' ? 'Deposit' : 'Withdraw' }}
                  <span v-if="amountNum > 0" class="opacity-80">{{ amountNum.toFixed(4) }} {{ modal.market.symbol }}</span>
                </template>
              </button>
            </div>
          </template>

        </div>
      </div>
    </Teleport>
  </div>
</template>
