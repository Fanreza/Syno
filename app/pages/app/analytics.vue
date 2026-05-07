<script setup lang="ts">
import { TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, ArrowDownRight, BarChart2 } from 'lucide-vue-next'

const { apiFetch } = useAuth()
const { isDark } = useTheme()

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

function monthName(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

function formatAmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}

// ── ApexCharts theme base ────────────────────────────────────────────────────
const chartTheme = computed(() => isDark.value ? 'dark' : 'light')
const gridColor = computed(() => isDark.value ? '#ffffff10' : '#00000010')
const labelColor = computed(() => isDark.value ? '#94a3b8' : '#64748b')
const bgColor = computed(() => isDark.value ? 'transparent' : 'transparent')

// ── Bar chart — monthly sent vs received ────────────────────────────────────
const barOptions = computed(() => ({
  chart: {
    type: 'bar',
    background: bgColor.value,
    toolbar: { show: false },
    animations: { enabled: true, speed: 500 },
    fontFamily: 'inherit',
  },
  theme: { mode: chartTheme.value },
  plotOptions: {
    bar: {
      columnWidth: '55%',
      borderRadius: 4,
      borderRadiusApplication: 'end',
    },
  },
  colors: ['#f87171', '#4ade80'],
  dataLabels: { enabled: false },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    labels: { colors: labelColor.value },
    markers: { size: 6, shape: 'circle' },
    itemMargin: { horizontal: 12 },
  },
  xaxis: {
    categories: data.value?.monthly.map(m => monthName(m.month)) ?? [],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: labelColor.value, fontSize: '12px' } },
  },
  yaxis: {
    labels: {
      style: { colors: labelColor.value, fontSize: '11px' },
      formatter: (v: number) => formatAmt(v),
    },
  },
  grid: {
    borderColor: gridColor.value,
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  tooltip: {
    theme: chartTheme.value,
    y: { formatter: (v: number) => formatAmt(v) },
  },
}))

const barSeries = computed(() => [
  { name: 'Sent', data: data.value?.monthly.map(m => parseFloat(m.sent.toFixed(4))) ?? [] },
  { name: 'Received', data: data.value?.monthly.map(m => parseFloat(m.received.toFixed(4))) ?? [] },
])

// ── Donut chart — token breakdown ────────────────────────────────────────────
const donutOptions = computed(() => ({
  chart: {
    type: 'donut',
    background: bgColor.value,
    toolbar: { show: false },
    fontFamily: 'inherit',
    animations: { enabled: true, speed: 500 },
  },
  theme: { mode: chartTheme.value },
  colors: ['#818cf8', '#f87171', '#4ade80', '#fb923c', '#38bdf8', '#a78bfa', '#f472b6'],
  labels: data.value?.tokenBreakdown.map(t => tokenLabel(t.token)) ?? [],
  legend: {
    position: 'bottom',
    labels: { colors: labelColor.value },
    markers: { size: 6, shape: 'circle' },
    itemMargin: { horizontal: 8, vertical: 4 },
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => val.toFixed(1) + '%',
    style: { fontSize: '11px', fontWeight: 600 },
    dropShadow: { enabled: false },
  },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total sent',
            color: labelColor.value,
            fontSize: '12px',
            formatter: (w: any) => {
              const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              return formatAmt(total)
            },
          },
        },
      },
    },
  },
  tooltip: {
    theme: chartTheme.value,
    y: { formatter: (v: number) => formatAmt(v) },
  },
  stroke: { width: 0 },
}))

const donutSeries = computed(() =>
  data.value?.tokenBreakdown.map(t => parseFloat((t.sent + t.received).toFixed(4))) ?? []
)

const hasDonutData = computed(() => donutSeries.value.length > 0 && donutSeries.value.some(v => v > 0))
const hasBarData = computed(() => barSeries.value[0]?.data.some(v => v > 0) || barSeries.value[1]?.data.some(v => v > 0))
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
      <div class="h-72 skeleton rounded-2xl" />
      <div class="grid gap-4 md:grid-cols-2">
        <div class="h-64 skeleton rounded-2xl" />
        <div class="h-64 skeleton rounded-2xl" />
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
      <div class="mb-4 rounded-2xl border border-border bg-card p-5">
        <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Monthly activity</p>
        <div v-if="hasBarData">
          <apexchart
            type="bar"
            height="260"
            :options="barOptions"
            :series="barSeries"
          />
        </div>
        <div v-else class="flex flex-col items-center py-16 text-center text-sm text-muted-foreground">
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

        <!-- Token breakdown donut -->
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">By token</p>
          <div v-if="hasDonutData">
            <apexchart
              type="donut"
              height="260"
              :options="donutOptions"
              :series="donutSeries"
            />
          </div>
          <p v-else class="py-16 text-center text-sm text-muted-foreground">No token data yet.</p>
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
