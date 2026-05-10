<script setup lang="ts">
import { ArrowLeft, Copy, Check, CheckCircle2, Clock, RefreshCw, ExternalLink, BadgeCheck } from 'lucide-vue-next'
import { formatAmount, shortAddr } from '~/utils'

const route = useRoute()
const { balance } = useBalance()
const { formatDisplay } = useDisplayCurrency()

const SOL_MINT = 'So11111111111111111111111111111111111111112'
function toUsd(amount: number): string {
  if (!balance.value || !bill.value?.token) return ''
  const token = bill.value.token
  const solPrice = balance.value.solPrice ?? 0
  let price = 0
  if (token === 'SOL' || token === SOL_MINT) price = solPrice
  else if (token === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') price = 1
  else if (token === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') price = 1
  else {
    const t = balance.value.tokens?.find((t: any) => t.mint === token)
    if (t && t.balance > 0) price = t.usd / t.balance
  }
  const usd = amount * price
  return usd > 0 ? formatDisplay(usd) : ''
}
const id = route.params.id as string
const { apiFetch } = useAuth()
const config = useRuntimeConfig()

const { data: bill, refresh } = await useAsyncData(`split-${id}`, () => apiFetch<any>(`/api/split/${id}`))

// Per-participant payment links: participantId → pay page id
const payLinks = ref<Record<string, string>>({})
const generating = ref<Record<string, boolean>>({})
const copied = ref('')

// Pre-populate payment links from server data
watch(bill, (b) => {
  if (!b?.participants) return
  for (const p of b.participants) {
    if (p.payment_link_id) payLinks.value[p.id] = p.payment_link_id
  }
}, { immediate: true })

async function generateLink(participant: any): Promise<string> {
  if (payLinks.value[participant.id]) return payLinks.value[participant.id]!
  generating.value[participant.id] = true
  try {
    const res = await apiFetch<{ id: string }>('/api/payments/create-link', {
      method: 'POST',
      body: {
        amount: Number(participant.amount),
        memo: `${bill.value?.title || 'Split'} — @${participant.username}`,
        splitParticipantId: participant.id,
        outputToken: bill.value?.token ?? 'SOL',
      }
    })
    payLinks.value[participant.id] = res.id
    return res.id
  } finally {
    generating.value[participant.id] = false
  }
}

async function copyLink(participant: any) {
  const linkId = await generateLink(participant)
  navigator.clipboard.writeText(`${config.public.appUrl}/pay/${linkId}`)
  copied.value = participant.id
  setTimeout(() => (copied.value = ''), 1500)
}

async function payNow(participant: any) {
  generating.value[participant.id] = true
  try {
    const res = await apiFetch<{ id: string }>('/api/split/pay-link', {
      method: 'POST',
      body: { participantId: participant.id },
    })
    await navigateTo(`/pay/${res.id}`)
  } finally {
    generating.value[participant.id] = false
  }
}

const settling = ref<string | null>(null)

async function settlePaid(participant: any) {
  settling.value = participant.id
  try {
    await apiFetch(`/api/split/${id}/settle`, { method: 'POST', body: { participantId: participant.id } })
    await refresh()
  } catch (e: any) {
    console.error('Settle failed:', e)
  } finally {
    settling.value = null
  }
}

const paid = computed(() => bill.value?.participants?.filter((p: any) => p.status === 'paid').length || 0)
const total = computed(() => bill.value?.participants?.length || 0)
const pct = computed(() => total.value ? Math.round((paid.value / total.value) * 100) : 0)

const KNOWN_MINTS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
}
const tokenSymbol = computed(() => {
  const t = bill.value?.token
  if (!t) return 'SOL'
  return KNOWN_MINTS[t] ?? (t.length <= 8 ? t : t.slice(0, 4) + '…')
})
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <!-- Header -->
    <div class="mb-8 flex items-center gap-3">
      <NuxtLink to="/app/requests" class="rounded-xl border border-border p-2 transition hover:bg-accent">
        <ArrowLeft class="h-4 w-4" />
      </NuxtLink>
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold truncate">{{ bill?.title || 'Split Bill' }}</h1>
        <p class="text-sm text-muted-foreground">Created by @{{ bill?.creator?.username }}</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        @click="refresh()"
      >
        <RefreshCw class="h-4 w-4" />
      </button>
    </div>

    <div class="grid gap-4 md:grid-cols-3">

      <!-- Left column: summary + stats -->
      <div class="space-y-4 md:col-span-1">

        <!-- Total card -->
        <div class="rounded-2xl border border-border bg-card p-6">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
          <p class="mt-2 text-4xl font-bold tracking-tight leading-none">
            {{ formatAmount(bill?.total_amount || 0) }}
          </p>
          <p class="mt-1 text-lg font-semibold text-muted-foreground">{{ tokenSymbol }}</p>
          <p v-if="toUsd(bill?.total_amount || 0)" class="mt-0.5 text-sm text-muted-foreground">≈ {{ toUsd(bill?.total_amount || 0) }}</p>

          <div class="mt-5 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Progress</span>
              <span class="font-bold" :class="pct === 100 ? 'text-green-500' : 'text-foreground'">{{ pct }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="pct === 100 ? 'bg-green-500' : 'bg-primary'"
                :style="{ width: `${pct}%` }"
              />
            </div>
            <p class="text-xs text-muted-foreground">{{ paid }} of {{ total }} paid</p>
          </div>
        </div>

        <!-- Status + meta -->
        <div class="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Status</span>
            <span
              class="rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="bill?.status === 'open' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'"
            >
              {{ bill?.status === 'open' ? 'Open' : 'Settled' }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Paid</span>
            <span class="text-sm font-semibold">{{ paid }} / {{ total }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Per person</span>
            <span class="text-sm font-semibold">
              {{ bill?.participants?.length ? formatAmount((bill.total_amount || 0) / bill.participants.length) : '—' }} {{ tokenSymbol }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Created by</span>
            <span class="text-sm font-semibold">@{{ bill?.creator?.username }}</span>
          </div>
        </div>

      </div>

      <!-- Right column: participants -->
      <div class="md:col-span-2">
        <div class="rounded-2xl border border-border bg-card overflow-hidden h-full">
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 class="font-semibold">Participants</h3>
            <span class="text-xs text-muted-foreground">{{ total }} people</span>
          </div>
          <div class="divide-y divide-border">
            <div
              v-for="p in bill?.participants"
              :key="p.id"
              class="flex items-center gap-4 px-6 py-4 transition"
              :class="p.status === 'paid' ? 'bg-green-500/3' : ''"
            >
              <!-- Avatar -->
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                :class="p.status === 'paid' ? 'bg-green-500/15 text-green-500' : 'bg-secondary text-muted-foreground'"
              >
                {{ p.username?.[0]?.toUpperCase() }}
              </div>

              <!-- Name + amount + tx -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="font-semibold">@{{ p.username }}</p>
                  <span v-if="bill?.myParticipantId === p.id" class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">you</span>
                </div>
                <p class="text-sm text-muted-foreground">{{ formatAmount(p.amount) }} {{ tokenSymbol }}<span v-if="toUsd(p.amount)" class="ml-1 text-xs">· {{ toUsd(p.amount) }}</span></p>
                <a
                  v-if="p.tx_signature"
                  :href="`https://solscan.io/tx/${p.tx_signature}`"
                  target="_blank"
                  class="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition"
                >
                  <ExternalLink class="h-2.5 w-2.5" />
                  {{ p.tx_signature.slice(0, 20) }}…
                </a>
              </div>

              <!-- Action -->
              <div class="shrink-0">
                <span v-if="p.status === 'paid'" class="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-500">
                  <CheckCircle2 class="h-3.5 w-3.5" /> Paid
                </span>
                <button
                  v-else-if="bill?.myParticipantId === p.id"
                  class="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  :disabled="generating[p.id]"
                  @click="payNow(p)"
                >
                  <span v-if="generating[p.id]" class="inline-flex items-center gap-1.5">
                    <span class="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" /> Loading…
                  </span>
                  <span v-else>Pay now</span>
                </button>
                <div v-else class="flex items-center gap-1.5">
                  <!-- Creator can mark others as paid offline -->
                  <button
                    v-if="bill?.myParticipantId && bill.creator?.username && bill.participants?.find((x: any) => x.id === bill.myParticipantId)?.username === bill.creator.username"
                    class="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:border-green-500/30 hover:bg-green-500/5 hover:text-green-500 disabled:opacity-50"
                    :disabled="settling === p.id"
                    @click="settlePaid(p)"
                    title="Mark as paid offline"
                  >
                    <span v-if="settling === p.id" class="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                    <BadgeCheck v-else class="h-3.5 w-3.5" />
                  </button>
                  <a
                    v-if="payLinks[p.id]"
                    :href="`/pay/${payLinks[p.id]}`"
                    target="_blank"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <ExternalLink class="h-3.5 w-3.5" />
                  </a>
                  <button
                    class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition hover:bg-accent disabled:opacity-50"
                    :disabled="generating[p.id]"
                    @click="copyLink(p)"
                  >
                    <span v-if="generating[p.id]" class="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                    <Check v-else-if="copied === p.id" class="h-3 w-3 text-green-500" />
                    <Copy v-else class="h-3 w-3" />
                    {{ copied === p.id ? 'Copied!' : generating[p.id] ? 'Loading…' : 'Copy link' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
