<script setup lang="ts">
import { TrendingUp, TrendingDown, Minus, RefreshCw, BarChart2 } from 'lucide-vue-next'

const { apiFetch } = useAuth()
const { formatDisplay, fetchRates } = useDisplayCurrency()
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

// SVG sparkline — 100 wide × 48 tall
const sparkPath = computed(() => {
  const pts = data.value?.history ?? []
  if (pts.length < 2) return ''
  const vals = pts.map(p => p.usd)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const W = 100
  const H = 48
  const coords = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W
    const y = H - ((p.usd - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return 'M ' + coords.join(' L ')
})

const sparkTrend = computed(() => {
  const h = data.value?.history ?? []
  if (h.length < 2) return 0
  return (h[h.length - 1]?.usd ?? 0) - (h[0]?.usd ?? 0)
})

function pct(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Tooltip on chart hover
const hovered = ref<{ date: string; usd: number } | null>(null)
const tooltipX = ref(0)

function onChartMove(e: MouseEvent) {
  const pts = data.value?.history ?? []
  if (!pts.length) return
  const svg = (e.currentTarget as SVGElement).getBoundingClientRect()
  const xRatio = (e.clientX - svg.left) / svg.width
  const idx = Math.round(xRatio * (pts.length - 1))
  hovered.value = pts[Math.max(0, Math.min(idx, pts.length - 1))] ?? null
  tooltipX.value = e.clientX - svg.left
}
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
      <div class="h-40 skeleton rounded-2xl" />
      <div class="grid gap-4 md:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-24 skeleton rounded-2xl" />
      </div>
    </div>

    <template v-else-if="data">

      <!-- Net worth card + sparkline -->
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

        <!-- Chart -->
        <div v-if="data.history.length >= 2" class="relative border-t border-border px-0 pb-0">
          <div v-if="hovered" class="pointer-events-none absolute top-2 z-10 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
            :style="{ left: Math.min(tooltipX, 240) + 'px' }"
          >
            <p class="font-semibold">{{ formatDisplay(hovered.usd) }}</p>
            <p class="text-muted-foreground">{{ fmtDate(hovered.date) }}</p>
          </div>
          <svg
            viewBox="0 0 100 48"
            preserveAspectRatio="none"
            class="h-28 w-full cursor-crosshair"
            @mousemove="onChartMove"
            @mouseleave="hovered = null"
          >
            <!-- Fill -->
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="sparkTrend >= 0 ? '#22c55e' : '#ef4444'" stop-opacity="0.2" />
                <stop offset="100%" :stop-color="sparkTrend >= 0 ? '#22c55e' : '#ef4444'" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path
              v-if="sparkPath"
              :d="sparkPath + ' L 100,48 L 0,48 Z'"
              fill="url(#chartGrad)"
            />
            <!-- Line -->
            <path
              v-if="sparkPath"
              :d="sparkPath"
              fill="none"
              :stroke="sparkTrend >= 0 ? '#22c55e' : '#ef4444'"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
          </svg>
          <!-- Date labels -->
          <div class="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <span>{{ fmtDate(data.history[0]?.date ?? '') }}</span>
            <span>{{ fmtDate(data.history[data.history.length - 1]?.date ?? '') }}</span>
          </div>
        </div>
        <div v-else class="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
          <BarChart2 class="mx-auto mb-2 h-8 w-8 opacity-30" />
          Chart builds over time — check back tomorrow.
        </div>
      </div>

      <!-- P&L stats -->
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <!-- 24h P&L -->
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">24h P&L</p>
          <p class="mt-2 text-2xl font-bold"
            :class="(data.pnl24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'"
          >
            {{ data.pnl24h !== null ? (data.pnl24h >= 0 ? '+' : '') + formatDisplay(data.pnl24h) : '—' }}
          </p>
          <p class="mt-0.5 text-sm font-semibold"
            :class="(data.pnl24hPct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'"
          >{{ pct(data.pnl24hPct) }}</p>
        </div>

        <!-- All-time P&L -->
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">All-time P&L</p>
          <p class="mt-2 text-2xl font-bold"
            :class="(data.pnlTotal ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'"
          >
            {{ data.pnlTotal !== null ? (data.pnlTotal >= 0 ? '+' : '') + formatDisplay(data.pnlTotal) : '—' }}
          </p>
          <p class="mt-0.5 text-sm font-semibold"
            :class="(data.pnlTotalPct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'"
          >{{ pct(data.pnlTotalPct) }}</p>
        </div>

        <!-- SOL price -->
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
              <img
                v-if="t.logoURI"
                :src="t.logoURI"
                :alt="t.symbol"
                class="h-full w-full object-cover"
                @error="($event.target as HTMLImageElement).style.display='none'"
              />
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

      <!-- Empty token P&L -->
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
