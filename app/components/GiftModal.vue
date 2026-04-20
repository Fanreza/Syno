<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import Input from '~/components/ui/Input.vue'
import Button from '~/components/ui/Button.vue'
import { X, Gift, AlertCircle, CheckCircle2, Copy, Check, Users, Coins } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const open = defineModel<boolean>('open', { required: true })
const { apiFetch } = useAuth()

const totalRaw = ref('')
const slots = ref('5')
const giftToken = ref<JupToken>(SOL_TOKEN)
const loading = ref(false)
const error = ref('')
const created = ref<{ id: string; total_amount: number; total_slots: number; token: string } | null>(null)
const copied = ref(false)

function onTotalInput(e: Event) {
  let s = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
  totalRaw.value = s
}

const totalNum = computed(() => parseFloat(totalRaw.value) || 0)
const slotsNum = computed(() => Math.max(1, parseInt(slots.value) || 1))
const perPerson = computed(() => totalNum.value > 0 ? (totalNum.value / slotsNum.value).toFixed(4) : '0')

const canCreate = computed(() => totalNum.value > 0 && slotsNum.value >= 1 && !loading.value)

async function onCreate() {
  error.value = ''
  loading.value = true
  try {
    const res = await apiFetch<{ id: string; total_amount: number; total_slots: number; token: string }>('/api/gifts/create', {
      method: 'POST',
      body: { totalAmount: totalNum.value, totalSlots: slotsNum.value, token: giftToken.value.address }
    })
    created.value = res
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to create gift'
  } finally { loading.value = false }
}

const giftLink = computed(() =>
  created.value ? `${window.location.origin}/gift/${created.value.id}` : ''
)

function copyLink() {
  navigator.clipboard.writeText(giftLink.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function reset() {
  totalRaw.value = ''; slots.value = '5'; giftToken.value = SOL_TOKEN
  error.value = ''; created.value = null; copied.value = false
}

watch(open, (v) => { if (!v) setTimeout(reset, 300) })
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

          <div class="mt-5 flex gap-3">
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
            <div>
              <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total amount ({{ giftToken.symbol }})</label>
              <input
                :value="totalRaw"
                inputmode="decimal"
                placeholder="0.00"
                class="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                @input="onTotalInput"
              />
            </div>

            <!-- Slots -->
            <div>
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

            <!-- Per person preview -->
            <div v-if="totalNum > 0" class="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 py-3">
              <Coins class="h-4 w-4 shrink-0 text-yellow-500" />
              <div>
                <p class="text-sm font-semibold">{{ perPerson }} {{ giftToken.symbol }} per person</p>
                <p class="text-xs text-muted-foreground">{{ totalNum.toFixed(4) }} {{ giftToken.symbol }} ÷ {{ slotsNum }} slots</p>
              </div>
            </div>

            <!-- Error -->
            <div v-if="error" class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />{{ error }}
            </div>

            <Button class="w-full" size="lg" :disabled="!canCreate" :loading="loading" @click="onCreate">
              <Gift v-if="!loading" class="h-4 w-4" />
              {{ loading ? 'Creating gift…' : 'Create gift' }}
            </Button>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
