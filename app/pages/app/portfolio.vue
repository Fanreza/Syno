<script setup lang="ts">
import { TrendingUp, TrendingDown, Minus, RefreshCw, BarChart2, ArrowUpRight, ArrowDownRight } from 'lucide-vue-next'

const { apiFetch } = useAuth()
const { formatDisplay, fetchRates } = useDisplayCurrency()
const { isDark } = useTheme()
onMounted(() => fetchRates())

// ── Portfolio data ───────────────────────────────────────────────────────────
const { data: portfolio, refresh: refreshPortfolio, pending: pendingPortfolio } = useAsyncData(
  'portfolio-history',
  () => apiFetch<{
    currentUsd: number
    solBalance: number
    solPrice: number
    pnl24h: number | null
    pnl24hPct: number | null
    pnlTotal: number | null
    pnlTotalPct: number | null
    history: { date: string; usd: number }[]
    tokenPnl: { symbol: string; mint: string; logoURI: string | null; usd: number; change24h: number; pnl24h: number }[]
  }>('/api/portfolio/history'),
  { lazy: true, server: false }
)

// ── Analytics data ───────────────────────────────────────────────────────────
type Analytics = {
  monthly: { month: string; sent: number; received: number }[]
  topRecipients: { username: string | null; address: string; totalSent: number; count: number }[]
  tokenBreakdown: { token: string; sent: number; received: number }[]
  summary: { totalSent: number; totalReceived: number; txCount: number }
}
const { data: analytics, refresh: refreshAnalytics, pending: pendingAnalytics } = useAsyncData<Analytics>(
  'analytics',
  () => apiFetch('/api/analytics'),
  { lazy: true, server: false }
)

async function refreshAll() {
  await Promise.all([refreshPortfolio(), refreshAnalytics()])
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function pct(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
}

const KNOWN_TOKENS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
}
function tokenLabel(mint: string) {
  return KNOWN_TOKENS[mint] ?? (mint.length > 8 ? mint.slice(0, 4) + '…' : mint)
}

function monthName(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

// ── Chart shared ─────────────────────────────────────────────────────────────
const chartTheme = computed(() => isDark.value ? 'dark' : 'light')
const gridColor = computed(() => isDark.value ? '#ffffff10' : '#00000010')
const labelColor = computed(() => isDark.value ? '#94a3b8' : '#64748b')

// ── Area chart — portfolio history ───────────────────────────────────────────
const sparkTrend = computed(() => {
  const h = portfolio.value?.history ?? []
  if (h.length < 2) return 0
  return (h[h.length - 1]?.usd ?? 0) - (h[0]?.usd ?? 0)
})
const chartColor = computed(() => sparkTrend.value >= 0 ? '#22c55e' : '#ef4444')

const areaOptions = computed(() => ({
  chart: { type: 'area', background: 'transparent', toolbar: { show: false }, animations: { enabled: true, speed: 600 }, fontFamily: 'inherit' },
  theme: { mode: chartTheme.value },
  colors: [chartColor.value],
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0, stops: [0, 100] } },
  stroke: { curve: 'smooth', width: 2 },
  dataLabels: { enabled: false },
  xaxis: {
    type: 'datetime',
    categories: portfolio.value?.history.map(p => new Date(p.date).getTime()) ?? [],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: labelColor.value, fontSize: '11px' }, datetimeFormatter: { month: 'MMM dd' } },
  },
  yaxis: {
    labels: {
      style: { colors: labelColor.value, fontSize: '11px' },
      formatter: (v: number) => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)),
    },
  },
  grid: { borderColor: gridColor.value, strokeDashArray: 4, xaxis: { lines: { show: false } } },
  tooltip: { theme: chartTheme.value, x: { format: 'MMM dd, yyyy' }, y: { formatter: (v: number) => formatDisplay(v) } },
  markers: { size: 0, hover: { size: 4 } },
}))

const areaSeries = computed(() => [{
  name: 'Net worth',
  data: portfolio.value?.history.map(p => parseFloat(p.usd.toFixed(2))) ?? [],
}])

// ── Bar chart — monthly activity ─────────────────────────────────────────────
const barOptions = computed(() => ({
  chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, animations: { enabled: true, speed: 500 }, fontFamily: 'inherit' },
  theme: { mode: chartTheme.value },
  plotOptions: { bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
  colors: ['#f87171', '#4ade80'],
  dataLabels: { enabled: false },
  legend: {
    position: 'top', horizontalAlign: 'left',
    labels: { colors: labelColor.value },
    markers: { size: 6, shape: 'circle' },
    itemMargin: { horizontal: 12 },
  },
  xaxis: {
    categories: analytics.value?.monthly.map(m => monthName(m.month)) ?? [],
    axisBorder: { show: false }, axisTicks: { show: false },
    labels: { style: { colors: labelColor.value, fontSize: '12px' } },
  },
  yaxis: {
    labels: {
      style: { colors: labelColor.value, fontSize: '11px' },
      formatter: (v: number) => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)),
    },
  },
  grid: { borderColor: gridColor.value, strokeDashArray: 4, xaxis: { lines: { show: false } } },
  tooltip: { theme: chartTheme.value, y: { formatter: (v: number) => formatDisplay(v) } },
}))

const barSeries = computed(() => [
  { name: 'Sent', data: analytics.value?.monthly.map(m => parseFloat(m.sent.toFixed(2))) ?? [] },
  { name: 'Received', data: analytics.value?.monthly.map(m => parseFloat(m.received.toFixed(2))) ?? [] },
])

// ── Donut chart — token breakdown ────────────────────────────────────────────
const donutOptions = computed(() => ({
  chart: { type: 'donut', background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 500 } },
  theme: { mode: chartTheme.value },
  colors: ['#818cf8', '#f87171', '#4ade80', '#fb923c', '#38bdf8', '#a78bfa', '#f472b6'],
  labels: analytics.value?.tokenBreakdown.map(t => tokenLabel(t.token)) ?? [],
  legend: { position: 'bottom', labels: { colors: labelColor.value }, markers: { size: 6, shape: 'circle' }, itemMargin: { horizontal: 8, vertical: 4 } },
  dataLabels: { enabled: true, formatter: (val: number) => val.toFixed(1) + '%', style: { fontSize: '11px', fontWeight: 600 }, dropShadow: { enabled: false } },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true, label: 'Volume', color: labelColor.value, fontSize: '12px',
            formatter: (w: any) => {
              const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              return total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toFixed(2)
            },
          },
        },
      },
    },
  },
  tooltip: { theme: chartTheme.value, y: { formatter: (v: number) => v.toFixed(4) + ' tokens' } },
  stroke: { width: 0 },
}))

const donutSeries = computed(() =>
  analytics.value?.tokenBreakdown.map(t => parseFloat((t.sent + t.received).toFixed(4))) ?? []
)

const hasDonutData = computed(() => donutSeries.value.some(v => v > 0))
const hasBarData = computed(() => barSeries.value[0]?.data.some(v => v > 0) || barSeries.value[1]?.data.some(v => v > 0))
const pendingAny = computed(() => pendingPortfolio.value || pendingAnalytics.value)
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Portfolio</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Net worth, P&L, and spending analytics.</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
        @click="refreshAll()"
      >
        <RefreshCw class="h-3.5 w-3.5" /> Refresh
      </button>
    </div>

    <div v-if="pendingAny" class="space-y-4">
      <div class="h-64 skeleton rounded-2xl" />
      <div class="grid gap-4 md:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-24 skeleton rounded-2xl" />
      </div>
      <div class="h-24 skeleton rounded-2xl" />
      <div class="h-72 skeleton rounded-2xl" />
      <div class="grid gap-4 md:grid-cols-2">
        <div class="h-64 skeleton rounded-2xl" />
        <div class="h-64 skeleton rounded-2xl" />
      </div>
    </div>

    <template v-else>

      <!-- ── PORTFOLIO ── -->
      <template v-if="portfolio">

        <!-- Net worth + area chart -->
        <div class="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div class="p-6">
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total net worth</p>
            <p class="mt-2 text-4xl font-bold tracking-tight">{{ formatDisplay(portfolio.currentUsd) }}</p>
            <div class="mt-1 flex items-center gap-2">
              <span class="flex items-center gap-1 text-sm font-semibold" :class="(portfolio.pnl24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
                <TrendingUp v-if="(portfolio.pnl24h ?? 0) > 0" class="h-3.5 w-3.5" />
                <TrendingDown v-else-if="(portfolio.pnl24h ?? 0) < 0" class="h-3.5 w-3.5" />
                <Minus v-else class="h-3.5 w-3.5" />
                {{ portfolio.pnl24h !== null ? (portfolio.pnl24h >= 0 ? '+' : '') + formatDisplay(portfolio.pnl24h) : '—' }}
              </span>
              <span class="text-sm text-muted-foreground">{{ pct(portfolio.pnl24hPct) }} today</span>
            </div>
          </div>
          <div v-if="portfolio.history.length >= 2" class="border-t border-border px-2 pb-2 pt-0">
            <apexchart type="area" height="180" :options="areaOptions" :series="areaSeries" />
          </div>
          <div v-else class="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
            <BarChart2 class="mx-auto mb-2 h-8 w-8 opacity-30" />
            Chart builds over time — check back tomorrow.
          </div>
        </div>

        <!-- P&L stats -->
        <div class="mb-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">24h P&L</p>
            <p class="mt-2 text-2xl font-bold" :class="(portfolio.pnl24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ portfolio.pnl24h !== null ? (portfolio.pnl24h >= 0 ? '+' : '') + formatDisplay(portfolio.pnl24h) : '—' }}
            </p>
            <p class="mt-0.5 text-sm font-semibold" :class="(portfolio.pnl24hPct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">{{ pct(portfolio.pnl24hPct) }}</p>
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">All-time P&L</p>
            <p class="mt-2 text-2xl font-bold" :class="(portfolio.pnlTotal ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
              {{ portfolio.pnlTotal !== null ? (portfolio.pnlTotal >= 0 ? '+' : '') + formatDisplay(portfolio.pnlTotal) : '—' }}
            </p>
            <p class="mt-0.5 text-sm font-semibold" :class="(portfolio.pnlTotalPct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">{{ pct(portfolio.pnlTotalPct) }}</p>
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">SOL price</p>
            <p class="mt-2 text-2xl font-bold">{{ formatDisplay(portfolio.solPrice) }}</p>
            <p class="mt-0.5 text-sm text-muted-foreground">{{ portfolio.solBalance.toFixed(4) }} SOL held</p>
          </div>
        </div>

        <!-- Top movers -->
        <div v-if="portfolio.tokenPnl.length" class="mb-4 rounded-2xl border border-border bg-card">
          <div class="border-b border-border px-6 py-4">
            <h2 class="font-semibold">Top movers (24h)</h2>
            <p class="mt-0.5 text-xs text-muted-foreground">Powered by GoldRush</p>
          </div>
          <div class="divide-y divide-border">
            <div v-for="t in portfolio.tokenPnl" :key="t.mint" class="flex items-center gap-4 px-6 py-4">
              <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                <img v-if="t.logoURI" :src="t.logoURI" :alt="t.symbol" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display='none'" />
                <span v-else>{{ t.symbol.slice(0, 3) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold">{{ t.symbol }}</p>
                <p class="text-sm text-muted-foreground">{{ formatDisplay(t.usd) }} held</p>
              </div>
              <div class="text-right">
                <p class="font-semibold" :class="t.change24h >= 0 ? 'text-green-500' : 'text-red-500'">{{ t.change24h >= 0 ? '+' : '' }}{{ t.change24h.toFixed(2) }}%</p>
                <p class="text-xs" :class="t.pnl24h >= 0 ? 'text-green-500' : 'text-red-500'">{{ t.pnl24h >= 0 ? '+' : '' }}{{ formatDisplay(t.pnl24h) }}</p>
              </div>
            </div>
          </div>
        </div>

      </template>

      <!-- ── ANALYTICS ── -->
      <template v-if="analytics">

        <!-- Divider -->
        <div class="mb-4 flex items-center gap-3">
          <div class="h-px flex-1 bg-border" />
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Spending analytics</p>
          <div class="h-px flex-1 bg-border" />
        </div>

        <!-- Summary cards -->
        <div class="mb-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total sent</p>
            <p class="mt-2 text-2xl font-bold text-red-500">{{ formatDisplay(analytics.summary.totalSent) }}</p>
            <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight class="h-3 w-3" /> {{ analytics.summary.txCount }} transactions
            </p>
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total received</p>
            <p class="mt-2 text-2xl font-bold text-green-500">{{ formatDisplay(analytics.summary.totalReceived) }}</p>
            <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowDownRight class="h-3 w-3" /> last 6 months
            </p>
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Net flow</p>
            <p class="mt-2 text-2xl font-bold" :class="analytics.summary.totalReceived >= analytics.summary.totalSent ? 'text-green-500' : 'text-red-500'">
              {{ analytics.summary.totalReceived >= analytics.summary.totalSent ? '+' : '-' }}{{ formatDisplay(Math.abs(analytics.summary.totalReceived - analytics.summary.totalSent)) }}
            </p>
            <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp v-if="analytics.summary.totalReceived >= analytics.summary.totalSent" class="h-3 w-3 text-green-500" />
              <TrendingDown v-else class="h-3 w-3 text-red-500" />
              received vs sent
            </p>
          </div>
        </div>

        <!-- Monthly bar chart -->
        <div class="mb-4 rounded-2xl border border-border bg-card p-5">
          <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Monthly activity</p>
          <apexchart v-if="hasBarData" type="bar" height="260" :options="barOptions" :series="barSeries" />
          <div v-else class="flex flex-col items-center py-16 text-center text-sm text-muted-foreground">
            <BarChart2 class="mb-2 h-8 w-8 opacity-30" />
            No transactions in the last 6 months.
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <!-- Top recipients -->
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top recipients</p>
            <div v-if="analytics.topRecipients.length" class="space-y-3">
              <div v-for="r in analytics.topRecipients" :key="r.address" class="flex items-center gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {{ (r.username ?? r.address)?.[0]?.toUpperCase() ?? '?' }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{{ r.username ? '@' + r.username : r.address.slice(0, 8) + '…' }}</p>
                  <p class="text-xs text-muted-foreground">{{ r.count }} tx</p>
                </div>
                <p class="shrink-0 text-sm font-semibold">{{ formatDisplay(r.totalSent) }}</p>
              </div>
            </div>
            <p v-else class="py-4 text-center text-sm text-muted-foreground">No outgoing payments yet.</p>
          </div>

          <!-- Token breakdown donut -->
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">By token</p>
            <apexchart v-if="hasDonutData" type="donut" height="260" :options="donutOptions" :series="donutSeries" />
            <p v-else class="py-16 text-center text-sm text-muted-foreground">No token data yet.</p>
          </div>
        </div>

      </template>

    </template>

  </div>
</template>
