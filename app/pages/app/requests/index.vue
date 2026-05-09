<script setup lang="ts">
import { Link, Copy, Check, Clock, CheckCircle2, ExternalLink, Plus, ChevronRight, Users, ArrowUpRight } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const { apiFetch } = useAuth()
const { balance } = useBalance()
const { formatDisplay } = useDisplayCurrency()

const SOL_MINT = 'So11111111111111111111111111111111111111112'
function toUsd(amount: number, token: string): string {
  if (!balance.value) return ''
  const solPrice = balance.value.solPrice ?? 0
  let price = 0
  if (token === 'SOL' || token === SOL_MINT) price = solPrice
  else {
    const t = balance.value.tokens?.find((t: any) => t.symbol === token || t.mint === token)
    if (t && t.balance > 0) price = t.usd / t.balance
    else if (token === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' || token === 'USDC') price = 1
    else if (token === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' || token === 'USDT') price = 1
  }
  const usd = amount * price
  return usd > 0 ? formatDisplay(usd) : ''
}
const config = useRuntimeConfig()
const showRequest = ref(false)
const showSplit = ref(false)
const tab = ref<'by_me' | 'to_me'>('by_me')

const { data, refresh, pending } = useAsyncData('requests-unified',
  () => apiFetch<{ by_me: any[]; to_me: any[] }>('/api/requests'),
  { lazy: true }
)

const byMe = computed(() => data.value?.by_me ?? [])
const toMe = computed(() => data.value?.to_me ?? [])
const current = computed(() => tab.value === 'by_me' ? byMe.value : toMe.value)
const toMeCount = computed(() => toMe.value.filter(r => r.my_status === 'pending').length)

watch([showRequest, showSplit], ([r, s]) => { if (!r && !s) setTimeout(refresh, 400) })

const paying = ref<string | null>(null)
async function payNow(item: any) {
  if (item.payment_id) {
    await navigateTo(`/pay/${item.payment_id}`)
    return
  }
  paying.value = item.participant_id
  try {
    const res = await apiFetch<{ id: string }>('/api/split/pay-link', {
      method: 'POST',
      body: { participantId: item.participant_id },
    })
    await navigateTo(`/pay/${res.id}`)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Failed to load payment page')
  } finally {
    paying.value = null
  }
}

const copied = ref<string | null>(null)
function copyLink(id: string) {
  navigator.clipboard.writeText(`${config.public.appUrl}/pay/${id}`)
  copied.value = id
  setTimeout(() => { if (copied.value === id) copied.value = null }, 1500)
}

const SYMS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
}
function sym(mint: string) { return SYMS[mint] ?? mint.slice(0, 6) + '...' }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div>
  <div class="min-h-screen p-4 md:p-8">

    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Requests</h1>
          <p class="mt-0.5 text-sm text-muted-foreground">Payment requests and split bills.</p>
        </div>
        <!-- Desktop buttons -->
        <div class="hidden sm:flex items-center gap-2">
          <button
            class="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-accent"
            @click="showSplit = true"
          >
            <Users class="h-4 w-4" /> Split request
          </button>
          <button
            class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            @click="showRequest = true"
          >
            <Plus class="h-4 w-4" /> Payment request
          </button>
        </div>
      </div>
      <!-- Mobile buttons -->
      <div class="mt-3 flex gap-2 sm:hidden">
        <button
          class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-accent"
          @click="showSplit = true"
        >
          <Users class="h-4 w-4" /> Split
        </button>
        <button
          class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          @click="showRequest = true"
        >
          <Plus class="h-4 w-4" /> Payment request
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-6 flex gap-1 rounded-xl bg-secondary p-1">
      <button
        class="flex-1 rounded-lg py-2 text-sm font-semibold transition"
        :class="tab === 'by_me' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = 'by_me'"
      >
        By me
      </button>
      <button
        class="relative flex-1 rounded-lg py-2 text-sm font-semibold transition"
        :class="tab === 'to_me' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = 'to_me'"
      >
        To me
        <span
          v-if="toMeCount > 0"
          class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
        >
          {{ toMeCount }}
        </span>
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-2">
      <div v-for="i in 4" :key="i" class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div class="h-10 w-10 shrink-0 skeleton rounded-xl" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-36 skeleton rounded" />
          <div class="h-3 w-24 skeleton rounded" />
        </div>
        <div class="h-4 w-16 skeleton rounded" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!current.length" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <Link class="h-7 w-7 text-muted-foreground" />
      </div>
      <p class="font-semibold">{{ tab === 'by_me' ? 'No requests yet' : 'Nothing pending' }}</p>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ tab === 'by_me' ? 'Create a payment link or split bill.' : "You're all caught up." }}
      </p>
      <div v-if="tab === 'by_me'" class="mt-6 flex gap-2">
        <button
          class="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-accent"
          @click="showSplit = true"
        >
          <Users class="h-4 w-4" /> Split request
        </button>
        <button
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          @click="showRequest = true"
        >
          <Plus class="h-4 w-4" /> Payment request
        </button>
      </div>
    </div>

    <!-- BY ME list -->
    <div v-else-if="tab === 'by_me'" class="space-y-2 animate-card-in">
      <template v-for="item in byMe" :key="item.id">

        <!-- Payment link row -->
        <div v-if="item.kind === 'link'" class="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:bg-accent">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            :class="item.status === 'confirmed' ? 'bg-green-500/10' : 'bg-secondary'">
            <CheckCircle2 v-if="item.status === 'confirmed'" class="h-4 w-4 text-green-500" />
            <Clock v-else class="h-4 w-4 text-muted-foreground" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <p class="font-semibold text-sm">{{ formatAmount(item.amount) }} {{ sym(item.token) }}</p>
              <p v-if="toUsd(item.amount, item.token)" class="text-xs text-muted-foreground">{{ toUsd(item.amount, item.token) }}</p>
              <span class="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-500">Request</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                :class="item.status === 'confirmed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-secondary text-muted-foreground'">
                {{ item.status === 'confirmed' ? 'Paid' : 'Pending' }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-muted-foreground truncate">
              <span v-if="item.memo" class="mr-1.5">{{ item.memo }}</span>
              {{ fmtDate(item.created_at) }}
              <span v-if="item.paid_by"> · @{{ item.paid_by }}</span>
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button v-if="item.status === 'pending'"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background transition hover:bg-accent"
              @click="copyLink(item.id)">
              <Check v-if="copied === item.id" class="h-3.5 w-3.5 text-green-500" />
              <Copy v-else class="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <a v-if="item.status === 'pending'" :href="`/pay/${item.id}`" target="_blank"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background transition hover:bg-accent">
              <ExternalLink class="h-3.5 w-3.5 text-muted-foreground" />
            </a>
            <a v-if="item.status === 'confirmed' && item.tx_signature" :href="`https://solscan.io/tx/${item.tx_signature}`" target="_blank"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background transition hover:bg-accent">
              <ExternalLink class="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        </div>

        <!-- Split bill row -->
        <NuxtLink v-else-if="item.kind === 'split'" :to="`/app/split/${item.id}`"
          class="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition hover:bg-accent">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
            <Users class="h-4 w-4 text-purple-500" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <p class="truncate font-semibold text-sm max-w-30 sm:max-w-none">{{ item.title }}</p>
              <span class="shrink-0 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-500">Split</span>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                :class="item.status === 'open' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-green-500/10 text-green-600 dark:text-green-400'">
                {{ item.status === 'open' ? 'Open' : 'Settled' }}
              </span>
            </div>
            <div class="mt-1.5 flex items-center gap-2">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div class="h-full rounded-full bg-purple-500 transition-all"
                  :style="{ width: item.total ? `${Math.round((item.paid / item.total) * 100)}%` : '0%' }" />
              </div>
              <span class="shrink-0 text-xs text-muted-foreground">{{ item.paid }}/{{ item.total }}</span>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-xs font-semibold whitespace-nowrap">{{ formatAmount(item.amount) }} {{ sym(item.token) }}</p>
            <p v-if="toUsd(item.amount, item.token)" class="text-[10px] text-muted-foreground">{{ toUsd(item.amount, item.token) }}</p>
          </div>
          <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
        </NuxtLink>

      </template>
    </div>

    <!-- TO ME list -->
    <div v-else class="space-y-2 animate-card-in">
      <NuxtLink v-for="(item, i) in toMe" :key="item.participant_id"
        :to="`/app/split/${item.bill_id}`"
        class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 animate-item-in transition hover:bg-accent"
        :style="`animation-delay: ${i * 40}ms`">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          :class="item.my_status === 'paid' ? 'bg-green-500/10' : 'bg-yellow-500/10'">
          <CheckCircle2 v-if="item.my_status === 'paid'" class="h-5 w-5 text-green-500" />
          <Clock v-else class="h-5 w-5 text-yellow-500" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate font-semibold">{{ item.title }}</p>
            <span class="shrink-0 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-500">
              Split
            </span>
            <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
              :class="item.my_status === 'paid' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'">
              {{ item.my_status === 'paid' ? 'Paid' : 'Pending' }}
            </span>
          </div>
          <p class="mt-0.5 text-xs text-muted-foreground">
            From <span class="font-medium text-foreground">@{{ item.from_username }}</span>
            · {{ formatAmount(item.amount) }} {{ sym(item.token) }}{{ toUsd(item.amount, item.token) ? ` (${toUsd(item.amount, item.token)})` : '' }}
          </p>
          <a
            v-if="item.tx_signature"
            :href="`https://solscan.io/tx/${item.tx_signature}`"
            target="_blank"
            class="mt-1 flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition"
            @click.stop
          >
            <ArrowUpRight class="h-3 w-3" />
            {{ item.tx_signature.slice(0, 16) }}…
          </a>
        </div>
        <button v-if="item.my_status !== 'paid'"
          class="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
          :disabled="paying === item.participant_id"
          @click.stop="payNow(item)">
          <span v-if="paying === item.participant_id" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Pay now
        </button>
        <span v-else class="shrink-0 flex items-center gap-1 text-sm text-muted-foreground">
          View <ChevronRight class="h-4 w-4" />
        </span>
      </NuxtLink>
    </div>

  </div>

  <RequestModal v-model:open="showRequest" />
  <SplitModal v-model:open="showSplit" />
  </div>
</template>
