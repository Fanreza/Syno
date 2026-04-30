<script setup lang="ts">
import {
  ArrowUpRight, ArrowDownRight, Scissors, Star, ExternalLink,
  RefreshCw, Inbox, Filter
} from 'lucide-vue-next'
import { formatAmount, shortAddr } from '~/utils'

const { apiFetch } = useAuth()

type ActivityItem = {
  type: 'sent' | 'received' | 'split' | 'gift_claim'
  id: string
  amount: number
  token: string
  memo: string | null
  tx_signature: string | null
  counterparty: string | null
  status?: string
  created_at: string
}

type OnChainTx = {
  tx_hash: string
  block_signed_at: string
  successful: boolean
  fees_paid: string | null
  from_address: string
  to_address: string | null
}

// Tabs
const tab = ref<'syno' | 'onchain'>('syno')
const filter = ref<'all' | 'sent' | 'received' | 'split' | 'gift_claim'>('all')

// Syno activity
const { data: activity, refresh: refreshActivity, pending: loadingActivity } = useAsyncData(
  'activity-page',
  () => apiFetch<ActivityItem[]>('/api/activity'),
  { lazy: true }
)

// On-chain history
const { data: history, refresh: refreshHistory, pending: loadingHistory, error: historyError } = useAsyncData(
  'onchain-history',
  () => apiFetch<{ address: string; txs: OnChainTx[] }>('/api/history'),
  { lazy: true }
)

const filtered = computed(() => {
  const items = activity.value ?? []
  if (filter.value === 'all') return items
  return items.filter(i => i.type === filter.value)
})

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
  { value: 'split', label: 'Splits' },
  { value: 'gift_claim', label: 'Gifts' },
] as const

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function activityLabel(item: ActivityItem) {
  if (item.type === 'sent') return item.counterparty ? `To @${item.counterparty}` : 'Sent'
  if (item.type === 'received') return item.counterparty ? `From @${item.counterparty}` : 'Received'
  if (item.type === 'split') return item.memo ?? 'Split bill'
  if (item.type === 'gift_claim') return 'Gift claimed'
  return ''
}

function refresh() {
  if (tab.value === 'syno') refreshActivity()
  else refreshHistory()
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Activity</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Your full transaction history.</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
        @click="refresh()"
      >
        <RefreshCw class="h-3.5 w-3.5" /> Refresh
      </button>
    </div>

    <!-- Tabs -->
    <div class="mb-5 flex gap-1 rounded-xl border border-border bg-secondary p-1 w-fit">
      <button
        v-for="t in [{ key: 'syno', label: 'Syno' }, { key: 'onchain', label: 'On-chain' }]"
        :key="t.key"
        class="rounded-lg px-4 py-1.5 text-sm font-medium transition"
        :class="tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = t.key as any"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ── PAYRA TAB ── -->
    <div v-if="tab === 'syno'">

      <!-- Filter pills -->
      <div class="mb-4 flex items-center gap-2">
        <Filter class="h-3.5 w-3.5 text-muted-foreground" />
        <div class="flex gap-1.5">
          <button
            v-for="opt in filterOptions"
            :key="opt.value"
            class="rounded-full px-3 py-1 text-xs font-medium transition"
            :class="filter === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'"
            @click="filter = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="loadingActivity" class="rounded-2xl border border-border bg-card divide-y divide-border">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-5 py-4">
          <div class="h-9 w-9 shrink-0 animate-pulse rounded-full bg-secondary" />
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 w-28 animate-pulse rounded bg-secondary" />
            <div class="h-3 w-16 animate-pulse rounded bg-secondary" />
          </div>
          <div class="space-y-1.5 text-right">
            <div class="h-3.5 w-16 animate-pulse rounded bg-secondary ml-auto" />
            <div class="h-3 w-10 animate-pulse rounded bg-secondary ml-auto" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <Inbox class="h-6 w-6 text-muted-foreground" />
        </div>
        <p class="font-medium">No activity</p>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ filter === 'all' ? 'Send or receive SOL to see it here.' : `No ${filter} transactions yet.` }}
        </p>
      </div>

      <!-- List -->
      <div v-else class="rounded-2xl border border-border bg-card divide-y divide-border">
        <div
          v-for="item in filtered"
          :key="item.id"
          class="flex items-center gap-3 px-4 py-3 overflow-hidden"
        >
          <!-- icon -->
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            :class="{
              'bg-green-500/10': item.type === 'received' || item.type === 'gift_claim',
              'bg-secondary': item.type === 'sent',
              'bg-purple-500/10': item.type === 'split',
              'bg-yellow-500/10': item.type === 'gift_claim',
            }"
          >
            <ArrowDownRight v-if="item.type === 'received'" class="h-4 w-4 text-green-500" />
            <ArrowUpRight v-else-if="item.type === 'sent'" class="h-4 w-4 text-muted-foreground" />
            <Scissors v-else-if="item.type === 'split'" class="h-4 w-4 text-purple-500" />
            <Star v-else class="h-4 w-4 text-yellow-500" />
          </div>

          <!-- label + memo -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ activityLabel(item) }}</p>
            <p v-if="item.memo && item.type !== 'split'" class="mt-0.5 truncate text-xs text-muted-foreground">
              {{ item.memo }}
            </p>
          </div>

          <!-- amount + time -->
          <div class="shrink-0 text-right">
            <p
              class="text-sm font-semibold"
              :class="item.type === 'received' || item.type === 'gift_claim' ? 'text-green-500' : ''"
            >
              {{ item.type === 'received' || item.type === 'gift_claim' ? '+' : item.type === 'sent' ? '-' : '' }}{{ formatAmount(item.amount) }} <span class="text-xs font-normal">{{ item.token }}</span>
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ timeAgo(item.created_at) }}</p>
          </div>

          <!-- external link -->
          <a
            v-if="item.tx_signature"
            :href="`https://solscan.io/tx/${item.tx_signature}`"
            target="_blank"
            class="shrink-0 text-muted-foreground transition hover:text-foreground"
          >
            <ExternalLink class="h-3.5 w-3.5" />
          </a>
          <NuxtLink
            v-else-if="item.type === 'split'"
            :to="`/app/split/${item.id}`"
            class="shrink-0 text-muted-foreground transition hover:text-foreground"
          >
            <ExternalLink class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- ── ON-CHAIN TAB ── -->
    <div v-else>

      <!-- Loading -->
      <div v-if="loadingHistory" class="flex items-center justify-center py-16">
        <span class="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>

      <!-- Error / no key -->
      <div v-else-if="historyError" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <Inbox class="h-6 w-6 text-muted-foreground" />
        </div>
        <p class="font-medium">On-chain history unavailable</p>
        <p class="mt-1 text-sm text-muted-foreground">Could not load transaction history.</p>
      </div>

      <!-- Empty -->
      <div v-else-if="!history?.txs?.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <Inbox class="h-6 w-6 text-muted-foreground" />
        </div>
        <p class="font-medium">No on-chain transactions</p>
        <p class="mt-1 text-sm text-muted-foreground">No transactions found for this wallet.</p>
      </div>

      <!-- List -->
      <div v-else class="rounded-2xl border border-border bg-card divide-y divide-border">
        <div
          v-for="tx in history.txs"
          :key="tx.tx_hash"
          class="flex items-center gap-4 px-5 py-4"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            :class="tx.successful ? 'bg-green-500/10' : 'bg-destructive/10'"
          >
            <ArrowUpRight v-if="tx.successful" class="h-4 w-4 text-green-500" />
            <ArrowUpRight v-else class="h-4 w-4 text-destructive" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="font-mono text-sm">{{ shortAddr(tx.tx_hash, 8) }}</p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{ tx.to_address ? `To ${shortAddr(tx.to_address, 6)}` : 'Contract interaction' }}
            </p>
          </div>

          <div class="text-right">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="tx.successful ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-destructive/10 text-destructive'"
            >
              {{ tx.successful ? 'Success' : 'Failed' }}
            </span>
            <p class="mt-1 text-xs text-muted-foreground">{{ timeAgo(tx.block_signed_at) }}</p>
          </div>

          <a
            :href="`https://solscan.io/tx/${tx.tx_hash}`"
            target="_blank"
            class="shrink-0 text-muted-foreground transition hover:text-foreground"
          >
            <ExternalLink class="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

    </div>

  </div>
</template>
