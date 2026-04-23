<script setup lang="ts">
import SendModal from '~/components/SendModal.vue'
import SplitModal from '~/components/SplitModal.vue'
import GiftModal from '~/components/GiftModal.vue'
import RequestModal from '~/components/RequestModal.vue'
import {
  Send, ArrowDownLeft, Users, RefreshCw, Copy, Check, Gift, QrCode,
  ArrowUpRight, ArrowDownRight, Scissors, Star, Inbox
} from 'lucide-vue-next'
import { formatAmount, formatUsd, shortAddr } from '~/utils'

const { user, apiFetch } = useAuth()

const { data: balance, refresh: refreshBalance, pending: pendingBalance } = useAsyncData(
  () => `balance-${user.value?.wallet_address}`,
  () => user.value?.wallet_address
    ? $fetch<{ sol: number; usd: number; solPrice: number; tokens: any[] }>(`/api/balance?address=${user.value.wallet_address}`)
    : Promise.resolve({ sol: 0, usd: 0, solPrice: 0, tokens: [] }),
  { watch: [user], lazy: true }
)

const { data: earnPositions, refresh: refreshEarn } = useAsyncData(
  'dashboard-earn-positions',
  () => apiFetch<any[]>('/api/earn/positions'),
  { lazy: true, default: () => [] }
)

const totalUsd = computed(() => {
  const balUsd = balance.value?.usd ?? 0
  const earnUsd = (earnPositions.value ?? []).reduce((s: number, p: any) => {
    // JupUSD earn positions: 1 underlying ≈ $1 (USDC-denominated), others use SOL price
    const price = p.symbol?.toLowerCase().includes('sol') ? (balance.value?.solPrice ?? 0) : 1
    return s + p.balance * price
  }, 0)
  return balUsd + earnUsd
})

type TokenRow = { mint: string; symbol: string; name?: string; logoURI: string | null; balance: number; usd: number; tag?: string }

const allTokens = computed<TokenRow[]>(() => {
  const rows: TokenRow[] = []
  const solPrice = balance.value?.solPrice ?? 0
  const sol = balance.value?.sol ?? 0
  if (sol > 0) rows.push({ mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', balance: sol, usd: sol * solPrice })
  for (const t of balance.value?.tokens ?? []) {
    rows.push({ mint: t.mint, symbol: t.symbol, name: t.name, logoURI: t.logoURI, balance: t.balance, usd: t.usd })
  }
  for (const p of earnPositions.value ?? []) {
    const price = p.symbol?.toLowerCase().includes('sol') ? solPrice : 1
    rows.push({ mint: p.jlMint, symbol: p.symbol, name: p.symbol, logoURI: p.logoURI, balance: p.balance, usd: p.balance * price, tag: 'Earning' })
  }
  return rows.sort((a, b) => b.usd - a.usd)
})

const { data: stats, refresh: refreshStats, pending: pendingStats } = useAsyncData(
  'dashboard-stats',
  () => apiFetch<{ sentSol: number; receivedSol: number; openSplits: number }>('/api/stats'),
  { lazy: true }
)

const { data: activity, refresh: refreshActivity, pending: pendingActivity } = useAsyncData(
  'dashboard-activity',
  () => apiFetch<ActivityItem[]>('/api/activity'),
  { lazy: true }
)

type ActivityItem = {
  type: 'sent' | 'received' | 'split' | 'gift_claim'
  id: string
  amount: number
  token: string
  memo: string | null
  tx_signature: string | null
  counterparty: string | null
  status?: string
  gift_id?: string
  created_at: string
}

const showSend = ref(false)
const showSplit = ref(false)
const showGift = ref(false)
const showRequest = ref(false)

const copied = ref(false)
function copyAddr() {
  if (!user.value?.wallet_address) return
  navigator.clipboard.writeText(user.value.wallet_address)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function refreshAll() {
  refreshBalance()
  refreshStats()
  refreshActivity()
  refreshEarn()
}

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

// Refresh activity after send modal closes with a success
watch(showSend, (v) => { if (!v) setTimeout(() => { refreshAll() }, 500) })
watch(showGift, (v) => { if (!v) setTimeout(() => { refreshAll() }, 500) })
</script>

<template>
  <div class="min-h-screen p-8">

    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Good to see you, <span class="font-medium text-foreground">@{{ user?.username }}</span>
        </p>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-4">

      <!-- Balance card -->
      <div class="col-span-7 relative overflow-hidden rounded-2xl p-6 shadow-lg border border-border"
        style="background: linear-gradient(135deg, hsl(0 0% 11%) 0%, hsl(0 0% 14%) 50%, hsl(0 0% 11%) 100%)">
        <div class="pointer-events-none absolute inset-0 opacity-[0.03]"
          style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 20px 20px" />
        <div class="pointer-events-none absolute -top-6 right-10 h-32 w-32 rounded-full opacity-10"
          style="background: radial-gradient(circle, hsl(0 0% 80%) 0%, transparent 70%)" />

        <div class="relative z-10 flex h-full flex-col justify-between">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <p class="text-xs font-medium text-white/50">Total Balance</p>
                <button
                  class="flex items-center gap-1 rounded-md bg-white/8 px-2 py-0.5 transition hover:bg-white/12"
                  @click="copyAddr"
                >
                  <span class="font-mono text-[10px] text-white/40">{{ shortAddr(user?.wallet_address, 6) }}</span>
                  <component :is="copied ? Check : Copy" class="h-2.5 w-2.5 text-white/30" />
                </button>
              </div>
              <div v-if="pendingBalance" class="mt-1 h-9 w-36 animate-pulse rounded-lg bg-white/10" />
              <h2 v-else class="mt-1 text-3xl font-bold tracking-tight text-white">
                {{ formatUsd(totalUsd) }}
              </h2>
              <div v-if="pendingBalance" class="mt-1 h-4 w-20 animate-pulse rounded bg-white/10" />
              <p v-else class="mt-0.5 text-sm text-white/40">
                {{ formatAmount(balance?.sol || 0) }} SOL
              </p>
            </div>
            <button class="rounded-lg bg-white/10 p-1.5 text-white/30 transition hover:text-white/60" @click="refreshAll()">
              <RefreshCw class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="mt-5">
            <div class="flex flex-wrap items-center gap-2">
              <button
                class="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-gray-900 shadow transition hover:scale-[1.02]"
                @click="showSend = true"
              >
                <Send class="h-3.5 w-3.5" /> Send
              </button>
              <button
                class="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/22"
                @click="showSplit = true"
              >
                <Users class="h-3.5 w-3.5" /> Split
              </button>
              <button
                class="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/22"
                @click="showRequest = true"
              >
                <QrCode class="h-3.5 w-3.5" /> Request
              </button>
              <button
                class="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/22"
                @click="showGift = true"
              >
                <Gift class="h-3.5 w-3.5" /> Gift
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats column -->
      <div class="col-span-5 grid grid-rows-3 gap-3">
        <div class="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sent (30d)</p>
            <div v-if="pendingStats" class="mt-1 h-7 w-20 animate-pulse rounded-md bg-secondary" />
            <p v-else class="mt-1 text-2xl font-bold">
              {{ formatAmount(stats?.sentSol ?? 0) }}
              <span class="text-sm font-medium text-muted-foreground">SOL</span>
            </p>
          </div>
          <ArrowUpRight class="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
        <div class="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Received (30d)</p>
            <div v-if="pendingStats" class="mt-1 h-7 w-20 animate-pulse rounded-md bg-secondary" />
            <p v-else class="mt-1 text-2xl font-bold">
              {{ formatAmount(stats?.receivedSol ?? 0) }}
              <span class="text-sm font-medium text-muted-foreground">SOL</span>
            </p>
          </div>
          <ArrowDownLeft class="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
        <div
          class="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between cursor-pointer transition hover:bg-accent"
          @click="navigateTo('/app/split')"
        >
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Open Splits</p>
            <div v-if="pendingStats" class="mt-1 h-7 w-12 animate-pulse rounded-md bg-secondary" />
            <p v-else class="mt-1 text-2xl font-bold">
              {{ stats?.openSplits ?? 0 }}
              <span class="text-sm font-medium text-muted-foreground">active</span>
            </p>
          </div>
          <Scissors class="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
      </div>

      <!-- Token holdings -->
      <div class="col-span-12 rounded-2xl border border-border bg-card p-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-semibold">Holdings</h3>
          <span class="text-xs text-muted-foreground">{{ formatUsd(totalUsd) }}</span>
        </div>
        <div v-if="pendingBalance" class="space-y-3">
          <div v-for="i in 3" :key="i" class="flex items-center gap-3">
            <div class="h-9 w-9 shrink-0 animate-pulse rounded-full bg-secondary" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3.5 w-24 animate-pulse rounded bg-secondary" />
              <div class="h-3 w-16 animate-pulse rounded bg-secondary" />
            </div>
            <div class="space-y-1.5 text-right">
              <div class="h-3.5 w-16 animate-pulse rounded bg-secondary ml-auto" />
              <div class="h-3 w-10 animate-pulse rounded bg-secondary ml-auto" />
            </div>
          </div>
        </div>
        <div v-else-if="allTokens.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          No tokens found
        </div>
        <div v-else class="divide-y divide-border">
          <div v-for="token in allTokens" :key="token.mint" class="flex items-center gap-3 py-3">
            <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary">
              <img v-if="token.logoURI" :src="token.logoURI" :alt="token.symbol" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display='none'" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium">{{ token.symbol }}</p>
                <span v-if="token.tag" class="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-500">{{ token.tag }}</span>
              </div>
              <p class="text-xs text-muted-foreground">{{ formatAmount(token.balance) }} {{ token.symbol }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold">{{ formatUsd(token.usd) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent activity -->
      <div class="col-span-12 rounded-2xl border border-border bg-card p-6">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="font-semibold">Recent Activity</h3>
          <button class="text-xs text-muted-foreground transition hover:text-foreground" @click="refreshActivity()">
            Refresh
          </button>
        </div>

        <!-- Skeleton -->
        <div v-if="pendingActivity" class="divide-y divide-border">
          <div v-for="i in 4" :key="i" class="flex items-center gap-4 py-3.5">
            <div class="h-9 w-9 shrink-0 animate-pulse rounded-full bg-secondary" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3.5 w-32 animate-pulse rounded bg-secondary" />
              <div class="h-3 w-20 animate-pulse rounded bg-secondary" />
            </div>
            <div class="space-y-1.5 text-right">
              <div class="h-3.5 w-16 animate-pulse rounded bg-secondary ml-auto" />
              <div class="h-3 w-10 animate-pulse rounded bg-secondary ml-auto" />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!activity?.length" class="flex flex-col items-center justify-center py-12 text-center">
          <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Inbox class="h-6 w-6 text-muted-foreground" />
          </div>
          <p class="font-medium">No activity yet</p>
          <p class="mt-1 text-sm text-muted-foreground">Send or receive SOL to see it here.</p>
          <button
            class="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            @click="showSend = true"
          >
            <Send class="h-4 w-4" /> Send your first payment
          </button>
        </div>

        <!-- Activity list -->
        <div v-else-if="activity?.length" class="divide-y divide-border">
          <div
            v-for="item in activity"
            :key="item.id"
            class="flex items-center gap-4 py-3.5"
          >
            <!-- Icon -->
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              :class="{
                'bg-green-500/10': item.type === 'received' || item.type === 'gift_claim',
                'bg-secondary': item.type === 'sent',
                'bg-purple-500/10': item.type === 'split',
              }"
            >
              <ArrowDownRight v-if="item.type === 'received' || item.type === 'gift_claim'" class="h-4 w-4 text-green-500" />
              <ArrowUpRight v-else-if="item.type === 'sent'" class="h-4 w-4 text-muted-foreground" />
              <Scissors v-else-if="item.type === 'split'" class="h-4 w-4 text-purple-500" />
              <Star v-else class="h-4 w-4 text-yellow-500" />
            </div>

            <!-- Label + memo -->
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">{{ activityLabel(item) }}</p>
              <p v-if="item.memo && item.type !== 'split'" class="mt-0.5 truncate text-xs text-muted-foreground">
                {{ item.memo }}
              </p>
            </div>

            <!-- Amount + time -->
            <div class="text-right">
              <p
                class="text-sm font-semibold"
                :class="item.type === 'received' || item.type === 'gift_claim' ? 'text-green-500' : 'text-foreground'"
              >
                {{ item.type === 'received' || item.type === 'gift_claim' ? '+' : item.type === 'sent' ? '-' : '' }}{{ formatAmount(item.amount) }} {{ item.token }}
              </p>
              <p class="mt-0.5 text-xs text-muted-foreground">{{ timeAgo(item.created_at) }}</p>
            </div>

            <!-- Explorer link -->
            <a
              v-if="item.tx_signature"
              :href="`https://solscan.io/tx/${item.tx_signature}`"
              target="_blank"
              class="shrink-0 text-muted-foreground transition hover:text-foreground"
            >
              <ArrowDownRight class="h-3.5 w-3.5 -rotate-45" />
            </a>
          </div>
        </div>
      </div>

    </div>

    <!-- Modals -->
    <SendModal v-model:open="showSend" />
    <SplitModal v-model:open="showSplit" />
    <GiftModal v-model:open="showGift" />
    <RequestModal v-model:open="showRequest" />

  </div>
</template>
