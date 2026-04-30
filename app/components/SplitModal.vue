<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import Input from '~/components/ui/input/Input.vue'
import { Button } from '~/components/ui/button'
import { X, Plus, Trash2, AlertCircle, CheckCircle2, Users, Search, Loader2, Check } from 'lucide-vue-next'
import { watchDebounced } from '@vueuse/core'
import type { RecipientUser } from '~/composables/useRecipientSearch'

const open = defineModel<boolean>('open', { required: true })
const { friends, load: loadFriends } = useFriends()
watch(open, (v) => { if (v) loadFriends() })

// ── Per-row recipient state ────────────────────────────────────────────────
type RowStatus = 'idle' | 'searching' | 'found' | 'not-found' | 'address' | 'invalid-address'
type Row = {
  raw: string
  user: RecipientUser | null
  status: RowStatus
  amount: string
  showFriends: boolean
}

const isValidSolanaAddress = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)
const looksLikeAddress = (v: string) => !v.startsWith('@') && v.length >= 32

function makeRow(): Row {
  return { raw: '', user: null, status: 'idle', amount: '', showFriends: false }
}

const rows = ref<Row[]>([makeRow()])

// Debounced search per row
const searchTimers = new Map<number, ReturnType<typeof setTimeout>>()

async function searchRow(i: number) {
  const row = rows.value[i]
  const val = row.raw.trim()
  if (!val) { row.status = 'idle'; row.user = null; return }

  if (looksLikeAddress(val)) {
    if (!isValidSolanaAddress(val)) { row.status = 'invalid-address'; row.user = null; return }
    row.status = 'searching'; row.user = null
    try {
      const results = await $fetch<RecipientUser[]>('/api/users/search', { query: { q: val } })
      if (results[0]) { row.user = results[0]; row.status = 'found' }
      else row.status = 'address'
    } catch { row.status = 'address' }
    return
  }

  const q = val.replace(/^@/, '')
  if (q.length < 2) { row.status = 'idle'; row.user = null; return }
  row.status = 'searching'; row.user = null
  try {
    const results = await $fetch<RecipientUser[]>('/api/users/search', { query: { q } })
    const exact = results.find(u => u.username.toLowerCase() === q.toLowerCase())
    const match = exact ?? results[0]
    if (match) { row.user = match; row.status = 'found' }
    else row.status = 'not-found'
  } catch { row.status = 'not-found' }
}

function onRowInput(i: number) {
  rows.value[i].user = null
  rows.value[i].status = 'idle'
  rows.value[i].showFriends = false
  clearTimeout(searchTimers.get(i))
  searchTimers.set(i, setTimeout(() => searchRow(i), 400))
}

function selectFriend(i: number, f: { username: string; wallet_address: string }) {
  rows.value[i].raw = '@' + f.username
  rows.value[i].user = f
  rows.value[i].status = 'found'
  rows.value[i].showFriends = false
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
const totalNum = computed(() => parseFloat(totalRaw.value) || 0)
const tokenSymbol = computed(() => outputToken.value.symbol === 'USDC' ? '$' : '◎')

function onTotalInput(e: Event) {
  let s = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
  totalRaw.value = s
}

function splitEvenly() {
  if (!totalNum.value || !rows.value.length) return
  const each = (totalNum.value / rows.value.length).toFixed(4)
  rows.value = rows.value.map(r => ({ ...r, amount: each }))
}

const canCreate = computed(() =>
  title.value.trim() &&
  totalNum.value > 0 &&
  rows.value.length >= 1 &&
  rows.value.every(r => (r.status === 'found' || r.status === 'address') && parseFloat(r.amount) > 0) &&
  !loading.value
)

async function onCreate() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ id: string }>('/api/split/create', {
      method: 'POST',
      body: {
        title: title.value,
        totalAmount: totalNum.value,
        token: outputToken.value.address,
        participants: rows.value.map(r => ({
          username: r.user?.username ?? r.raw.replace(/^@/, '').trim(),
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
  rows.value = [makeRow()]
  error.value = ''; createdId.value = ''; outputToken.value = SOL_TOKEN
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
            "{{ title }}" — {{ totalNum.toFixed(4) }} {{ outputToken.symbol }} across {{ rows.length }} people
          </p>
          <p v-if="outputToken.address !== SOL_TOKEN.address" class="mt-1 text-xs text-muted-foreground">
            Each participant can pay with any token via Jupiter
          </p>
          <div class="mt-5 flex gap-3">
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
            <div>
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Title</label>
              <Input v-model="title" placeholder="Dinner at Sushi Tei, Bali trip…" />
            </div>

            <!-- Settle in token -->
            <div>
              <TokenPicker v-model="outputToken" label="Settle in" />
              <p v-if="outputToken.address !== SOL_TOKEN.address" class="mt-1.5 pl-1 text-xs text-muted-foreground">
                Participants can pay with any token — auto-converted via Jupiter
              </p>
            </div>

            <!-- Total -->
            <div>
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total ({{ outputToken.symbol }})</label>
              <div class="relative">
                <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">{{ tokenSymbol }}</span>
                <input
                  :value="totalRaw"
                  inputmode="decimal"
                  placeholder="0.00"
                  class="flex h-11 w-full rounded-xl border border-input bg-background pl-8 pr-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                  @input="onTotalInput"
                />
              </div>
            </div>

            <!-- Participants -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Participants</label>
                <button class="text-xs font-semibold text-primary transition hover:opacity-70" @click="splitEvenly">
                  Split evenly
                </button>
              </div>

              <div class="space-y-2">
                <div v-for="(row, i) in rows" :key="i" class="space-y-1">
                  <div class="flex items-center gap-2">

                    <!-- Recipient input -->
                    <div class="relative flex-1">
                      <div class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                        <Loader2 v-if="row.status === 'searching'" class="h-4 w-4 animate-spin text-muted-foreground" />
                        <Check v-else-if="row.status === 'found' || row.status === 'address'" class="h-4 w-4 text-green-500" />
                        <Search v-else class="h-4 w-4 text-muted-foreground" />
                      </div>
                      <input
                        :value="row.raw"
                        placeholder="@username or address"
                        class="flex h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground transition"
                        :class="row.status === 'found' || row.status === 'address'
                          ? 'border-green-500/40'
                          : row.status === 'not-found' || row.status === 'invalid-address'
                            ? 'border-destructive/40'
                            : 'border-input'"
                        @input="row.raw = ($event.target as HTMLInputElement).value; onRowInput(i)"
                        @focus="row.showFriends = true"
                      />
                    </div>

                    <!-- Friends toggle -->
                    <button
                      v-if="friends.length"
                      type="button"
                      class="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-border transition"
                      :class="row.showFriends ? 'border-primary text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
                      @click="row.showFriends = !row.showFriends"
                    >
                      <Users class="h-4 w-4" />
                    </button>

                    <!-- Amount -->
                    <div class="relative w-28">
                      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{{ tokenSymbol }}</span>
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

                  <!-- Found user chip -->
                  <div v-if="row.status === 'found' && row.user" class="flex items-center gap-2 rounded-lg bg-green-500/5 px-3 py-1.5">
                    <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {{ row.user.username[0].toUpperCase() }}
                    </div>
                    <span class="text-xs font-medium">@{{ row.user.username }}</span>
                    <span class="ml-auto font-mono text-[10px] text-muted-foreground">{{ row.user.wallet_address.slice(0, 8) }}…</span>
                  </div>

                  <!-- Status messages -->
                  <p v-else-if="row.status === 'address'" class="pl-1 text-xs text-muted-foreground">Valid Solana address</p>
                  <p v-else-if="row.status === 'not-found'" class="pl-1 text-xs text-destructive">User not found</p>
                  <p v-else-if="row.status === 'invalid-address'" class="pl-1 text-xs text-destructive">Invalid address</p>

                  <!-- Friends dropdown -->
                  <div v-if="row.showFriends && friends.length" class="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                    <p class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Friends</p>
                    <button
                      v-for="f in friends"
                      :key="f.id"
                      type="button"
                      class="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-accent"
                      @click="selectFriend(i, f)"
                    >
                      <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {{ f.username[0].toUpperCase() }}
                      </div>
                      <span class="text-sm font-medium">@{{ f.username }}</span>
                    </button>
                  </div>
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
            <div v-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
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
</template>
