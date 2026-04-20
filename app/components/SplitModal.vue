<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import Input from '~/components/ui/Input.vue'
import Button from '~/components/ui/Button.vue'
import { X, Plus, Trash2, AlertCircle, CheckCircle2, Users } from 'lucide-vue-next'

const open = defineModel<boolean>('open', { required: true })

const { friends, load: loadFriends } = useFriends()
watch(open, (v) => { if (v) loadFriends() })

const focusedRow = ref<number | null>(null)

function selectFriendForRow(i: number, f: { username: string }) {
  participants.value[i].username = '@' + f.username
  focusedRow.value = null
}

const title = ref('')
const totalRaw = ref('')
const participants = ref<{ username: string; amount: string }[]>([
  { username: '', amount: '' },
  { username: '', amount: '' },
])
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

function addRow() { participants.value.push({ username: '', amount: '' }) }
function removeRow(i: number) { if (participants.value.length > 2) participants.value.splice(i, 1) }

function splitEvenly() {
  if (!totalNum.value || !participants.value.length) return
  const each = (totalNum.value / participants.value.length).toFixed(4)
  participants.value = participants.value.map(p => ({ ...p, amount: each }))
}

const canCreate = computed(() =>
  title.value.trim() &&
  totalNum.value > 0 &&
  participants.value.every(p => p.username.trim() && parseFloat(p.amount) > 0) &&
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
        participants: participants.value.map(p => ({
          username: p.username.replace(/^@/, '').trim(),
          amount: parseFloat(p.amount)
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
  participants.value = [{ username: '', amount: '' }, { username: '', amount: '' }]
  error.value = ''; createdId.value = ''; outputToken.value = SOL_TOKEN
}

watch(open, (v) => { if (!v) setTimeout(reset, 300) })
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

        <!-- Success -->
        <div v-if="createdId" class="p-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
            <CheckCircle2 class="h-8 w-8 text-purple-500" />
          </div>
          <DialogTitle class="text-xl font-bold">Split created</DialogTitle>
          <p class="mt-2 text-sm text-muted-foreground">
            "{{ title }}" — {{ totalNum.toFixed(4) }} {{ outputToken.symbol }} across {{ participants.length }} people
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
                <button
                  class="text-xs font-semibold text-primary transition hover:opacity-70"
                  @click="splitEvenly"
                >
                  Split evenly
                </button>
              </div>

              <div class="space-y-2">
                <div v-for="(p, i) in participants" :key="i" class="space-y-1">
                  <div class="flex items-center gap-2">
                    <Input v-model="p.username" placeholder="@username" class="flex-1" />
                    <!-- Friends icon button -->
                    <button
                      v-if="friends.length"
                      type="button"
                      class="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-border transition"
                      :class="focusedRow === i ? 'border-primary text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
                      @click="focusedRow = focusedRow === i ? null : i"
                    >
                      <Users class="h-4 w-4" />
                    </button>
                    <div class="relative w-28">
                      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{{ tokenSymbol }}</span>
                      <input
                        v-model="p.amount"
                        inputmode="decimal"
                        placeholder="0.00"
                        class="flex h-11 w-full rounded-xl border border-input bg-background pl-7 pr-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                      />
                    </div>
                    <button
                      :disabled="participants.length <= 2"
                      class="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-30"
                      @click="removeRow(i)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                  <!-- Friend dropdown -->
                  <div
                    v-if="focusedRow === i && friends.length"
                    class="overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                  >
                    <p class="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Friends</p>
                    <button
                      v-for="f in friends"
                      :key="f.id"
                      type="button"
                      class="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-accent"
                      @click="selectFriendForRow(i, f)"
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

            <Button class="w-full" size="lg" :disabled="!canCreate" :loading="loading" @click="onCreate">
              Create split
            </Button>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
