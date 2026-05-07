<script setup lang="ts">
import { TrendingUp, TrendingDown, Minus, RefreshCw, BarChart2 } from 'lucide-vue-next'

const { apiFetch } = useAuth()
const { formatDisplay, fetchRates } = useDisplayCurrency()
const { isDark } = useTheme()
onMounted(() => fetchRates())

const { data, refresh, pending } = useAsyncData(
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

function pct(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const sparkTrend = computed(() => {
  const h = data.value?.history ?? []
  if (h.length < 2) return 0
  return (h[h.length - 1]?.usd ?? 0) - (h[0]?.usd ?? 0)
})

const chartColor = computed(() => sparkTrend.value >= 0 ? '#22c55e' : '#ef4444')
const labelColor = computed(() => isDark.value ? '#94a3b8' : '#64748b')
const gridColor = computed(() => isDark.value ? '#ffffff10' : '#00000010')

const areaOptions = computed(() => ({
  chart: {
    type: 'area',
    background: 'transparent',
    toolbar: { show: false },
    sparkline: { enabled: false },
    animations: { enabled: true, speed: 600 },
    fontFamily: 'inherit',
  },
  theme: { mode: isDark.value ? 'dark' : 'light' },
  colors: [chartColor.value],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.25,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
  stroke: { curve: 'smooth', width: 2 },
  dataLabels: { enabled: false },
  xaxis: {
    type: 'datetime',
    categories: data.value?.history.map(p => new Date(p.date).getTime()) ?? [],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: { colors: labelColor.value, fontSize: '11px' },
      datetimeFormatter: { month: 'MMM dd' },
    },
  },
  yaxis: {
    labels: {
      style: { colors: labelColor.value, fontSize: '11px' },
      formatter: (v: number) => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)),
    },
  },
  grid: {
    borderColor: gridColor.value,
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    x: { format: 'MMM dd, yyyy' },
    y: { formatter: (v: number) => formatDisplay(v) },
  },
  markers: { size: 0, hover: { size: 4 } },
}))

const areaSeries = computed(() => [{
  name: 'Net worth',
  data: data.value?.history.map(p => parseFloat(p.usd.toFixed(2))) ?? [],
}])
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Portfolio</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Net worth and P&L over time.</p>
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
      <div class="h-64 skeleton rounded-2xl" />
      <div class="grid gap-4 md:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-24 skeleton rounded-2xl" />
      </div>
    </div>

    <template v-else-if="data">

      <!-- Net worth card + area chart -->
      <div class="mb-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div class="p-6">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total net worth</p>
          <p class="mt-2 text-4xl font-bold tracking-tight">{{ formatDisplay(data.currentUsd) }}</p>
          <div class="mt-1 flex items-center gap-2">
            <span
              class="flex items-center gap-1 text-sm font-semibold"
              :class="(data.pnl24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              <TrendingUp v-if="(data.pnl24h ?? 0) > 0" class="h-3.5 w-3.5" />
              <TrendingDown v-else-if="(data.pnl24h ?? 0) < 0" class="h-3.5 w-3.5" />
              <Minus v-else class="h-3.5 w-3.5" />
              {{ data.pnl24h !== null ? (data.pnl24h >= 0 ? '+' : '') + formatDisplay(data.pnl24h) : '—' }}
            </span>
            <span class="text-sm text-muted-foreground">{{ pct(data.pnl24hPct) }} today</span>
          </div>
        </div>

        <!-- ApexCharts area chart -->
        <div v-if="data.history.length >= 2" class="border-t border-border px-2 pb-2 pt-0">
          <apexchart
            type="area"
            height="180"
            :options="areaOptions"
            :series="areaSeries"
          />
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
          <p class="mt-2 text-2xl font-bold" :class="(data.pnl24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ data.pnl24h !== null ? (data.pnl24h >= 0 ? '+' : '') + formatDisplay(data.pnl24h) : '—' }}
          </p>
          <p class="mt-0.5 text-sm font-semibold" :class="(data.pnl24hPct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">{{ pct(data.pnl24hPct) }}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">All-time P&L</p>
          <p class="mt-2 text-2xl font-bold" :class="(data.pnlTotal ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">
            {{ data.pnlTotal !== null ? (data.pnlTotal >= 0 ? '+' : '') + formatDisplay(data.pnlTotal) : '—' }}
          </p>
          <p class="mt-0.5 text-sm font-semibold" :class="(data.pnlTotalPct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'">{{ pct(data.pnlTotalPct) }}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">SOL price</p>
          <p class="mt-2 text-2xl font-bold">{{ formatDisplay(data.solPrice) }}</p>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ data.solBalance.toFixed(4) }} SOL held</p>
        </div>
      </div>

      <!-- Token P&L breakdown -->
      <div v-if="data.tokenPnl.length" class="rounded-2xl border border-border bg-card">
        <div class="border-b border-border px-6 py-4">
          <h2 class="font-semibold">Top movers (24h)</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">Powered by GoldRush</p>
        </div>
        <div class="divide-y divide-border">
          <div
            v-for="t in data.tokenPnl"
            :key="t.mint"
            class="flex items-center gap-4 px-6 py-4"
          >
            <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
              <img v-if="t.logoURI" :src="t.logoURI" :alt="t.symbol" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display='none'" />
              <span v-else>{{ t.symbol.slice(0, 3) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ t.symbol }}</p>
              <p class="text-sm text-muted-foreground">{{ formatDisplay(t.usd) }} held</p>
            </div>
            <div class="text-right">
              <p class="font-semibold" :class="t.change24h >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ t.change24h >= 0 ? '+' : '' }}{{ t.change24h.toFixed(2) }}%
              </p>
              <p class="text-xs" :class="t.pnl24h >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ t.pnl24h >= 0 ? '+' : '' }}{{ formatDisplay(t.pnl24h) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No token P&L data available yet.
      </div>

    </template>

    <!-- No data -->
    <div v-else class="flex flex-col items-center justify-center py-24 text-center">
      <BarChart2 class="mb-4 h-10 w-10 text-muted-foreground" />
      <p class="font-semibold">No portfolio data</p>
      <p class="mt-1 text-sm text-muted-foreground">Could not load portfolio history.</p>
    </div>

  </div>
</template>
