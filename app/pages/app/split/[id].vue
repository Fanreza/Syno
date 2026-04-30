<script setup lang="ts">
import { ArrowLeft, Copy, Check, CheckCircle2, Clock, RefreshCw, ExternalLink } from 'lucide-vue-next'
import { formatAmount, shortAddr } from '~/utils'

const route = useRoute()
const id = route.params.id as string
const { apiFetch } = useAuth()
const config = useRuntimeConfig()

const { data: bill, refresh } = await useFetch<any>(`/api/split/${id}`)

// Per-participant payment links: participantId → payLink
const payLinks = ref<Record<string, string>>({})
const generating = ref<Record<string, boolean>>({})
const copied = ref('')

async function generateLink(participant: any) {
  if (payLinks.value[participant.id] || generating.value[participant.id]) return
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
    payLinks.value[participant.id] = `${config.public.appUrl}/pay/${res.id}`
  } finally {
    generating.value[participant.id] = false
  }
}

async function copyLink(participant: any) {
  if (!payLinks.value[participant.id]) {
    await generateLink(participant)
  }
  navigator.clipboard.writeText(payLinks.value[participant.id])
  copied.value = participant.id
  setTimeout(() => (copied.value = ''), 1500)
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
        <p class="mt-0.5 text-sm text-muted-foreground">
          by @{{ bill?.creator?.username }}
        </p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
        @click="refresh()"
      >
        <RefreshCw class="h-3.5 w-3.5" /> Refresh
      </button>
    </div>

    <div class="max-w-xl space-y-4">

      <!-- Summary card -->
      <div class="rounded-2xl border border-border bg-card p-6">
        <div class="flex items-end justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
            <p class="mt-1 text-3xl font-bold">{{ formatAmount(bill?.total_amount || 0) }} <span class="text-xl text-muted-foreground">{{ tokenSymbol }}</span></p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs font-semibold"
            :class="bill?.status === 'open' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-green-500/10 text-green-600 dark:text-green-400'"
          >
            {{ bill?.status }}
          </span>
        </div>
        <div class="mt-5">
          <div class="h-2 overflow-hidden rounded-full bg-secondary">
            <div class="h-full rounded-full bg-primary transition-all duration-500" :style="{ width: `${pct}%` }" />
          </div>
          <p class="mt-2 text-xs text-muted-foreground">{{ paid }} of {{ total }} paid ({{ pct }}%)</p>
        </div>
      </div>

      <!-- Participants -->
      <div class="rounded-2xl border border-border bg-card p-5">
        <h3 class="mb-4 font-semibold">Participants</h3>
        <div class="space-y-2">
          <div
            v-for="p in bill?.participants"
            :key="p.id"
            class="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
            :class="p.status === 'paid' ? 'bg-green-500/5 border-green-500/20' : 'bg-background'"
          >
            <!-- Avatar -->
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              :class="p.status === 'paid' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-secondary text-muted-foreground'"
            >
              {{ p.username?.[0]?.toUpperCase() }}
            </div>

            <!-- Name + amount -->
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">@{{ p.username }}</p>
              <p class="text-xs text-muted-foreground">{{ formatAmount(p.amount) }} {{ tokenSymbol }}</p>
            </div>

            <!-- Status / action -->
            <div class="flex items-center gap-2">
              <span v-if="p.status === 'paid'" class="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                <CheckCircle2 class="h-3.5 w-3.5" /> Paid
              </span>
              <template v-else>
                <a
                  v-if="payLinks[p.id]"
                  :href="payLinks[p.id]"
                  target="_blank"
                  class="text-muted-foreground transition hover:text-foreground"
                >
                  <ExternalLink class="h-3.5 w-3.5" />
                </a>
                <button
                  class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-accent disabled:opacity-50"
                  :disabled="generating[p.id]"
                  @click="copyLink(p)"
                >
                  <span v-if="generating[p.id]" class="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  <Check v-else-if="copied === p.id" class="h-3 w-3 text-green-500" />
                  <Copy v-else class="h-3 w-3" />
                  {{ copied === p.id ? 'Copied!' : generating[p.id] ? 'Generating...' : 'Copy link' }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
