<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import Input from '~/components/ui/input/Input.vue'
import { Button } from '~/components/ui/button'
import { X, Plus, Trash2, AlertCircle, CheckCircle2, User, Users, DollarSign, Coins, Share2 } from 'lucide-vue-next'
import { shortAddr } from '~/utils'
import type { Contact } from '~/components/ContactPicker.vue'

const open = defineModel<boolean>('open', { required: true })
const config = useRuntimeConfig()
const { apiFetch } = useAuth()
const { startTourIfNew } = useOnboarding()
watch(open, (v) => { if (v) setTimeout(() => startTourIfNew('split-modal'), 400) })
const { formatDisplay, selectedCurrency, SUPPORTED_CURRENCIES } = useDisplayCurrency()
const currencySymbol = computed(() => SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency.value)?.symbol ?? '$')

// ── Per-row state ──────────────────────────────────────────────────────────
type Row = {
  contact: Contact | null
  amount: string
  pickerOpen: boolean
  registered: string | null | undefined
}

function makeRow(): Row {
  return { contact: null, amount: '', pickerOpen: false, registered: undefined }
}

const rows = ref<Row[]>([makeRow(), makeRow()])

async function selectContact(i: number, c: Contact) {
  const row = rows.value[i]
  if (!row) return
  row.contact = c
  row.pickerOpen = false
  row.registered = undefined
  if (!c.username) {
    try {
      const res = await $fetch<{ username: string | null }[]>('/api/users/search', { query: { q: c.wallet_address } })
      if (rows.value[i]) rows.value[i]!.registered = res[0]?.username ?? null
    } catch { if (rows.value[i]) rows.value[i]!.registered = null }
  }
}

function openPicker(i: number) {
  rows.value[i]?.pickerOpen === undefined || (rows.value[i]!.pickerOpen = true)
}

function clearRow(i: number) {
  if (rows.value[i]) rows.value[i]!.contact = null
}

function addRow() { rows.value.push(makeRow()) }
function removeRow(i: number) { if (rows.value.length > 1) rows.value.splice(i, 1) }

// ── Rest of form ───────────────────────────────────────────────────────────
const title = ref('')
const totalRaw = ref('')
const loading = ref(false)
const error = ref('')
const createdId = ref('')

const SOL_TOKEN: JupToken = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL', name: 'Solana', decimals: 9,
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
}
const outputToken = ref<JupToken>(SOL_TOKEN)
const tokenPrice = ref<number | null>(null)
type Currency = 'TOKEN' | 'USD'
const currency = ref<Currency>('TOKEN')

watch(outputToken, async (t) => {
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
    return `≈ ${totalInToken.value.toFixed(6)} ${outputToken.value.symbol}`
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

const rowSymbol = computed(() => outputToken.value.symbol === 'USDC' ? '$' : '◎')

function onTotalInput(e: Event) {
  let s = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
  totalRaw.value = s
}

function splitEvenly() {
  if (!totalInToken.value || !rows.value.length) return
  const each = (totalInToken.value / rows.value.length).toFixed(4)
  rows.value = rows.value.map(r => ({ ...r, amount: each }))
}

const participantsTotal = computed(() =>
  rows.value.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
)
const exceedsTotal = computed(() =>
  totalInToken.value > 0 && participantsTotal.value > totalInToken.value + 0.000001
)

const canCreate = computed(() =>
  title.value.trim() &&
  totalInToken.value > 0 &&
  rows.value.length >= 2 &&
  rows.value.every(r => r.contact !== null && parseFloat(r.amount) > 0) &&
  !exceedsTotal.value &&
  !loading.value
)

async function onCreate() {
  error.value = ''
  loading.value = true
  try {
    const res = await apiFetch<{ id: string }>('/api/split/create', {
      method: 'POST',
      body: {
        title: title.value,
        totalAmount: totalInToken.value,
        token: outputToken.value.address,
        participants: rows.value.map(r => ({
          username: r.contact?.username ?? r.contact?.wallet_address ?? '',
          amount: parseFloat(r.amount)
        }))
      }
    })
    createdId.value = res.id
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to create split'
  } finally { loading.value = false }
}

function goToSplit() {
  open.value = false
  navigateTo(`/app/split/${createdId.value}`)
}

function reset() {
  title.value = ''; totalRaw.value = ''
  rows.value = [makeRow(), makeRow()]
  error.value = ''; createdId.value = ''; outputToken.value = SOL_TOKEN; currency.value = 'TOKEN'
}

watch(open, (v) => { if (!v) setTimeout(reset, 300) })
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-y-auto">

        <!-- Success -->
        <div v-if="createdId" class="p-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
            <CheckCircle2 class="h-8 w-8 text-purple-500" />
          </div>
          <DialogTitle class="text-xl font-bold">Split created</DialogTitle>
          <p class="mt-2 text-sm text-muted-foreground">
            "{{ title }}" — {{ totalInToken.toFixed(4) }} {{ outputToken.symbol }} across {{ rows.length }} people
          </p>
          <p v-if="outputToken.address !== SOL_TOKEN.address" class="mt-1 text-xs text-muted-foreground">
            Each person can pay with any token — auto-converted
          </p>
          <div class="mt-4 flex gap-2">
            <a
              :href="`https://wa.me/?text=${encodeURIComponent('Pay your share: ' + config.public.appUrl + '/app/split/' + createdId)}`"
              target="_blank"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-green-50 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
            >
              <Share2 class="h-3.5 w-3.5" /> WhatsApp
            </a>
            <a
              :href="`https://t.me/share/url?url=${encodeURIComponent(config.public.appUrl + '/app/split/' + createdId)}&text=${encodeURIComponent('Pay your share!')}`"
              target="_blank"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-blue-50 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            >
              <Share2 class="h-3.5 w-3.5" /> Telegram
            </a>
          </div>

          <div class="mt-3 flex gap-3">
            <Button variant="outline" class="flex-1" @click="reset">New split</Button>
            <Button class="flex-1" @click="goToSplit">
              <Users class="h-4 w-4" /> View split
            </Button>
          </div>
        </div>

        <!-- Form -->
        <template v-else>
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <DialogTitle class="text-base font-bold">Split bill</DialogTitle>
            <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="open = false">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-4 p-6">

            <!-- Title -->
            <div data-tour="split-title">
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Title</label>
              <Input v-model="title" placeholder="Dinner at Sushi Tei, Bali trip…" />
            </div>

            <!-- Settle in token -->
            <div>
              <TokenPicker v-model="outputToken" label="Settle in" />
              <p v-if="outputToken.address !== SOL_TOKEN.address" class="mt-1.5 pl-1 text-xs text-muted-foreground">
                Each person can pay with any token — auto-converted
              </p>
            </div>

            <!-- Total -->
            <div data-tour="split-amount">
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</label>
              <div class="flex gap-2">
                <button
                  class="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-sm font-semibold transition hover:bg-accent"
                  @click="toggleCurrency"
                >
                  <DollarSign v-if="currency === 'USD'" class="h-4 w-4" />
                  <img v-else-if="outputToken.logoURI" :src="outputToken.logoURI" class="h-4 w-4 rounded-full" />
                  <Coins v-else class="h-4 w-4" />
                  {{ currency === 'USD' ? 'USD' : outputToken.symbol }}
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

            <!-- Participants -->
            <div data-tour="split-participants">
              <div class="mb-2 flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Participants</label>
                <button
                  class="text-xs font-semibold text-primary transition hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
                  :disabled="!totalInToken"
                  @click="splitEvenly"
                >
                  Split evenly
                </button>
              </div>

              <div class="space-y-2">
                <div v-for="(row, i) in rows" :key="i" class="flex items-center gap-2">

                  <!-- Contact button -->
                  <button
                    v-if="!row.contact"
                    type="button"
                    class="flex h-11 flex-1 items-center gap-2 rounded-xl border border-dashed border-border bg-secondary px-3 text-sm text-muted-foreground transition hover:bg-accent"
                    @click="openPicker(i)"
                  >
                    <User class="h-4 w-4 shrink-0" />
                    <span>Select contact…</span>
                  </button>
                  <div v-else class="flex-1 min-w-0">
                    <button
                      type="button"
                      class="flex h-11 w-full items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/5 px-3 text-left transition hover:bg-green-500/10"
                      @click="openPicker(i)"
                    >
                      <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        <span v-if="row.contact.username">{{ row.contact.username[0]?.toUpperCase() }}</span>
                        <User v-else class="h-3.5 w-3.5" />
                      </div>
                      <span class="flex-1 truncate text-sm font-semibold">
                        {{ row.contact.username ? '@' + row.contact.username : shortAddr(row.contact.wallet_address, 6) }}
                      </span>
                      <CheckCircle2 class="h-4 w-4 shrink-0 text-green-500" />
                    </button>
                    <template v-if="!row.contact.username">
                      <p v-if="row.registered === undefined" class="mt-0.5 text-[10px] text-muted-foreground animate-pulse px-1">Checking…</p>
                      <p v-else-if="row.registered" class="mt-0.5 text-[10px] text-green-600 dark:text-green-400 px-1">✓ @{{ row.registered }}</p>
                      <p v-else class="mt-0.5 text-[10px] text-muted-foreground px-1">Not registered</p>
                    </template>
                  </div>

                  <!-- Amount -->
                  <div class="relative w-28">
                    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{{ rowSymbol }}</span>
                    <input
                      v-model="row.amount"
                      inputmode="decimal"
                      placeholder="0.00"
                      class="flex h-11 w-full rounded-xl border border-input bg-background pl-7 pr-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                    />
                  </div>

                  <!-- Delete -->
                  <button
                    :disabled="rows.length <= 1"
                    class="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-30"
                    @click="removeRow(i)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button
                class="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary transition hover:opacity-70"
                @click="addRow"
              >
                <Plus class="h-4 w-4" /> Add person
              </button>
            </div>

            <!-- Error -->
            <div v-if="rows.length < 2" class="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertCircle class="h-4 w-4 shrink-0" />Add at least 2 participants to split a bill.
            </div>
            <div v-else-if="exceedsTotal" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />Participant amounts exceed the total ({{ totalInToken.toFixed(4) }} {{ outputToken.symbol }}).
            </div>
            <div v-else-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />{{ error }}
            </div>

            <Button class="w-full" size="lg" :disabled="!canCreate || loading" @click="onCreate">
              Create split
            </Button>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <!-- One ContactPicker per row, mounted lazily -->
  <ContactPicker
    v-for="(row, i) in rows"
    :key="i"
    v-model:open="row.pickerOpen"
    @select="(c) => selectContact(i, c)"
  />
</template>
