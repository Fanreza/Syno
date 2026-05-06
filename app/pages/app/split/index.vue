<script setup lang="ts">
import { Scissors, ExternalLink, Clock, CheckCircle2, Inbox, RefreshCw } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const { apiFetch } = useAuth()
const { formatDisplay } = useDisplayCurrency()

type CreatedBill = {
  id: string; title: string; total_amount: number; token: string
  status: string; created_at: string; paid: number; total: number; role: 'creator'
}
type ParticipatingBill = {
  id: string; title: string; total_amount: number; token: string
  status: string; created_at: string; role: 'participant'
  myAmount: number; myStatus: string; participantId: string
}

const { data, pending, refresh } = useAsyncData(
  'split-index',
  () => apiFetch<{ created: CreatedBill[]; participating: ParticipatingBill[] }>('/api/split'),
  { lazy: true }
)

const created = computed(() => data.value?.created ?? [])
const participating = computed(() => data.value?.participating ?? [])
const hasAny = computed(() => created.value.length > 0 || participating.value.length > 0)

const KNOWN_TOKENS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
}
function tokenLabel(mint: string) {
  return KNOWN_TOKENS[mint] ?? mint.slice(0, 4) + '…'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Splits</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Bills you created or are part of.</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
        @click="refresh()"
      >
        <RefreshCw class="h-3.5 w-3.5" /> Refresh
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-3">
      <div v-for="i in 4" :key="i" class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div class="h-9 w-9 skeleton rounded-full shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-32 skeleton rounded" />
          <div class="h-3 w-20 skeleton rounded" />
        </div>
        <div class="h-8 w-16 skeleton rounded-xl" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!hasAny" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
        <Scissors class="h-6 w-6 text-muted-foreground" />
      </div>
      <p class="font-medium">No splits yet</p>
      <p class="mt-1 text-sm text-muted-foreground">Create one from the dashboard.</p>
    </div>

    <template v-else>

      <!-- Bills you created -->
      <div v-if="created.length" class="mb-6">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Created by you</p>
        <div class="rounded-2xl border border-border bg-card divide-y divide-border">
          <NuxtLink
            v-for="(bill, i) in created"
            :key="bill.id"
            :to="`/app/split/${bill.id}`"
            class="flex items-center gap-4 px-5 py-4 transition hover:bg-accent animate-item-in"
            :style="`animation-delay: ${i * 40}ms`"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
              <Scissors class="h-4 w-4 text-purple-500" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ bill.title }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">{{ bill.paid }}/{{ bill.total }} paid · {{ timeAgo(bill.created_at) }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-sm font-semibold">{{ formatAmount(bill.total_amount) }} {{ tokenLabel(bill.token) }}</p>
              <span
                class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :class="bill.paid === bill.total && bill.total > 0
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'"
              >
                {{ bill.paid === bill.total && bill.total > 0 ? 'Settled' : 'Pending' }}
              </span>
            </div>
            <ExternalLink class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </NuxtLink>
        </div>
      </div>

      <!-- Bills you're part of -->
      <div v-if="participating.length">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">You owe</p>
        <div class="rounded-2xl border border-border bg-card divide-y divide-border">
          <NuxtLink
            v-for="(bill, i) in participating"
            :key="bill.id"
            :to="`/app/split/${bill.id}`"
            class="flex items-center gap-4 px-5 py-4 transition hover:bg-accent animate-item-in"
            :style="`animation-delay: ${(created.length + i) * 40}ms`"
          >
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              :class="bill.myStatus === 'paid' ? 'bg-green-500/10' : 'bg-secondary'"
            >
              <CheckCircle2 v-if="bill.myStatus === 'paid'" class="h-4 w-4 text-green-500" />
              <Clock v-else class="h-4 w-4 text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ bill.title }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">{{ timeAgo(bill.created_at) }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-sm font-semibold">{{ formatAmount(bill.myAmount) }} {{ tokenLabel(bill.token) }}</p>
              <span
                class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :class="bill.myStatus === 'paid'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'"
              >
                {{ bill.myStatus === 'paid' ? 'Paid' : 'Unpaid' }}
              </span>
            </div>
            <ExternalLink class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </NuxtLink>
        </div>
      </div>

    </template>
  </div>
</template>
