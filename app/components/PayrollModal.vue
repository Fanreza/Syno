<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import { Button } from '~/components/ui/button'
import { X, Plus, Trash2, Send, AlertCircle, CheckCircle2, Users } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const open = defineModel<boolean>('open', { required: true })
const { apiFetch } = useAuth()
const { balance, refresh: refreshBalance } = useBalance()

interface Row { username: string; amount: string; memo: string }

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

const label = ref('')
const token = ref<JupToken>(SOL_TOKEN)
const rows = ref<Row[]>([{ username: '', amount: '', memo: '' }])

watch(rows, (newRows) => {
  for (const row of newRows) {
    const v = row.username.trim()
    if (v && !v.startsWith('@') && isSolanaAddress(v)) lookupAddress(v)
  }
}, { deep: true })
const pickerOpenIndex = ref<number | null>(null)

function openPicker(i: number) { pickerOpenIndex.value = i }
function onPickerOpen(val: boolean) { if (!val) pickerOpenIndex.value = null }
function selectContact(c: { username: string | null; wallet_address: string }) {
  const i = pickerOpenIndex.value
  if (i === null || !rows.value[i]) return
  rows.value[i]!.username = c.username ? `@${c.username}` : c.wallet_address
  pickerOpenIndex.value = null
}
const loading = ref(false)
const error = ref('')
const result = ref<{ succeeded: number; failed: number; results: any[] } | null>(null)

const SOL_MINT = 'So11111111111111111111111111111111111111112'

const selectedBalance = computed(() => {
  if (!balance.value) return null
  if (token.value.address === SOL_MINT) return { amount: balance.value.sol, symbol: 'SOL' }
  const t = balance.value.tokens?.find((t: any) => t.mint === token.value.address)
  return t ? { amount: t.balance, symbol: t.symbol } : { amount: 0, symbol: token.value.symbol }
})

const totalAmount = computed(() =>
  rows.value.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
)

const exceedsBalance = computed(() =>
  totalAmount.value > 0 && !!selectedBalance.value && totalAmount.value > selectedBalance.value.amount
)

const hasAddressErrors = computed(() =>
  rows.value.some(r => rowAddressError(r.username) !== null)
)

const validRows = computed(() =>
  rows.value.filter(r => r.username.trim() && parseFloat(r.amount) > 0 && !rowAddressError(r.username))
)

const canSend = computed(() =>
  validRows.value.length > 0 && !loading.value && !exceedsBalance.value && !hasAddressErrors.value
)

function addRow() {
  rows.value.push({ username: '', amount: '', memo: '' })
}

function removeRow(i: number) {
  if (rows.value.length === 1) return
  rows.value.splice(i, 1)
}

function fillEqual() {
  const n = rows.value.length
  if (!selectedBalance.value || n === 0) return
  const each = (selectedBalance.value.amount / n).toFixed(6)
  rows.value.forEach(r => (r.amount = each))
}

async function onSend() {
  error.value = ''
  loading.value = true
  try {
    const res = await apiFetch<{ results: any[]; succeeded: number; failed: number }>('/api/payroll/send', {
      method: 'POST',
      body: {
        recipients: validRows.value.map(r => ({
          username: r.username.replace(/^@/, ''),
          amount: parseFloat(r.amount),
          memo: r.memo || undefined,
        })),
        token: token.value.address,
        decimals: token.value.decimals,
        label: label.value || undefined,
      },
    })
    result.value = res
    refreshBalance()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to send'
  } finally {
    loading.value = false
  }
}

function reset() {
  label.value = ''; token.value = SOL_TOKEN
  rows.value = [{ username: '', amount: '', memo: '' }]
  error.value = ''; result.value = null
}

watch(open, (v) => { if (!v) setTimeout(reset, 300) })
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 mx-4 sm:mx-0">

        <!-- Success -->
        <div v-if="result" class="p-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 class="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle class="text-xl font-bold">Payroll sent</DialogTitle>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ result.succeeded }} of {{ result.results.length }} payments succeeded.
            <span v-if="result.failed > 0" class="text-destructive"> {{ result.failed }} failed.</span>
          </p>

          <div class="mt-5 space-y-2 text-left max-h-48 overflow-y-auto">
            <div
              v-for="(r, i) in result.results"
              :key="i"
              class="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm"
              :class="r.error ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-secondary/50'"
            >
              <span class="font-medium">@{{ r.username ?? r.address }}</span>
              <span v-if="r.error" class="text-destructive text-xs">{{ r.error }}</span>
              <span v-else class="text-green-500 text-xs">{{ formatAmount(r.amount) }} ✓</span>
            </div>
          </div>

          <div class="mt-5 flex gap-3">
            <Button variant="outline" class="flex-1" @click="reset">New payroll</Button>
            <Button class="flex-1" @click="open = false">Done</Button>
          </div>
        </div>

        <!-- Form -->
        <template v-else>
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-primary" />
              <DialogTitle class="text-base font-bold">Send payroll</DialogTitle>
            </div>
            <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="open = false">
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-4 p-6">

            <!-- Label -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Label (optional)</label>
              <input
                v-model="label"
                placeholder="e.g. May salary"
                class="flex h-10 w-full rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            <!-- Token -->
            <TokenPicker v-model="token" label="Token" />

            <!-- Balance -->
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total: <span class="font-semibold text-foreground">{{ formatAmount(totalAmount) }} {{ token.symbol }}</span></span>
              <span>Balance: <span class="font-semibold text-foreground">{{ selectedBalance?.amount.toFixed(4) ?? '0' }} {{ token.symbol }}</span></span>
            </div>

            <!-- Recipients -->
            <div class="max-h-64 overflow-y-auto space-y-3 pr-1">
              <div
                v-for="(row, i) in rows"
                :key="i"
                class="rounded-xl border border-border bg-secondary/30 p-2.5 space-y-2"
              >
                <div class="flex items-center gap-2">
                  <div class="relative min-w-0 flex-1">
                    <input
                      v-model="row.username"
                      placeholder="@username or address"
                      class="h-9 w-full rounded-xl border bg-background pl-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                      :class="rowAddressError(row.username) ? 'border-destructive' : 'border-input'"
                    />
                    <button
                      type="button"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      @click="openPicker(i)"
                    >
                      <Users class="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    class="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    @click="removeRow(i)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
                <p v-if="rowAddressError(row.username)" class="text-xs text-destructive px-1">
                  {{ rowAddressError(row.username) }}
                </p>
                <p v-else-if="isSolanaAddress(row.username.trim()) && registeredCache[row.username.trim()] !== undefined" class="flex items-center gap-1 px-1 text-xs">
                  <template v-if="registeredCache[row.username.trim()]">
                    <span class="text-green-600 dark:text-green-400">✓ Registered as <span class="font-semibold">@{{ registeredCache[row.username.trim()] }}</span></span>
                  </template>
                  <template v-else-if="registeredCache[row.username.trim()] === null">
                    <span class="text-muted-foreground">Not registered — sending directly to address</span>
                  </template>
                </p>
                <input
                  v-model="row.amount"
                  type="text"
                  inputmode="decimal"
                  placeholder="Amount"
                  class="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                />
                <input
                  v-model="row.memo"
                  placeholder="Note (optional)"
                  class="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <!-- Actions row -->
            <div class="flex gap-2">
              <button
                class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                @click="addRow"
              >
                <Plus class="h-3.5 w-3.5" /> Add recipient
              </button>
              <button
                class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                @click="fillEqual"
              >
                Split equally
              </button>
            </div>

            <!-- Errors -->
            <div v-if="exceedsBalance" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />Not enough balance. You have {{ selectedBalance?.amount.toFixed(4) }} {{ token.symbol }}.
            </div>
            <div v-else-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />{{ error }}
            </div>

            <Button class="w-full" size="lg" :disabled="!canSend || loading" @click="onSend">
              <Send v-if="!loading" class="h-4 w-4" />
              {{ loading ? `Sending to ${validRows.length} recipients…` : `Send to ${validRows.length} recipient${validRows.length !== 1 ? 's' : ''}` }}
            </Button>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <ContactPicker
    :open="pickerOpenIndex !== null"
    @update:open="onPickerOpen"
    @select="selectContact"
  />
</template>
