<script setup lang="ts">
import { RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, Calendar, X } from 'lucide-vue-next'

const { apiFetch } = useAuth()

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
  created_at: string
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

const { data, pending, refresh } = useAsyncData<RecurringPayment[]>(
  'recurring',
  () => apiFetch('/api/recurring'),
  { lazy: true, server: false, default: () => [] }
)

// Create form
const showForm = ref(false)
const form = reactive({
  recipient: '',
  amount: '',
  token: SOL_MINT,
  memo: '',
  frequency: 'monthly' as 'weekly' | 'monthly',
})
const creating = ref(false)
const createError = ref('')

const canCreate = computed(() => {
  const r = form.recipient.trim()
  const a = parseFloat(form.amount)
  return r.length >= 2 && a > 0
})

async function onCreate() {
  createError.value = ''
  creating.value = true
  try {
    const body: Record<string, unknown> = {
      amount: parseFloat(form.amount),
      token: form.token,
      frequency: form.frequency,
      memo: form.memo.trim() || undefined,
    }
    const r = form.recipient.trim()
    if (r.startsWith('@') || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r)) {
      body.recipientUsername = r.replace(/^@/, '')
    } else {
      body.recipientAddress = r
    }
    await apiFetch('/api/recurring/create', { method: 'POST', body })
    showForm.value = false
    form.recipient = ''
    form.amount = ''
    form.memo = ''
    form.frequency = 'monthly'
    refresh()
  } catch (e: any) {
    createError.value = e?.data?.message ?? 'Could not create recurring payment.'
  } finally {
    creating.value = false
  }
}

const toggling = ref<string | null>(null)
async function onToggle(p: RecurringPayment) {
  toggling.value = p.id
  try {
    await apiFetch(`/api/recurring/${p.id}/toggle`, { method: 'POST' })
    refresh()
  } finally {
    toggling.value = null
  }
}

const deleting = ref<string | null>(null)
async function onDelete(p: RecurringPayment) {
  if (!confirm(`Delete recurring payment to ${p.recipient_username ? '@' + p.recipient_username : p.recipient_address?.slice(0, 8)}?`)) return
  deleting.value = p.id
  try {
    await apiFetch(`/api/recurring/${p.id}`, { method: 'DELETE' })
    refresh()
  } finally {
    deleting.value = null
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtAmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">

    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Recurring</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Scheduled payments that run automatically.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
          @click="refresh()"
        >
          <RefreshCw class="h-3.5 w-3.5" />
        </button>
        <button
          class="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          @click="showForm = !showForm"
        >
          <Plus class="h-4 w-4" /> New
        </button>
      </div>
    </div>

    <!-- Create form -->
    <Transition name="fade-slide">
      <div v-if="showForm" class="mb-5 rounded-2xl border border-border bg-card p-5 space-y-3">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm font-semibold">New recurring payment</p>
          <button class="text-muted-foreground hover:text-foreground" @click="showForm = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div>
          <label class="mb-1 block text-xs text-muted-foreground">Recipient (@username or address)</label>
          <input
            v-model="form.recipient"
            placeholder="@username or wallet address"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Amount</label>
            <input
              v-model="form.amount"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Token</label>
            <select
              v-model="form.token"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option :value="SOL_MINT">SOL</option>
              <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">USDC</option>
              <option value="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB">USDT</option>
            </select>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs text-muted-foreground">Frequency</label>
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-xl border py-2 text-sm font-medium transition"
              :class="form.frequency === 'weekly' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent'"
              @click="form.frequency = 'weekly'"
            >Weekly</button>
            <button
              class="flex-1 rounded-xl border py-2 text-sm font-medium transition"
              :class="form.frequency === 'monthly' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent'"
              @click="form.frequency = 'monthly'"
            >Monthly</button>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs text-muted-foreground">Memo (optional)</label>
          <input
            v-model="form.memo"
            placeholder="e.g. Rent, subscription…"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <p v-if="createError" class="text-xs text-destructive">{{ createError }}</p>

        <button
          class="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
          :disabled="!canCreate || creating"
          @click="onCreate"
        >
          {{ creating ? 'Scheduling…' : 'Schedule payment' }}
        </button>
      </div>
    </Transition>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 skeleton rounded-2xl" />
    </div>

    <!-- List -->
    <div v-else-if="data && data.length" class="space-y-3">
      <div
        v-for="p in data"
        :key="p.id"
        class="rounded-2xl border border-border bg-card p-4 flex items-start gap-4"
        :class="!p.active ? 'opacity-50' : ''"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Calendar class="h-5 w-5" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold truncate">
            {{ p.recipient_username ? '@' + p.recipient_username : p.recipient_address?.slice(0, 8) + '…' }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ fmtAmt(p.amount) }} {{ tokenLabel(p.token) }} &middot; {{ p.frequency }}
          </p>
          <p class="mt-0.5 text-[11px] text-muted-foreground">
            Next: {{ fmtDate(p.next_run_at) }}
            <span v-if="p.last_run_at"> &middot; Last: {{ fmtDate(p.last_run_at) }}</span>
          </p>
          <p v-if="p.memo" class="mt-0.5 text-[11px] text-muted-foreground truncate italic">{{ p.memo }}</p>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            class="rounded-lg p-1.5 transition hover:bg-accent"
            :disabled="toggling === p.id"
            @click="onToggle(p)"
            :title="p.active ? 'Pause' : 'Resume'"
          >
            <ToggleRight v-if="p.active" class="h-5 w-5 text-primary" />
            <ToggleLeft v-else class="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            :disabled="deleting === p.id"
            @click="onDelete(p)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="flex flex-col items-center justify-center py-24 text-center">
      <Calendar class="mb-4 h-10 w-10 text-muted-foreground opacity-40" />
      <p class="font-semibold">No recurring payments</p>
      <p class="mt-1 text-sm text-muted-foreground">Schedule a payment and it runs automatically.</p>
      <button
        class="mt-4 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        @click="showForm = true"
      >
        <Plus class="h-4 w-4" /> New recurring payment
      </button>
    </div>

  </div>
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
