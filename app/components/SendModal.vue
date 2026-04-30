<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import Input from '~/components/ui/input/Input.vue'
import { Button } from '~/components/ui/button'
import {
  X, Search, Loader2, CheckCircle2, AlertCircle, User,
  Coins, DollarSign, Send, ExternalLink, Users, ShieldCheck
} from 'lucide-vue-next'
import { watchDebounced } from '@vueuse/core'
import { shortAddr, formatUsd } from '~/utils'

const open = defineModel<boolean>('open', { required: true })
const { apiFetch } = useAuth()
const { balance, refresh: refreshBalance } = useBalance()

// ── Friends ────────────────────────────────────────────────────────────────
const { friends, load: loadFriends } = useFriends()
const showFriends = ref(false)
watch(open, (v) => { if (v) loadFriends() })

// ── Recipient ──────────────────────────────────────────────────────────────
const recipientRaw = ref('')
const recipientUser = ref<{ username: string; wallet_address: string } | null>(null)
const recipientStatus = ref<'idle' | 'searching' | 'found' | 'not-found' | 'address' | 'invalid-address'>('idle')
const isRawAddress = (v: string) => !v.startsWith('@') && isValidSolanaAddress(v)
const looksLikeAddress = (v: string) => !v.startsWith('@') && v.length >= 32

function selectRecipient(u: { username: string; wallet_address: string }) {
  recipientRaw.value = '@' + u.username
  recipientUser.value = u
  recipientStatus.value = 'found'
}

watchDebounced(recipientRaw, async (v) => {
  const val = v.trim()
  if (!val) { recipientStatus.value = 'idle'; recipientUser.value = null; return }

  if (looksLikeAddress(val)) {
    if (!isRawAddress(val)) { recipientStatus.value = 'invalid-address'; recipientUser.value = null; return }
    // Valid Solana address — lookup if registered on Syno
    recipientStatus.value = 'searching'; recipientUser.value = null
    try {
      const results = await $fetch<{ username: string; wallet_address: string }[]>('/api/users/search', { query: { q: val } })
      if (results[0]) { recipientUser.value = results[0]; recipientStatus.value = 'found' }
      else recipientStatus.value = 'address'
    } catch { recipientStatus.value = 'address' }
    return
  }

  const q = val.replace(/^@/, '')
  if (q.length < 2) { recipientStatus.value = 'idle'; recipientUser.value = null; return }
  recipientStatus.value = 'searching'; recipientUser.value = null
  try {
    const results = await $fetch<{ username: string; wallet_address: string }[]>('/api/users/search', { query: { q } })
    const exact = results.find(u => u.username.toLowerCase() === q.toLowerCase())
    const match = exact ?? results[0]
    if (match) { recipientUser.value = match; recipientStatus.value = 'found' }
    else recipientStatus.value = 'not-found'
  } catch { recipientStatus.value = 'not-found' }
}, { debounce: 400 })

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
    return `≈ ${formatUsd(amountNum.value * tokenPrice.value)}`
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

// Tokens supported for private transfers (Umbra: USDC + USDT)
const PRIVATE_TOKENS = [
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]

const SOL_MINT = 'So11111111111111111111111111111111111111112'

const selectedTokenBalance = computed(() => {
  if (!balance.value) return null
  if (inputToken.value.address === SOL_MINT) {
    return { amount: balance.value.sol, usd: balance.value.sol * (balance.value.solPrice ?? 0), symbol: 'SOL' }
  }
  const t = balance.value.tokens?.find((t: any) => t.mint === inputToken.value.address)
  if (!t) return null
  return { amount: t.balance, usd: t.usd, symbol: t.symbol }
})

// ── Submit ─────────────────────────────────────────────────────────────────
const loading = ref(false)
const error = ref('')
const successSig = ref('')

const privateTooSmall = computed(() => false)

const canSend = computed(() =>
  (recipientStatus.value === 'found' || recipientStatus.value === 'address') &&
  amountInToken.value > 0 && !loading.value && !privateTooSmall.value
)

async function onSend() {
  error.value = ''
  loading.value = true
  try {
    const isAddr = isRawAddress(recipientRaw.value.trim())
    const endpoint = isPrivate.value ? '/api/payments/private-send-umbra' : '/api/payments/send'
    const body: Record<string, any> = {
      toUsername: isAddr ? undefined : recipientRaw.value.trim(),
      toAddress: isAddr ? recipientRaw.value.trim() : undefined,
      amount: amountInToken.value,
      memo: memo.value,
    }
    if (isPrivate.value) {
      body.mint = inputToken.value.address
      body.decimals = inputToken.value.decimals
    } else if (inputToken.value.address !== SOL_TOKEN.address) {
      body.inputToken = inputToken.value.address
      body.decimals = inputToken.value.decimals
    }
    const res = await apiFetch<{ signature?: string; withdrawSignature?: string }>(endpoint, { method: 'POST', body })
    successSig.value = res.withdrawSignature ?? res.signature ?? ''
    refreshBalance()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Transaction failed'
  } finally { loading.value = false }
}

function reset() {
  recipientRaw.value = ''; recipientUser.value = null; recipientStatus.value = 'idle'
  amountRaw.value = ''; memo.value = ''; isPrivate.value = false
  error.value = ''; successSig.value = ''; currency.value = 'TOKEN'; inputToken.value = SOL_TOKEN
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
                  if (isPrivate && !PRIVATE_TOKENS.includes(inputToken.address))
                    inputToken = POPULAR_TOKENS[1] // default to USDC
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
            <div>
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">To</label>
              <div class="relative">
                <div class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                  <Loader2 v-if="recipientStatus === 'searching'" class="h-4 w-4 animate-spin text-muted-foreground" />
                  <Search v-else class="h-4 w-4 text-muted-foreground" />
                </div>
                <Input v-model="recipientRaw" placeholder="@username or wallet address" class="pl-10 pr-16" />
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button v-if="recipientRaw" class="p-1 text-muted-foreground transition hover:text-foreground" @click="recipientRaw = ''; recipientStatus = 'idle'">
                    <X class="h-4 w-4" />
                  </button>
                  <button
                    v-if="friends.length"
                    class="p-1 transition"
                    :class="showFriends ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
                    @click="showFriends = !showFriends"
                  >
                    <Users class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <!-- Friends contact list -->
              <div v-if="showFriends && friends.length" class="mt-2 overflow-hidden rounded-xl border border-border bg-card">
                <p class="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Friends</p>
                <button
                  v-for="f in friends"
                  :key="f.id"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-accent"
                  @click="selectRecipient(f); showFriends = false"
                >
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {{ f.username[0].toUpperCase() }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold">@{{ f.username }}</p>
                    <p class="font-mono text-[10px] text-muted-foreground">{{ shortAddr(f.wallet_address, 6) }}</p>
                  </div>
                </button>
              </div>

              <div v-if="recipientStatus === 'found' && recipientUser"
                class="mt-2 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2.5">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {{ recipientUser.username[0].toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold">@{{ recipientUser.username }}</p>
                  <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(recipientUser.wallet_address, 6) }}</p>
                </div>
                <CheckCircle2 class="h-4 w-4 shrink-0 text-green-500" />
              </div>
              <div v-else-if="recipientStatus === 'address'"
                class="mt-2 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                  <User class="h-4 w-4" />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold">Wallet address</p>
                  <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(recipientRaw.trim(), 8) }}</p>
                </div>
                <CheckCircle2 class="h-4 w-4 shrink-0 text-blue-500" />
              </div>
              <div v-else-if="recipientStatus === 'not-found'"
                class="mt-2 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle class="h-4 w-4 shrink-0" />
                No user found
              </div>
              <div v-else-if="recipientStatus === 'invalid-address'"
                class="mt-2 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle class="h-4 w-4 shrink-0" />
                Invalid Solana address
              </div>
            </div>

            <!-- Private mode banner -->
            <div v-if="isPrivate" class="flex items-start gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3.5 py-2.5 text-xs text-violet-400">
              <ShieldCheck class="h-4 w-4 shrink-0 mt-0.5" />
              <span>Amount hidden on-chain. Recipient receives tokens directly.</span>
            </div>

            <!-- Amount -->
            <div>
              <div class="mb-1 flex items-center justify-between">
                <TokenPicker v-model="inputToken" label="Pay with" class="flex-1" :filter="isPrivate ? PRIVATE_TOKENS : undefined" />
              </div>
              <div class="mt-3 mb-2 flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Amount</label>
                <span v-if="selectedTokenBalance" class="text-xs text-muted-foreground">
                  Balance:
                  <button class="font-semibold text-foreground hover:text-primary transition" @click="amountRaw = selectedTokenBalance.amount.toFixed(6); currency = 'TOKEN'">
                    {{ selectedTokenBalance.amount.toFixed(4) }} {{ selectedTokenBalance.symbol }}
                  </button>
                  <span class="text-muted-foreground/60"> · {{ formatUsd(selectedTokenBalance.usd) }}</span>
                </span>
              </div>
              <div class="flex gap-2">
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
                    {{ currency === 'USD' ? '$' : '' }}
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

            <!-- Error -->
            <div v-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />{{ error }}
            </div>

            <!-- Submit -->
            <Button class="w-full" size="lg" :disabled="!canSend || loading" @click="onSend">
              <Send v-if="!loading" class="h-4 w-4" />
              {{ loading ? 'Sending…' : `Send${amountInToken > 0 ? ' ' + amountInToken.toFixed(4) + ' ' + inputToken.symbol : ''}` }}
            </Button>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
