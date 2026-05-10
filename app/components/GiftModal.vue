<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import Input from '~/components/ui/input/Input.vue'
import { Button } from '~/components/ui/button'
import { X, Gift, AlertCircle, Copy, Check, Users, Coins, Share2, DollarSign, Clock, Shuffle } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const open = defineModel<boolean>('open', { required: true })
const config = useRuntimeConfig()
const { apiFetch } = useAuth()
const { startTourIfNew } = useOnboarding()
watch(open, (v) => { if (v) startTourIfNew('gift-modal') })
const { formatDisplay, selectedCurrency, SUPPORTED_CURRENCIES } = useDisplayCurrency()
const currencySymbol = computed(() => SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency.value)?.symbol ?? '$')
const { balance, refresh: refreshBalance } = useBalance()

const totalRaw = ref('')
const slots = ref('5')
const giftToken = ref<JupToken>(SOL_TOKEN)
const loading = ref(false)
const error = ref('')
const created = ref<{ id: string; total_amount: number; total_slots: number; token: string } | null>(null)
const copied = ref(false)

type Currency = 'TOKEN' | 'USD'
const currency = ref<Currency>('TOKEN')
const tokenPrice = ref<number | null>(null)

watch(giftToken, async (t) => {
  tokenPrice.value = null
  currency.value = 'TOKEN'
  totalRaw.value = ''
  try {
    const r = await $fetch<any>(`/api/tokens/price?ids=${t.address}`)
    tokenPrice.value = parseFloat(r?.data?.[t.address]?.price ?? '0') || null
  } catch {}
}, { immediate: true })

const totalNum = computed(() => parseFloat(totalRaw.value) || 0)
const totalInToken = computed(() => {
  if (currency.value === 'TOKEN') return totalNum.value
  if (!tokenPrice.value) return 0
  return totalNum.value / tokenPrice.value
})
const convertLabel = computed(() => {
  if (!totalNum.value) return ''
  if (currency.value === 'TOKEN' && tokenPrice.value)
    return `≈ ${formatDisplay(totalNum.value * tokenPrice.value)}`
  if (currency.value === 'USD' && tokenPrice.value)
    return `≈ ${totalInToken.value.toFixed(6)} ${giftToken.value.symbol}`
  return ''
})

function toggleCurrency() {
  if (!tokenPrice.value) return
  if (currency.value === 'TOKEN') {
    if (totalNum.value) totalRaw.value = (totalNum.value * tokenPrice.value).toFixed(2)
    currency.value = 'USD'
  } else {
    if (totalNum.value) totalRaw.value = totalInToken.value.toFixed(6)
    currency.value = 'TOKEN'
  }
}

function onTotalInput(e: Event) {
  let s = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
  totalRaw.value = s
}

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const selectedBalance = computed(() => {
  if (!balance.value) return null
  if (giftToken.value.address === SOL_MINT)
    return { amount: balance.value.sol, symbol: 'SOL' }
  const t = balance.value.tokens?.find((t: any) => t.mint === giftToken.value.address)
  return t ? { amount: t.balance, symbol: t.symbol } : { amount: 0, symbol: giftToken.value.symbol }
})

// Distribution
type Distribution = 'even' | 'random'
const distribution = ref<Distribution>('even')

// Expiry
type ExpiresIn = 'none' | '24h' | '7d' | '30d'
const expiresIn = ref<ExpiresIn>('none')
const expiresAt = computed((): string | undefined => {
  if (expiresIn.value === 'none') return undefined
  const d = new Date()
  if (expiresIn.value === '24h') d.setHours(d.getHours() + 24)
  else if (expiresIn.value === '7d') d.setDate(d.getDate() + 7)
  else if (expiresIn.value === '30d') d.setDate(d.getDate() + 30)
  return d.toISOString()
})

const slotsNum = computed(() => Math.max(1, parseInt(slots.value) || 1))
const perPerson = computed(() => totalInToken.value > 0 ? (totalInToken.value / slotsNum.value).toFixed(4) : '0')

const exceedsBalance = computed(() =>
  totalInToken.value > 0 && !!selectedBalance.value && totalInToken.value > selectedBalance.value.amount
)

const canCreate = computed(() => totalInToken.value > 0 && slotsNum.value >= 1 && !loading.value && !exceedsBalance.value)

async function onCreate() {
  error.value = ''
  loading.value = true
  try {
    const res = await apiFetch<{ id: string; total_amount: number; total_slots: number; token: string }>('/api/gifts/create', {
      method: 'POST',
      body: { totalAmount: totalInToken.value, totalSlots: slotsNum.value, token: giftToken.value.address, decimals: giftToken.value.decimals, expiresAt: expiresAt.value, distribution: distribution.value }
    })
    created.value = res
    await refreshBalance()
    refreshBalance()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to create gift'
  } finally { loading.value = false }
}

const giftLink = computed(() =>
  created.value ? `${config.public.appUrl}/gift/${created.value.id}` : ''
)

function copyLink() {
  navigator.clipboard.writeText(giftLink.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function reset() {
  totalRaw.value = ''; slots.value = '5'; giftToken.value = SOL_TOKEN
  error.value = ''; created.value = null; copied.value = false; currency.value = 'TOKEN'; expiresIn.value = 'none'; distribution.value = 'even'
}

watch(open, (v) => { if (!v) reset() })
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

        <!-- Success -->
        <div v-if="created" class="p-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
            <Gift class="h-8 w-8 text-yellow-500" />
          </div>
          <DialogTitle class="text-xl font-bold">Gift created!</DialogTitle>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ formatAmount(created.total_amount) }} {{ giftToken.symbol }} split across {{ created.total_slots }} slots.
            Each person gets {{ perPerson }} {{ giftToken.symbol }}.
          </p>

          <!-- Link -->
          <div class="mt-5 flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3">
            <span class="flex-1 truncate text-left font-mono text-xs text-muted-foreground">{{ giftLink }}</span>
            <button
              class="shrink-0 rounded-lg p-1.5 transition hover:bg-accent"
              @click="copyLink"
            >
              <Check v-if="copied" class="h-4 w-4 text-green-500" />
              <Copy v-else class="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <p class="mt-2 text-xs text-muted-foreground">Share this link with anyone to let them claim their share.</p>

          <!-- Share buttons -->
          <div class="mt-3 flex gap-2">
            <a
              :href="`https://wa.me/?text=${encodeURIComponent('Claim your gift: ' + giftLink)}`"
              target="_blank"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-green-50 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
            >
              <Share2 class="h-3.5 w-3.5" /> WhatsApp
            </a>
            <a
              :href="`https://t.me/share/url?url=${encodeURIComponent(giftLink)}&text=${encodeURIComponent('Claim your gift!')}`"
              target="_blank"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-blue-50 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            >
              <Share2 class="h-3.5 w-3.5" /> Telegram
            </a>
          </div>

          <div class="mt-3 flex gap-3">
            <Button variant="outline" class="flex-1" @click="reset">New gift</Button>
            <Button class="flex-1" @click="open = false">Done</Button>
          </div>
        </div>

        <!-- Form -->
        <template v-else>
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <div class="flex items-center gap-2">
              <Gift class="h-4 w-4 text-yellow-500" />
              <DialogTitle class="text-base font-bold">Create gift</DialogTitle>
            </div>
            <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="open = false">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-5 p-6">

            <p class="text-sm text-muted-foreground">
              Set a total amount and how many people can claim it. Each person gets an equal share. Share the link and they can claim it right away.
            </p>

            <!-- Token -->
            <TokenPicker v-model="giftToken" label="Token" />

            <!-- Total amount -->
            <div data-tour="gift-amount">
              <div class="mb-2 flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total amount</label>
                <span v-if="balance" class="text-xs text-muted-foreground">
                  Balance:
                  <button class="font-semibold text-foreground hover:text-primary transition" @click="totalRaw = selectedBalance?.amount.toFixed(6) ?? ''; currency = 'TOKEN'">
                    {{ selectedBalance?.amount.toFixed(4) ?? '0' }} {{ giftToken.symbol }}
                  </button>
                </span>
              </div>
              <div class="flex gap-2">
                <button
                  class="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-sm font-semibold transition hover:bg-accent"
                  @click="toggleCurrency"
                >
                  <DollarSign v-if="currency === 'USD'" class="h-4 w-4" />
                  <img v-else-if="giftToken.logoURI" :src="giftToken.logoURI" class="h-4 w-4 rounded-full" />
                  <Coins v-else class="h-4 w-4" />
                  {{ currency === 'USD' ? 'USD' : giftToken.symbol }}
                </button>
                <div class="relative flex-1">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    {{ currency === 'USD' ? currencySymbol : '' }}
                  </span>
                  <input
                    :value="totalRaw"
                    inputmode="decimal"
                    placeholder="0.00"
                    :class="currency === 'USD' ? 'pl-8' : 'pl-4'"
                    class="flex h-11 w-full rounded-xl border border-input bg-background pr-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                    @input="onTotalInput"
                  />
                </div>
              </div>
              <p v-if="convertLabel" class="mt-1.5 pl-1 text-xs text-muted-foreground">{{ convertLabel }}</p>
            </div>

            <!-- Slots -->
            <div data-tour="gift-slots">
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Number of slots
              </label>
              <div class="flex items-center gap-3">
                <div class="relative flex-1">
                  <Users class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input v-model="slots" type="number" placeholder="5" class="pl-10" />
                </div>
                <!-- Preset buttons -->
                <div class="flex gap-2">
                  <button
                    v-for="n in [3, 5, 10]"
                    :key="n"
                    :class="['rounded-xl border px-3 py-2 text-sm font-semibold transition', slots === String(n) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary hover:bg-accent']"
                    @click="slots = String(n)"
                  >{{ n }}</button>
                </div>
              </div>
            </div>

            <!-- Distribution -->
            <div>
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Distribution</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  :class="['flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition', distribution === 'even' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent']"
                  @click="distribution = 'even'"
                >
                  <Coins class="h-4 w-4" />
                  Evenly
                  <span class="text-[10px] font-normal" :class="distribution === 'even' ? 'text-primary/70' : 'text-muted-foreground/60'">Same for everyone</span>
                </button>
                <button
                  :class="['flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition', distribution === 'random' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent']"
                  @click="distribution = 'random'"
                >
                  <Shuffle class="h-4 w-4" />
                  Random
                  <span class="text-[10px] font-normal" :class="distribution === 'random' ? 'text-primary/70' : 'text-muted-foreground/60'">Surprise amount</span>
                </button>
              </div>
            </div>

            <!-- Expiry -->
            <div>
              <label class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Clock class="h-3.5 w-3.5" /> Expires
              </label>
              <div class="flex gap-2">
                <button
                  v-for="opt in [{ value: 'none', label: 'Never' }, { value: '24h', label: '24h' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]"
                  :key="opt.value"
                  :class="['flex-1 rounded-xl border py-2 text-xs font-semibold transition', expiresIn === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent']"
                  @click="expiresIn = opt.value as ExpiresIn"
                >{{ opt.label }}</button>
              </div>
            </div>

            <!-- Per person preview -->
            <div v-if="totalInToken > 0" class="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-3">
              <Shuffle v-if="distribution === 'random'" class="h-4 w-4 shrink-0 text-yellow-500" />
              <Coins v-else class="h-4 w-4 shrink-0 text-yellow-500" />
              <div>
                <p v-if="distribution === 'random'" class="text-sm font-semibold">Up to {{ (totalInToken / slotsNum * 2).toFixed(4) }} {{ giftToken.symbol }} per person</p>
                <p v-else class="text-sm font-semibold">{{ perPerson }} {{ giftToken.symbol }} per person</p>
                <p class="text-xs text-muted-foreground">
                  {{ totalInToken.toFixed(4) }} {{ giftToken.symbol }} across {{ slotsNum }} slots
                  <span v-if="distribution === 'random'"> · random amounts</span>
                </p>
              </div>
            </div>

            <!-- Errors -->
            <div v-if="exceedsBalance" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />Not enough balance. You have {{ selectedBalance?.amount.toFixed(4) }} {{ selectedBalance?.symbol }}.
            </div>
            <div v-else-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />{{ error }}
            </div>

            <Button class="w-full" size="lg" :disabled="!canCreate || loading" @click="onCreate" data-tour="gift-share">
              <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <Gift v-else class="h-4 w-4" />
              {{ loading ? 'Creating gift…' : 'Create gift' }}
            </Button>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
