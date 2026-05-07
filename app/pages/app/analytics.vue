<script setup lang="ts">
import { BarChart2, TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-vue-next'

const { apiFetch } = useAuth()
const { formatDisplay } = useDisplayCurrency()

const KNOWN_TOKENS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
}
function tokenLabel(mint: string) {
  return KNOWN_TOKENS[mint] ?? (mint.length > 8 ? mint.slice(0, 4) + '…' : mint)
}

type Analytics = {
  monthly: { month: string; sent: number; received: number }[]
  topRecipients: { username: string | null; address: string; totalSent: number; count: number }[]
  tokenBreakdown: { token: string; sent: number; received: number }[]
  summary: { totalSent: number; totalReceived: number; txCount: number }
}

const { data, pending, refresh } = useAsyncData<Analytics>(
  'analytics',
  () => apiFetch('/api/analytics'),
  { lazy: true, server: false }
)

// Bar chart SVG — sent vs received per month
const BAR_W = 100
const BAR_H = 80
const barChart = computed(() => {
  const months = data.value?.monthly ?? []
  if (!months.length) return null
  const maxVal = Math.max(...months.flatMap(m => [m.sent, m.received]), 0.001)
  const slotW = BAR_W / months.length
  const barW = (slotW * 0.35)
  return months.map((m, i) => {
    const x = i * slotW + slotW * 0.1
    const sentH = (m.sent / maxVal) * (BAR_H - 8)
    const recH = (m.received / maxVal) * (BAR_H - 8)
    const label = m.month.slice(5) // 'MM'
    return {
      label,
      sentX: x,
      sentY: BAR_H - sentH,
      sentH,
      recX: x + barW + 1,
      recY: BAR_H - recH,
      recH,
      barW,
    }
  })
})

function monthName(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

function formatAmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Analytics</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Spending overview — last 6 months.</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
        @click="refresh()"
      >
        <RefreshCw class="h-3.5 w-3.5" /> Refresh
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-24 skeleton rounded-2xl" />
      </div>
      <div class="h-48 skeleton rounded-2xl" />
      <div class="grid gap-4 md:grid-cols-2">
        <div class="h-40 skeleton rounded-2xl" />
        <div class="h-40 skeleton rounded-2xl" />
      </div>
    </div>

    <template v-else-if="data">

      <!-- Summary cards -->
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total sent</p>
          <p class="mt-2 text-2xl font-bold text-red-500">{{ formatAmt(data.summary.totalSent) }}</p>
          <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight class="h-3 w-3" /> {{ data.summary.txCount }} transactions
          </p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total received</p>
          <p class="mt-2 text-2xl font-bold text-green-500">{{ formatAmt(data.summary.totalReceived) }}</p>
          <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDownRight class="h-3 w-3" /> last 6 months
          </p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Net flow</p>
          <p
            class="mt-2 text-2xl font-bold"
            :class="data.summary.totalReceived >= data.summary.totalSent ? 'text-green-500' : 'text-red-500'"
          >
            {{ data.summary.totalReceived >= data.summary.totalSent ? '+' : '-' }}{{ formatAmt(Math.abs(data.summary.totalReceived - data.summary.totalSent)) }}
          </p>
          <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp v-if="data.summary.totalReceived >= data.summary.totalSent" class="h-3 w-3 text-green-500" />
            <TrendingDown v-else class="h-3 w-3 text-red-500" />
            received vs sent
          </p>
        </div>
      </div>

      <!-- Monthly bar chart -->
      <div class="mb-4 overflow-hidden rounded-2xl border border-border bg-card p-6">
        <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Monthly activity</p>

        <div v-if="barChart && barChart.length" class="relative">
          <!-- Legend -->
          <div class="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/70" />Sent</span>
            <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-green-400/70" />Received</span>
          </div>
          <svg :viewBox="`0 0 ${BAR_W} ${BAR_H + 14}`" class="h-40 w-full" preserveAspectRatio="none">
            <g v-for="bar in barChart" :key="bar.label">
              <!-- Sent bar -->
              <rect
                :x="bar.sentX" :y="bar.sentY"
                :width="bar.barW" :height="bar.sentH"
                rx="1" fill="rgb(248 113 113 / 0.7)"
              />
              <!-- Received bar -->
              <rect
                :x="bar.recX" :y="bar.recY"
                :width="bar.barW" :height="bar.recH"
                rx="1" fill="rgb(74 222 128 / 0.7)"
              />
              <!-- Month label -->
              <text
                :x="bar.sentX + bar.barW"
                :y="BAR_H + 10"
                text-anchor="middle"
                font-size="4"
                fill="currentColor"
                class="text-muted-foreground"
                opacity="0.6"
              >{{ bar.label }}</text>
            </g>
          </svg>
          <!-- Month labels below -->
          <div class="mt-1 flex text-[10px] text-muted-foreground">
            <div v-for="m in data.monthly" :key="m.month" class="flex-1 text-center">
              {{ monthName(m.month) }}
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
          <BarChart2 class="mb-2 h-8 w-8 opacity-30" />
          No transactions in the last 6 months.
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">

        <!-- Top recipients -->
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top recipients</p>
          <div v-if="data.topRecipients.length" class="space-y-3">
            <div
              v-for="r in data.topRecipients"
              :key="r.address"
              class="flex items-center gap-3"
            >
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {{ (r.username ?? r.address)?.[0]?.toUpperCase() ?? '?' }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ r.username ? '@' + r.username : r.address.slice(0, 8) + '…' }}</p>
                <p class="text-xs text-muted-foreground">{{ r.count }} tx</p>
              </div>
              <p class="shrink-0 text-sm font-semibold">{{ formatAmt(r.totalSent) }}</p>
            </div>
          </div>
          <p v-else class="py-4 text-center text-sm text-muted-foreground">No outgoing payments yet.</p>
        </div>

        <!-- Token breakdown -->
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">By token</p>
          <div v-if="data.tokenBreakdown.length" class="space-y-3">
            <div
              v-for="t in data.tokenBreakdown"
              :key="t.token"
              class="space-y-1.5"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold">{{ tokenLabel(t.token) }}</span>
                <span class="text-muted-foreground">{{ formatAmt(t.sent) }} sent · {{ formatAmt(t.received) }} received</span>
              </div>
              <div class="flex h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  class="h-full rounded-full bg-red-400/70"
                  :style="`width: ${t.sent / (t.sent + t.received + 0.0001) * 100}%`"
                />
                <div
                  class="h-full rounded-full bg-green-400/70"
                  :style="`width: ${t.received / (t.sent + t.received + 0.0001) * 100}%`"
                />
              </div>
            </div>
          </div>
          <p v-else class="py-4 text-center text-sm text-muted-foreground">No token data yet.</p>
        </div>

      </div>
    </template>

    <!-- No data -->
    <div v-else class="flex flex-col items-center justify-center py-24 text-center">
      <BarChart2 class="mb-4 h-10 w-10 text-muted-foreground" />
      <p class="font-semibold">No analytics data</p>
      <p class="mt-1 text-sm text-muted-foreground">Send or receive payments to see your spending overview.</p>
    </div>

  </div>
</template>
