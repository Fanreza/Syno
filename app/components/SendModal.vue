<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import Input from '~/components/ui/input/Input.vue'
import { Button } from '~/components/ui/button'
import {
  X, CheckCircle2, AlertCircle, User,
  Coins, DollarSign, Send, ExternalLink, ChevronDown, ShieldCheck,
  ShieldAlert, ShieldX, Shield
} from 'lucide-vue-next'
import { shortAddr } from '~/utils'
const { formatDisplay, fetchRates, selectedCurrency, SUPPORTED_CURRENCIES } = useDisplayCurrency()
const currencySymbol = computed(() => SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency.value)?.symbol ?? '$')
onMounted(() => fetchRates())
import type { Contact } from '~/components/ContactPicker.vue'

const open = defineModel<boolean>('open', { required: true })
const { apiFetch, user } = useAuth()
const { balance, refresh: refreshBalance } = useBalance()
const { startTourIfNew } = useOnboarding()
watch(open, (v) => { if (v) setTimeout(() => startTourIfNew('send-modal'), 400) })

// ── Contact picker ─────────────────────────────────────────────────────────
const showContactPicker = ref(false)

// ── Recipient ──────────────────────────────────────────────────────────────
const recipientRaw = ref('')
const recipientUser = ref<{ username: string | null; wallet_address: string } | null>(null)
const recipientStatus = ref<'idle' | 'found' | 'address'>('idle')
const recipientRegistered = ref<string | null | undefined>(undefined)
const isValidSolanaAddress = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)

async function selectContact(c: Contact) {
  riskScore.value = null
  recipientUser.value = c
  recipientRaw.value = c.username ? '@' + c.username : c.wallet_address
  recipientStatus.value = c.username ? 'found' : 'address'
  recipientRegistered.value = undefined
  if (!c.username) {
    try {
      const res = await $fetch<{ username: string | null }[]>('/api/users/search', { query: { q: c.wallet_address } })
      recipientRegistered.value = res[0]?.username ?? null
    } catch { recipientRegistered.value = null }
  }
}

function clearRecipient() {
  recipientRaw.value = ''; recipientUser.value = null; recipientStatus.value = 'idle'; recipientRegistered.value = undefined
  riskScore.value = null; riskLoading.value = false
}

// ── Risk score ─────────────────────────────────────────────────────────────
type RiskLevel = 'low' | 'medium' | 'high' | 'unknown'
type RiskData = { score: number; level: RiskLevel; flags: string[]; totalTokens: number; spamTokens: number; hasActivity: boolean; totalUsd: number; unavailable?: boolean }
const riskScore = ref<RiskData | null>(null)
const riskLoading = ref(false)

watch(recipientUser, async (u) => {
  riskScore.value = null
  if (!u?.wallet_address) return
  riskLoading.value = true
  try {
    riskScore.value = await apiFetch<RiskData>('/api/risk', { query: { address: u.wallet_address } })
  } catch { /* non-blocking */ } finally {
    riskLoading.value = false
  }
})

const isRawAddress = (v: string) => isValidSolanaAddress(v.trim())

// ── Amount ─────────────────────────────────────────────────────────────────
type Currency = 'TOKEN' | 'USD'
const currency = ref<Currency>('TOKEN')
const amountRaw = ref('')
const inputToken = ref<JupToken>(SOL_TOKEN)
const tokenPrice = ref<number | null>(null)

watch(inputToken, async (t) => {
  tokenPrice.value = null
  currency.value = 'TOKEN'
  amountRaw.value = ''
  try {
    const r = await $fetch<any>(`/api/tokens/price?ids=${t.address}`)
    tokenPrice.value = parseFloat(r?.data?.[t.address]?.price ?? '0') || null
  } catch {}
}, { immediate: true })

function onAmountInput(e: Event) {
  let s = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
  amountRaw.value = s
}

const amountNum = computed(() => parseFloat(amountRaw.value) || 0)
const amountInToken = computed(() => {
  if (currency.value === 'TOKEN') return amountNum.value
  if (!tokenPrice.value) return 0
  return amountNum.value / tokenPrice.value
})
const amountInSol = computed(() => {
  if (inputToken.value.address === SOL_TOKEN.address) return amountInToken.value
  return amountInToken.value
})
const convertLabel = computed(() => {
  if (!amountNum.value) return ''
  if (currency.value === 'TOKEN' && tokenPrice.value)
    return `≈ ${formatDisplay(amountNum.value * tokenPrice.value)}`
  if (currency.value === 'USD' && tokenPrice.value)
    return `≈ ${amountInToken.value.toFixed(6)} ${inputToken.value.symbol}`
  return ''
})

function toggleCurrency() {
  if (currency.value === 'TOKEN') {
    if (amountNum.value && tokenPrice.value) amountRaw.value = (amountNum.value * tokenPrice.value).toFixed(2)
    else amountRaw.value = ''
    currency.value = 'USD'
  } else {
    if (amountNum.value && tokenPrice.value) amountRaw.value = amountInToken.value.toFixed(6)
    else amountRaw.value = ''
    currency.value = 'TOKEN'
  }
}

const memo = ref('')
const isPrivate = ref(false)


const SOL_MINT = 'So11111111111111111111111111111111111111112'

const SOL_FEE_RESERVE = 0.000005

const selectedTokenBalance = computed(() => {
  if (!balance.value) return null
  if (inputToken.value.address === SOL_MINT) {
    return { amount: balance.value.sol, usd: balance.value.sol * (balance.value.solPrice ?? 0), symbol: 'SOL' }
  }
  const t = balance.value.tokens?.find((t: any) => t.mint === inputToken.value.address)
  if (!t) return null
  return { amount: t.balance, usd: t.usd, symbol: t.symbol }
})

const maxSendable = computed(() => {
  if (!selectedTokenBalance.value) return 0
  if (inputToken.value.address === SOL_MINT)
    return Math.max(0, selectedTokenBalance.value.amount - SOL_FEE_RESERVE)
  return selectedTokenBalance.value.amount
})

const missingToken = computed(() => {
  if (inputToken.value.address === SOL_MINT) return false
  const bal = selectedTokenBalance.value
  return bal === null || bal.amount === 0
})

const convertFromToken = ref<JupToken>(SOL_TOKEN)

watch(missingToken, (v) => {
  if (!v) convertFromToken.value = SOL_TOKEN
})

// ── Submit ─────────────────────────────────────────────────────────────────
const loading = ref(false)
const error = ref('')
const successSig = ref('')

const exceedsBalance = computed(() => {
  if (!selectedTokenBalance.value || amountInToken.value <= 0) return false
  return amountInToken.value > maxSendable.value + 0.000001
})

const isSelf = computed(() =>
  !!recipientUser.value && recipientUser.value.wallet_address === user.value?.wallet_address
)

const canSend = computed(() =>
  recipientUser.value !== null &&
  !isSelf.value &&
  amountInToken.value > 0 && !loading.value && !exceedsBalance.value
)

async function onSend() {
  error.value = ''
  loading.value = true
  try {
    const addr = recipientUser.value?.wallet_address ?? ''
    const uname = recipientUser.value?.username ?? null
    const endpoint = isPrivate.value ? '/api/payments/private-send-umbra' : '/api/payments/send'
    const body: Record<string, any> = {
      toUsername: uname ? uname : undefined,
      toAddress: uname ? undefined : addr,
      amount: amountInToken.value,
      memo: memo.value,
    }
    if (isPrivate.value) {
      body.mint = inputToken.value.address
      body.decimals = inputToken.value.decimals
    } else if (missingToken.value) {
      // user doesn't have inputToken — use convertFromToken, Jupiter swaps to inputToken
      body.outputToken = inputToken.value.address
      body.inputToken = convertFromToken.value.address
      body.decimals = inputToken.value.decimals  // output token decimals, not input
    } else if (inputToken.value.address !== SOL_TOKEN.address) {
      body.inputToken = inputToken.value.address
      body.decimals = inputToken.value.decimals
    }
    const res = await apiFetch<{ signature?: string; withdrawSignature?: string }>(endpoint, { method: 'POST', body })
    successSig.value = res.withdrawSignature ?? res.signature ?? ''
    await refreshBalance()
    setTimeout(() => refreshBalance(), 3000)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Transaction failed'
  } finally { loading.value = false }
}

function reset() {
  recipientRaw.value = ''; recipientUser.value = null; recipientStatus.value = 'idle'
  amountRaw.value = ''; memo.value = ''; isPrivate.value = false
  error.value = ''; successSig.value = ''; currency.value = 'TOKEN'; inputToken.value = SOL_TOKEN
  showContactPicker.value = false; riskScore.value = null; riskLoading.value = false
}

watch(open, (v) => { if (!v) setTimeout(reset, 300) })
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

        <!-- Success -->
        <div v-if="successSig" class="p-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 class="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle class="text-xl font-bold">
            {{ isPrivate ? 'Private payment sent' : 'Payment sent' }}
          </DialogTitle>
          <p class="mt-2 text-sm text-muted-foreground">
            <template v-if="isPrivate">
              <span class="inline-flex items-center gap-1 text-violet-400 font-semibold"><ShieldCheck class="h-3.5 w-3.5" /> Amount hidden on-chain</span>
              <br />to <span class="font-semibold text-foreground">{{ recipientUser ? '@' + recipientUser.username : shortAddr(recipientRaw.trim()) }}</span>
            </template>
            <template v-else>
              {{ amountInToken.toFixed(6) }} {{ inputToken.symbol }} to
              <span class="font-semibold text-foreground">
                {{ recipientUser ? '@' + recipientUser.username : shortAddr(recipientRaw.trim()) }}
              </span>
            </template>
          </p>
          <div class="mt-4 flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3">
            <span class="font-mono text-xs text-muted-foreground">{{ successSig.slice(0, 28) }}…</span>
            <a :href="`https://solscan.io/tx/${successSig}`" target="_blank" class="text-primary hover:opacity-70">
              <ExternalLink class="h-3.5 w-3.5" />
            </a>
          </div>
          <div class="mt-5 flex gap-3">
            <Button variant="outline" class="flex-1" @click="reset">Send another</Button>
            <Button class="flex-1" @click="open = false">Done</Button>
          </div>
        </div>

        <!-- Form -->
        <template v-else>
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <DialogTitle class="text-base font-bold">Send</DialogTitle>
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                :class="isPrivate ? 'bg-violet-500/10 text-violet-500' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
                @click="() => {
                  isPrivate = !isPrivate
                  const PRIVATE_MINTS = ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB']
                  if (isPrivate && !PRIVATE_MINTS.includes(inputToken.address))
                    inputToken = POPULAR_TOKENS.find(t => t.address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') ?? POPULAR_TOKENS[1]!
                }"
              >
                <ShieldCheck class="h-3.5 w-3.5" />
                {{ isPrivate ? 'Private' : 'Public' }}
              </button>
              <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="open = false">
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="space-y-4 p-6">

            <!-- Recipient -->
            <div data-tour="send-to">
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">To</label>

              <!-- No recipient selected yet -->
              <button
                v-if="!recipientUser"
                class="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-secondary px-4 py-3 transition hover:bg-accent"
                @click="showContactPicker = true"
              >
                <User class="h-4 w-4 text-muted-foreground" />
                <span class="text-sm text-muted-foreground">Select contact or address…</span>
                <ChevronDown class="ml-auto h-4 w-4 text-muted-foreground" />
              </button>

              <!-- Recipient selected -->
              <div v-else class="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2.5">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    <span v-if="recipientUser.username">{{ recipientUser.username[0]?.toUpperCase() }}</span>
                    <User v-else class="h-4 w-4" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold">{{ recipientUser.username ? '@' + recipientUser.username : 'Wallet address' }}</p>
                    <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(recipientUser.wallet_address, 8) }}</p>
                  </div>
                  <button class="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="clearRecipient">
                    <X class="h-4 w-4" />
                  </button>
                </div>
                <template v-if="recipientStatus === 'address'">
                  <p v-if="recipientRegistered === undefined" class="mt-1.5 text-xs text-muted-foreground animate-pulse">Checking address…</p>
                  <p v-else-if="recipientRegistered" class="mt-1.5 text-xs text-green-600 dark:text-green-400">✓ Registered as <span class="font-semibold">@{{ recipientRegistered }}</span></p>
                  <p v-else class="mt-1.5 text-xs text-muted-foreground">Not registered — sending directly to address</p>
                </template>
              </div>
            </div>

            <!-- Risk score -->
            <div v-if="riskLoading" class="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-xs text-muted-foreground">
              <span class="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              Checking wallet risk…
            </div>
            <div v-else-if="riskScore && !riskScore.unavailable" class="rounded-xl border px-3.5 py-2.5 text-xs"
              :class="{
                'border-green-500/20 bg-green-500/5': riskScore.level === 'low',
                'border-yellow-500/20 bg-yellow-500/5': riskScore.level === 'medium',
                'border-red-500/20 bg-red-500/5': riskScore.level === 'high',
              }"
            >
              <div class="flex items-center gap-2">
                <ShieldCheck v-if="riskScore.level === 'low'" class="h-4 w-4 shrink-0 text-green-500" />
                <ShieldAlert v-else-if="riskScore.level === 'medium'" class="h-4 w-4 shrink-0 text-yellow-500" />
                <ShieldX v-else class="h-4 w-4 shrink-0 text-red-500" />
                <span class="font-semibold"
                  :class="{
                    'text-green-600 dark:text-green-400': riskScore.level === 'low',
                    'text-yellow-600 dark:text-yellow-400': riskScore.level === 'medium',
                    'text-red-600 dark:text-red-400': riskScore.level === 'high',
                  }"
                >
                  {{ riskScore.level === 'low' ? 'Wallet looks safe' : riskScore.level === 'medium' ? 'Some risk detected' : 'High risk wallet' }}
                </span>
                <span class="ml-auto text-muted-foreground">Score {{ riskScore.score }}/100</span>
              </div>
              <ul v-if="riskScore.flags.length" class="mt-1.5 space-y-0.5 pl-6 text-muted-foreground">
                <li v-for="f in riskScore.flags" :key="f">· {{ f }}</li>
              </ul>
            </div>

            <!-- Self-send warning -->
            <div v-if="isSelf" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />
              You can't send to yourself.
            </div>

            <!-- Private mode banner -->
            <div v-if="isPrivate" class="flex items-start gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3.5 py-2.5 text-xs text-violet-400">
              <ShieldCheck class="h-4 w-4 shrink-0 mt-0.5" />
              <span>Amount hidden on-chain. Recipient receives tokens directly.</span>
            </div>

            <!-- Amount -->
            <div data-tour="send-token">
              <div class="mb-1 flex items-center justify-between">
                <TokenPicker v-model="inputToken" label="Send" class="flex-1" :filter="isPrivate ? ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'] : undefined" />
              </div>

              <!-- Auto-convert prompt — shown immediately when user doesn't have the token -->
              <div v-if="missingToken" class="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p class="text-xs font-medium text-amber-500 mb-1">You don't have {{ inputToken.symbol }}.</p>
                <p class="text-xs text-muted-foreground mb-2.5">Choose a token you own — Jupiter swaps it to {{ inputToken.symbol }} before sending.</p>
                <TokenPicker
                  :model-value="convertFromToken"
                  label="Pay with"
                  @update:model-value="convertFromToken = $event"
                />
              </div>
              <div class="mt-3 mb-2 flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Amount</label>
                <span v-if="selectedTokenBalance" class="text-xs text-muted-foreground">
                  Balance:
                  <button class="font-semibold text-foreground hover:text-primary transition" @click="amountRaw = maxSendable.toFixed(6); currency = 'TOKEN'">
                    {{ selectedTokenBalance.amount.toFixed(4) }} {{ selectedTokenBalance.symbol }}
                  </button>
                  <span class="text-muted-foreground/60"> · {{ formatDisplay(selectedTokenBalance.usd) }}</span>
                </span>
              </div>
              <div class="flex gap-2" data-tour="send-amount">
                <button
                  class="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-sm font-semibold transition hover:bg-accent"
                  @click="toggleCurrency"
                >
                  <DollarSign v-if="currency === 'USD'" class="h-4 w-4" />
                  <img v-else-if="inputToken.logoURI" :src="inputToken.logoURI" class="h-4 w-4 rounded-full" />
                  <Coins v-else class="h-4 w-4" />
                  {{ currency === 'USD' ? 'USD' : inputToken.symbol }}
                </button>
                <div class="relative flex-1">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    {{ currency === 'USD' ? currencySymbol : '' }}
                  </span>
                  <input
                    :value="amountRaw"
                    inputmode="decimal"
                    placeholder="0.00"
                    :class="currency === 'USD' ? 'pl-8' : 'pl-4'"
                    class="flex h-11 w-full rounded-xl border border-input bg-background pr-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                    @input="onAmountInput"
                  />
                </div>
              </div>
              <p v-if="convertLabel && !isPrivate" class="mt-1.5 pl-1 text-xs text-muted-foreground">{{ convertLabel }}</p>
            </div>

            <!-- Memo -->
            <div>
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Memo <span class="font-normal normal-case text-muted-foreground/50">(optional)</span>
              </label>
              <Input v-model="memo" placeholder="Dinner, rent, coffee…" />
            </div>

            <!-- Insufficient balance -->
            <div v-if="exceedsBalance" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />Insufficient balance. Max sendable: {{ maxSendable.toFixed(6) }} {{ selectedTokenBalance?.symbol }}.
            </div>

            <!-- Error -->
            <div v-else-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />{{ error }}
            </div>

            <!-- Submit -->
            <Button class="w-full" size="lg" :disabled="!canSend || loading" @click="onSend">
              <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <Send v-else class="h-4 w-4" />
              {{ loading ? 'Sending…' : `Send${amountInToken > 0 ? ' ' + amountInToken.toFixed(4) + ' ' + inputToken.symbol : ''}` }}
            </Button>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <ContactPicker v-model:open="showContactPicker" @select="selectContact" />
</template>
