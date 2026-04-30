<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import Input from '~/components/ui/input/Input.vue'
import { Button } from '~/components/ui/button'
import { X, Copy, Check, Link, QrCode, ExternalLink, DollarSign } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const open = defineModel<boolean>('open', { required: true })
const { apiFetch, user } = useAuth()

const SOL_TOKEN: JupToken = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL', name: 'Solana', decimals: 9,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
}

const outputToken = ref<JupToken>(SOL_TOKEN)

watch(outputToken, () => { amountRaw.value = ''; currency.value = 'TOKEN' })

// ---- Amount ----
type Currency = 'TOKEN' | 'USD'
const currency = ref<Currency>('TOKEN')
const amountRaw = ref('')
const memo = ref('')
const tokenPrice = ref<number | null>(null)
const loadingPrice = ref(false)

// Fetch token price when token changes
watch(outputToken, async (t) => {
  tokenPrice.value = null
  loadingPrice.value = true
  try {
    const r = await $fetch<any>(`/api/tokens/price?ids=${t.address}`)
    tokenPrice.value = parseFloat(r?.data?.[t.address]?.price ?? '0') || null
  } catch {} finally { loadingPrice.value = false }
}, { immediate: true })

// price is loaded by the watch above on mount (immediate: true), no need for separate onMounted fetch

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

const convertLabel = computed(() => {
  if (!amountNum.value) return ''
  if (currency.value === 'TOKEN' && tokenPrice.value) {
    return `≈ $${(amountNum.value * tokenPrice.value).toFixed(2)}`
  }
  if (currency.value === 'USD' && tokenPrice.value) {
    return `≈ ${amountInToken.value.toFixed(6)} ${outputToken.value.symbol}`
  }
  return ''
})

function toggleCurrency() {
  if (!tokenPrice.value) return
  if (currency.value === 'TOKEN') {
    if (amountNum.value) amountRaw.value = (amountNum.value * tokenPrice.value).toFixed(2)
    currency.value = 'USD'
  } else {
    if (amountNum.value) amountRaw.value = amountInToken.value.toFixed(6)
    currency.value = 'TOKEN'
  }
}

// ---- Create link ----
const loading = ref(false)
const error = ref('')
const payLink = ref('')
const copiedLink = ref(false)
const createdToken = ref<JupToken>(SOL_TOKEN)
const createdAmount = ref(0)

async function onCreate() {
  error.value = ''
  loading.value = true
  try {
    const res = await apiFetch<{ id: string }>('/api/payments/create-link', {
      method: 'POST',
      body: {
        amount: amountInToken.value,
        memo: memo.value || undefined,
        outputToken: outputToken.value.address,
        outputTokenSymbol: outputToken.value.symbol,
      }
    })
    const config = useRuntimeConfig()
    payLink.value = `${config.public.appUrl}/pay/${res.id}`
    createdToken.value = outputToken.value
    createdAmount.value = amountInToken.value
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to create link'
  } finally { loading.value = false }
}

function copyLink() {
  navigator.clipboard.writeText(payLink.value)
  copiedLink.value = true
  setTimeout(() => (copiedLink.value = false), 1500)
}

function reset() {
  amountRaw.value = ''; memo.value = ''; error.value = ''
  payLink.value = ''; currency.value = 'TOKEN'
  outputToken.value = SOL_TOKEN; searchQuery.value = ''
}

watch(open, (v) => { if (!v) setTimeout(reset, 300) })

const canCreate = computed(() => amountInToken.value > 0 && !loading.value)
const isNonSOL = computed(() => outputToken.value.address !== SOL_TOKEN.address)
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-y-auto">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <DialogTitle class="text-base font-bold">Request Payment</DialogTitle>
          <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="open = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Link generated -->
        <div v-if="payLink" class="p-6 space-y-5">
          <div class="text-center">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Link class="h-6 w-6 text-primary" />
            </div>
            <p class="font-semibold">Payment link ready</p>
            <p class="mt-1 text-sm text-muted-foreground">
              Requesting
              <span class="font-semibold text-foreground">
                {{ formatAmount(createdAmount) }} {{ createdToken.symbol }}
              </span>
              <span v-if="memo"> for {{ memo }}</span>
            </p>
            <p v-if="isNonSOL" class="mt-1 text-xs text-muted-foreground">
              Payer can pay with any token — auto-converted via Jupiter
            </p>
          </div>

          <RequestQr :url="payLink" />

          <div class="rounded-xl bg-secondary px-4 py-3">
            <p class="break-all font-mono text-xs text-muted-foreground leading-relaxed">{{ payLink }}</p>
          </div>

          <div class="flex gap-2">
            <button
              class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium transition hover:bg-accent"
              @click="copyLink"
            >
              <Check v-if="copiedLink" class="h-4 w-4 text-green-500" />
              <Copy v-else class="h-4 w-4" />
              {{ copiedLink ? 'Copied!' : 'Copy link' }}
            </button>
            <a :href="payLink" target="_blank"
              class="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent">
              <ExternalLink class="h-4 w-4" />
              Preview
            </a>
          </div>

          <button class="w-full text-center text-sm text-muted-foreground hover:text-foreground transition" @click="reset">
            Create another
          </button>
        </div>

        <!-- Form -->
        <div v-else class="space-y-4 p-6">
          <!-- Who receives -->
          <div class="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {{ user?.username?.[0]?.toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-semibold">@{{ user?.username }}</p>
              <p class="text-xs text-muted-foreground">Payments go to your wallet</p>
            </div>
          </div>

          <!-- Receive as token -->
          <div>
            <TokenPicker v-model="outputToken" label="Receive as" />
            <p v-if="isNonSOL" class="mt-1.5 pl-1 text-xs text-muted-foreground">
              Payer can pay with any token — auto-converted via Jupiter
            </p>
          </div>

          <!-- Amount -->
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Amount</label>
            <div class="flex gap-2">
              <button
                class="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-sm font-semibold transition hover:bg-accent disabled:opacity-40"
                :disabled="!tokenPrice"
                @click="toggleCurrency"
              >
                <DollarSign v-if="currency === 'USD'" class="h-4 w-4" />
                <img v-else-if="outputToken.logoURI" :src="outputToken.logoURI" class="h-4 w-4 rounded-full" />
                <span v-else class="text-xs">{{ outputToken.symbol[0] }}</span>
                {{ currency === 'USD' ? 'USD' : outputToken.symbol }}
              </button>
              <div class="relative flex-1">
                <input
                  :value="amountRaw"
                  inputmode="decimal"
                  placeholder="0.00"
                  class="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                  @input="onAmountInput"
                />
              </div>
            </div>
            <p v-if="convertLabel" class="mt-1.5 pl-1 text-xs text-muted-foreground">{{ convertLabel }}</p>
          </div>

          <!-- Memo -->
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Note <span class="font-normal normal-case text-muted-foreground/50">(optional)</span>
            </label>
            <Input v-model="memo" placeholder="Coffee, dinner, rent..." />
          </div>

          <!-- Error -->
          <div v-if="error" class="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {{ error }}
          </div>

          <Button class="w-full" size="lg" :disabled="!canCreate" @click="onCreate">
            <QrCode v-if="!loading" class="h-4 w-4" />
            {{ loading ? 'Creating...' : 'Generate link & QR' }}
          </Button>
        </div>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
