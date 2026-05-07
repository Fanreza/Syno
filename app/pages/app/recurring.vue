<script setup lang="ts">
import { RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, Calendar, X, Send, AlertCircle, CheckCircle2, Users, DollarSign, Coins, User, ChevronDown } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import Input from '~/components/ui/input/Input.vue'
import { formatAmount, shortAddr } from '~/utils'
import type { Contact } from '~/components/ContactPicker.vue'
import { toast } from 'vue-sonner'

const { apiFetch } = useAuth()
const { confirm } = useConfirm()
const tab = ref<'recurring' | 'payroll'>('recurring')

// ── RECURRING ────────────────────────────────────────────────────────────────

type RecurringPayment = {
  id: string
  recipient_username: string | null
  recipient_address: string | null
  amount: number
  token: string
  decimals: number
  memo: string | null
  frequency: 'weekly' | 'monthly'
  next_run_at: string
  last_run_at: string | null
  active: boolean
}

const SOL_MINT = 'So11111111111111111111111111111111111111112'
const KNOWN_TOKENS: Record<string, string> = {
  [SOL_MINT]: 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
}
function tokenLabel(mint: string) {
  return KNOWN_TOKENS[mint] ?? mint.slice(0, 6) + '…'
}

const { data: recurringList, pending: recurringPending, refresh: refreshRecurring } = useAsyncData<RecurringPayment[]>(
  'recurring', () => apiFetch('/api/recurring'), { lazy: true, server: false, default: () => [] }
)

// Form state
const showForm = ref(false)
const recurringRecipient = ref<Contact | null>(null)
const recurringToken = ref<JupToken>(SOL_TOKEN)
const recurringAmount = ref('')
const recurringMemo = ref('')
const recurringFrequency = ref<'weekly' | 'monthly'>('monthly')
const recurringPickerOpen = ref(false)
const creating = ref(false)
const createError = ref('')

function selectRecurringContact(c: Contact) {
  recurringRecipient.value = c
}
function clearRecurringRecipient() {
  recurringRecipient.value = null
}

const canCreate = computed(() =>
  recurringRecipient.value !== null && parseFloat(recurringAmount.value) > 0
)

async function onCreate() {
  createError.value = ''
  creating.value = true
  try {
    const c = recurringRecipient.value!
    await apiFetch('/api/recurring/create', {
      method: 'POST',
      body: {
        recipientUsername: c.username ?? undefined,
        recipientAddress: c.username ? undefined : c.wallet_address,
        amount: parseFloat(recurringAmount.value),
        token: recurringToken.value.address,
        decimals: recurringToken.value.decimals,
        frequency: recurringFrequency.value,
        memo: recurringMemo.value.trim() || undefined,
      },
    })
    showForm.value = false
    recurringRecipient.value = null
    recurringAmount.value = ''
    recurringMemo.value = ''
    recurringFrequency.value = 'monthly'
    recurringToken.value = SOL_TOKEN
    toast.success('Recurring payment scheduled')
    refreshRecurring()
  } catch (e: any) {
    createError.value = e?.data?.message ?? 'Could not create.'
    toast.error(createError.value)
  } finally { creating.value = false }
}

const toggling = ref<string | null>(null)
async function onToggle(p: RecurringPayment) {
  toggling.value = p.id
  try {
    await apiFetch(`/api/recurring/${p.id}/toggle`, { method: 'POST' })
    refreshRecurring()
    toast.info(p.active ? 'Payment paused' : 'Payment resumed')
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not update payment.')
  } finally { toggling.value = null }
}

const deleting = ref<string | null>(null)
async function onDelete(p: RecurringPayment) {
  const label = p.recipient_username ? `@${p.recipient_username}` : p.recipient_address?.slice(0, 8)
  const ok = await confirm({ title: 'Delete recurring payment', message: `Stop recurring payments to ${label}?`, confirmLabel: 'Delete', destructive: true })
  if (!ok) return
  deleting.value = p.id
  try {
    await apiFetch(`/api/recurring/${p.id}`, { method: 'DELETE' })
    toast.success('Recurring payment deleted')
    refreshRecurring()
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not delete payment.')
  } finally { deleting.value = null }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── PAYROLL ──────────────────────────────────────────────────────────────────

const { formatDisplay, selectedCurrency, SUPPORTED_CURRENCIES } = useDisplayCurrency()
const { balance, refresh: refreshBalance } = useBalance()
const currencySymbol = computed(() => SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency.value)?.symbol ?? '$')

interface Row { username: string; amount: string; memo: string }

const payrollLabel = ref('')
const payrollToken = ref<JupToken>(SOL_TOKEN)
const rows = ref<Row[]>([{ username: '', amount: '', memo: '' }])
const payrollCurrency = ref<'TOKEN' | 'USD'>('TOKEN')
const tokenPrice = ref<number | null>(null)
const payrollLoading = ref(false)
const payrollError = ref('')
const payrollResult = ref<{ succeeded: number; failed: number; results: any[] } | null>(null)

const isSolanaAddress = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)

function rowAddressError(username: string): string | null {
  const v = username.trim()
  if (!v || v.startsWith('@')) return null
  if (!isSolanaAddress(v)) return 'Invalid Solana address'
  return null
}

const registeredCache = ref<Record<string, string | null>>({})
async function lookupAddress(address: string) {
  if (registeredCache.value[address] !== undefined) return
  registeredCache.value[address] = null
  try {
    const res = await $fetch<{ username: string | null }[]>('/api/users/search', { query: { q: address } })
    registeredCache.value[address] = res[0]?.username ?? null
  } catch {}
}

watch(rows, (newRows) => {
  for (const row of newRows) {
    const v = row.username.trim()
    if (v && !v.startsWith('@') && isSolanaAddress(v)) lookupAddress(v)
  }
}, { deep: true })

watch(payrollToken, async (t) => {
  tokenPrice.value = null
  payrollCurrency.value = 'TOKEN'
  rows.value.forEach(r => (r.amount = ''))
  try {
    const r = await $fetch<any>(`/api/tokens/price?ids=${t.address}`)
    tokenPrice.value = parseFloat(r?.data?.[t.address]?.price ?? '0') || null
  } catch {}
}, { immediate: true })

function toggleCurrency() {
  if (!tokenPrice.value) return
  if (payrollCurrency.value === 'TOKEN') {
    rows.value.forEach(r => { const n = parseFloat(r.amount); if (n) r.amount = (n * tokenPrice.value!).toFixed(2) })
    payrollCurrency.value = 'USD'
  } else {
    rows.value.forEach(r => { const n = parseFloat(r.amount); if (n) r.amount = (n / tokenPrice.value!).toFixed(6) })
    payrollCurrency.value = 'TOKEN'
  }
}

function rowAmountInToken(amount: string): number {
  const n = parseFloat(amount) || 0
  if (payrollCurrency.value === 'TOKEN') return n
  if (!tokenPrice.value) return 0
  return n / tokenPrice.value
}

const totalAmount = computed(() => rows.value.reduce((s, r) => s + rowAmountInToken(r.amount), 0))

const selectedBalance = computed(() => {
  if (!balance.value) return null
  if (payrollToken.value.address === SOL_MINT) return { amount: balance.value.sol, symbol: 'SOL' }
  const t = balance.value.tokens?.find((t: any) => t.mint === payrollToken.value.address)
  return t ? { amount: t.balance, symbol: t.symbol } : { amount: 0, symbol: payrollToken.value.symbol }
})

const exceedsBalance = computed(() => totalAmount.value > 0 && !!selectedBalance.value && totalAmount.value > selectedBalance.value.amount)
const hasAddressErrors = computed(() => rows.value.some(r => rowAddressError(r.username) !== null))
const validRows = computed(() => rows.value.filter(r => r.username.trim() && rowAmountInToken(r.amount) > 0 && !rowAddressError(r.username)))
const canSend = computed(() => validRows.value.length > 0 && !payrollLoading.value && !exceedsBalance.value && !hasAddressErrors.value)

function addRow() { rows.value.push({ username: '', amount: '', memo: '' }) }
function removeRow(i: number) { if (rows.value.length > 1) rows.value.splice(i, 1) }
function fillEqual() {
  const n = rows.value.length
  if (!selectedBalance.value || n === 0) return
  const each = selectedBalance.value.amount / n
  rows.value.forEach(r => (r.amount = payrollCurrency.value === 'USD' && tokenPrice.value ? (each * tokenPrice.value).toFixed(2) : each.toFixed(6)))
}

const pickerOpenIndex = ref<number | null>(null)
function openPicker(i: number) { pickerOpenIndex.value = i }
function onPickerOpen(val: boolean) { if (!val) pickerOpenIndex.value = null }
function selectContact(c: { username: string | null; wallet_address: string }) {
  const i = pickerOpenIndex.value
  if (i === null || !rows.value[i]) return
  rows.value[i]!.username = c.username ? `@${c.username}` : c.wallet_address
  pickerOpenIndex.value = null
}

async function onSend() {
  payrollError.value = ''
  payrollLoading.value = true
  try {
    const res = await apiFetch<{ results: any[]; succeeded: number; failed: number }>('/api/payroll/send', {
      method: 'POST',
      body: {
        recipients: validRows.value.map(r => {
          const raw = r.username.trim()
          const isAddr = isSolanaAddress(raw)
          return { username: isAddr ? undefined : raw.replace(/^@/, ''), address: isAddr ? raw : undefined, amount: rowAmountInToken(r.amount), memo: r.memo || undefined }
        }),
        token: payrollToken.value.address,
        decimals: payrollToken.value.decimals,
        label: payrollLabel.value || undefined,
      },
    })
    payrollResult.value = res
    toast.success(`Payroll sent — ${res.succeeded} of ${res.results.length} succeeded`)
    await refreshBalance()
    setTimeout(() => refreshBalance(), 3000)
  } catch (e: any) {
    payrollError.value = e?.data?.statusMessage || e?.message || 'Failed to send'
    toast.error(payrollError.value)
  } finally { payrollLoading.value = false }
}

function resetPayroll() {
  payrollLabel.value = ''; payrollToken.value = SOL_TOKEN; payrollCurrency.value = 'TOKEN'
  rows.value = [{ username: '', amount: '', memo: '' }]
  payrollError.value = ''; payrollResult.value = null
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">

    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Transfers</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Scheduled and bulk payments.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="tab === 'recurring'"
          class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
          @click="refreshRecurring()"
        >
          <RefreshCw class="h-3.5 w-3.5" />
        </button>
        <button
          v-if="tab === 'recurring'"
          class="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          @click="showForm = !showForm"
        >
          <Plus class="h-4 w-4" /> New
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-5 flex gap-1 rounded-xl border border-border bg-secondary p-1">
      <button
        class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition"
        :class="tab === 'recurring' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = 'recurring'"
      >
        <Calendar class="h-4 w-4" /> Recurring
        <span v-if="recurringList?.length" class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{{ recurringList.length }}</span>
      </button>
      <button
        class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition"
        :class="tab === 'payroll' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = 'payroll'"
      >
        <Users class="h-4 w-4" /> Payroll
      </button>
    </div>

    <!-- ── RECURRING TAB ── -->
    <template v-if="tab === 'recurring'">
      <Transition name="fade-slide">
        <div v-if="showForm" class="mb-5 rounded-2xl border border-border bg-card p-5 space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm font-bold">New recurring payment</p>
            <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="showForm = false"><X class="h-4 w-4" /></button>
          </div>

          <!-- Recipient — same pattern as SendModal -->
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">To</label>
            <button
              v-if="!recurringRecipient"
              class="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-secondary px-4 py-3 transition hover:bg-accent"
              @click="recurringPickerOpen = true"
            >
              <User class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm text-muted-foreground">Select contact or address…</span>
              <ChevronDown class="ml-auto h-4 w-4 text-muted-foreground" />
            </button>
            <div v-else class="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2.5">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  <span v-if="recurringRecipient.username">{{ recurringRecipient.username[0]?.toUpperCase() }}</span>
                  <User v-else class="h-4 w-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold">{{ recurringRecipient.username ? '@' + recurringRecipient.username : 'Wallet address' }}</p>
                  <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(recurringRecipient.wallet_address, 8) }}</p>
                </div>
                <button class="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="clearRecurringRecipient">
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Token -->
          <TokenPicker v-model="recurringToken" label="Token" />

          <!-- Amount -->
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Amount</label>
            <Input v-model="recurringAmount" type="number" inputmode="decimal" placeholder="0.00" />
          </div>

          <!-- Frequency -->
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Frequency</label>
            <div class="flex gap-2">
              <button class="flex-1 rounded-xl border py-2 text-sm font-medium transition" :class="recurringFrequency === 'weekly' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent'" @click="recurringFrequency = 'weekly'">Weekly</button>
              <button class="flex-1 rounded-xl border py-2 text-sm font-medium transition" :class="recurringFrequency === 'monthly' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent'" @click="recurringFrequency = 'monthly'">Monthly</button>
            </div>
          </div>

          <!-- Memo -->
          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Memo <span class="font-normal normal-case text-muted-foreground/50">(optional)</span>
            </label>
            <Input v-model="recurringMemo" placeholder="Rent, subscription…" />
          </div>

          <div v-if="createError" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle class="h-4 w-4 shrink-0" /> {{ createError }}
          </div>

          <Button class="w-full" size="lg" :disabled="!canCreate || creating" @click="onCreate">
            <Calendar v-if="!creating" class="mr-2 h-4 w-4" />
            {{ creating ? 'Scheduling…' : 'Schedule payment' }}
          </Button>
        </div>
      </Transition>

      <div v-if="recurringPending" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-20 skeleton rounded-2xl" />
      </div>

      <div v-else-if="recurringList?.length" class="space-y-3">
        <div v-for="p in recurringList" :key="p.id" class="rounded-2xl border border-border bg-card p-4 flex items-start gap-4" :class="!p.active ? 'opacity-50' : ''">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calendar class="h-5 w-5" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ p.recipient_username ? '@' + p.recipient_username : p.recipient_address?.slice(0, 8) + '…' }}</p>
            <p class="text-xs text-muted-foreground">{{ formatAmount(p.amount) }} {{ tokenLabel(p.token) }} · {{ p.frequency }}</p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">Next: {{ fmtDate(p.next_run_at) }}<span v-if="p.last_run_at"> · Last: {{ fmtDate(p.last_run_at) }}</span></p>
            <p v-if="p.memo" class="mt-0.5 text-[11px] text-muted-foreground italic truncate">{{ p.memo }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button class="rounded-lg p-1.5 transition hover:bg-accent" :disabled="toggling === p.id" @click="onToggle(p)">
              <ToggleRight v-if="p.active" class="h-5 w-5 text-primary" />
              <ToggleLeft v-else class="h-5 w-5 text-muted-foreground" />
            </button>
            <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" :disabled="deleting === p.id" @click="onDelete(p)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-24 text-center">
        <Calendar class="mb-4 h-10 w-10 text-muted-foreground opacity-40" />
        <p class="font-semibold">No recurring payments</p>
        <p class="mt-1 text-sm text-muted-foreground">Schedule a payment and it runs automatically.</p>
        <button class="mt-4 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90" @click="showForm = true">
          <Plus class="h-4 w-4" /> New recurring payment
        </button>
      </div>
    </template>

    <!-- ── PAYROLL TAB ── -->
    <template v-else>

      <!-- Success -->
      <div v-if="payrollResult" class="rounded-2xl border border-border bg-card p-8 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 class="h-8 w-8 text-green-500" />
        </div>
        <p class="text-xl font-bold">Payroll sent</p>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ payrollResult.succeeded }} of {{ payrollResult.results.length }} payments succeeded.
          <span v-if="payrollResult.failed > 0" class="text-destructive"> {{ payrollResult.failed }} failed.</span>
        </p>
        <div class="mt-5 max-h-48 overflow-y-auto space-y-2 text-left">
          <div
            v-for="(r, i) in payrollResult.results" :key="i"
            class="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm"
            :class="r.error ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-secondary/50'"
          >
            <span class="font-medium">{{ r.username ? '@' + r.username : r.address }}</span>
            <span v-if="r.error" class="text-destructive text-xs">{{ r.error }}</span>
            <span v-else class="text-green-500 text-xs">{{ formatAmount(r.amount) }} ✓</span>
          </div>
        </div>
        <div class="mt-5 flex gap-3">
          <Button variant="outline" class="flex-1" @click="resetPayroll">New payroll</Button>
        </div>
      </div>

      <!-- Form -->
      <div v-else class="rounded-2xl border border-border bg-card p-5 space-y-4">
        <!-- Label -->
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Label (optional)</label>
          <input v-model="payrollLabel" placeholder="e.g. May salary" class="flex h-10 w-full rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground" />
        </div>

        <!-- Token -->
        <TokenPicker v-model="payrollToken" label="Token" />

        <!-- Currency + balance -->
        <div class="flex items-center justify-between">
          <button class="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-sm font-semibold transition hover:bg-accent" @click="toggleCurrency">
            <DollarSign v-if="payrollCurrency === 'USD'" class="h-4 w-4" />
            <img v-else-if="payrollToken.logoURI" :src="payrollToken.logoURI" class="h-4 w-4 rounded-full" />
            <Coins v-else class="h-4 w-4" />
            {{ payrollCurrency === 'USD' ? 'USD' : payrollToken.symbol }}
          </button>
          <div class="text-xs text-muted-foreground text-right">
            <span>Total: <span class="font-semibold text-foreground">{{ formatAmount(totalAmount) }} {{ payrollToken.symbol }}</span></span>
            <span class="mx-1.5">·</span>
            <span>Balance: <span class="font-semibold text-foreground">{{ selectedBalance?.amount.toFixed(4) ?? '0' }} {{ payrollToken.symbol }}</span></span>
          </div>
        </div>

        <!-- Recipients -->
        <div class="space-y-3">
          <div v-for="(row, i) in rows" :key="i" class="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
            <div class="flex items-center gap-2">
              <div class="relative min-w-0 flex-1">
                <input
                  v-model="row.username"
                  placeholder="@username or address"
                  class="h-9 w-full rounded-xl border bg-background pl-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                  :class="rowAddressError(row.username) ? 'border-destructive' : 'border-input'"
                />
                <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground" @click="openPicker(i)">
                  <Users class="h-4 w-4" />
                </button>
              </div>
              <button class="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" @click="removeRow(i)">
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
            <p v-if="rowAddressError(row.username)" class="text-xs text-destructive px-1">{{ rowAddressError(row.username) }}</p>
            <p v-else-if="isSolanaAddress(row.username.trim()) && registeredCache[row.username.trim()] !== undefined" class="flex items-center gap-1 px-1 text-xs">
              <template v-if="registeredCache[row.username.trim()]">
                <span class="text-green-600 dark:text-green-400">✓ Registered as <span class="font-semibold">@{{ registeredCache[row.username.trim()] }}</span></span>
              </template>
              <template v-else>
                <span class="text-muted-foreground">Not registered — sending to address</span>
              </template>
            </p>
            <div class="relative">
              <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">{{ payrollCurrency === 'USD' ? currencySymbol : '' }}</span>
              <input v-model="row.amount" type="text" inputmode="decimal" placeholder="0.00" :class="payrollCurrency === 'USD' ? 'pl-8' : 'pl-4'" class="flex h-11 w-full rounded-xl border border-input bg-background pr-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground" />
            </div>
            <p v-if="row.amount && tokenPrice && payrollCurrency === 'USD'" class="pl-1 text-xs text-muted-foreground">≈ {{ rowAmountInToken(row.amount).toFixed(6) }} {{ payrollToken.symbol }}</p>
            <p v-else-if="row.amount && tokenPrice && payrollCurrency === 'TOKEN'" class="pl-1 text-xs text-muted-foreground">≈ {{ formatDisplay(parseFloat(row.amount) * (tokenPrice ?? 0)) }}</p>
            <input v-model="row.memo" placeholder="Note (optional)" class="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground" />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent" @click="addRow">
            <Plus class="h-3.5 w-3.5" /> Add recipient
          </button>
          <button class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent" @click="fillEqual">
            Split equally
          </button>
        </div>

        <!-- Errors -->
        <div v-if="validRows.length === 0 && rows.some(r => r.username.trim())" class="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertCircle class="h-4 w-4 shrink-0" /> Fill in both a recipient and amount for each row.
        </div>
        <div v-else-if="exceedsBalance" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle class="h-4 w-4 shrink-0" /> Not enough balance. You have {{ selectedBalance?.amount.toFixed(4) }} {{ payrollToken.symbol }}.
        </div>
        <div v-else-if="payrollError" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle class="h-4 w-4 shrink-0" /> {{ payrollError }}
        </div>

        <Button class="w-full" size="lg" :disabled="!canSend || payrollLoading" @click="onSend">
          <Send v-if="!payrollLoading" class="mr-2 h-4 w-4" />
          {{ payrollLoading ? `Sending to ${validRows.length} recipients…` : `Send to ${validRows.length} recipient${validRows.length !== 1 ? 's' : ''}` }}
        </Button>
      </div>
    </template>

  </div>

  <ContactPicker
    :open="pickerOpenIndex !== null"
    @update:open="onPickerOpen"
    @select="selectContact"
  />
  <ContactPicker
    v-model:open="recurringPickerOpen"
    @select="selectRecurringContact"
  />
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
