<script setup lang="ts">
import { Gift, CheckCircle2, Clock, ExternalLink, Plus, ChevronRight } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const { apiFetch } = useAuth()
const showGift = ref(false)

const { data, refresh, pending } = useAsyncData(
  'gifts-page',
  () => apiFetch<{ created: any[]; claimed: any[] }>('/api/gifts'),
  { lazy: true }
)

watch(showGift, (v) => { if (!v) setTimeout(refresh, 500) })

const tab = ref<'created' | 'claimed'>('created')

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function giftLink(id: string) {
  if (import.meta.server) return ''
  return `${window.location.origin}/gift/${id}`
}

const copied = ref('')
function copyLink(id: string) {
  navigator.clipboard.writeText(giftLink(id))
  copied.value = id
  setTimeout(() => { if (copied.value === id) copied.value = '' }, 1500)
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Gifts</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Send and track gift envelopes.</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        @click="showGift = true"
      >
        <Plus class="h-4 w-4" /> New gift
      </button>
    </div>

    <!-- Tabs -->
    <div class="mb-6 flex gap-1 rounded-xl bg-secondary p-1">
      <button
        class="flex-1 rounded-lg py-2 text-sm font-semibold transition"
        :class="tab === 'created' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = 'created'"
      >
        Sent
      </button>
      <button
        class="flex-1 rounded-lg py-2 text-sm font-semibold transition"
        :class="tab === 'claimed' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = 'claimed'"
      >
        Received
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-2">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div class="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-secondary" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-36 animate-pulse rounded bg-secondary" />
          <div class="h-3 w-24 animate-pulse rounded bg-secondary" />
        </div>
        <div class="h-4 w-16 animate-pulse rounded bg-secondary" />
      </div>
    </div>

    <!-- SENT tab -->
    <template v-else-if="tab === 'created'">
      <div v-if="!data?.created?.length" class="flex flex-col items-center justify-center py-24 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          <Gift class="h-7 w-7 text-muted-foreground" />
        </div>
        <p class="font-semibold">No gifts sent yet</p>
        <p class="mt-1 text-sm text-muted-foreground">Create a gift and share the link.</p>
        <button
          class="mt-6 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          @click="showGift = true"
        >
          <Plus class="h-4 w-4" /> New gift
        </button>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="g in data.created"
          :key="g.id"
          class="rounded-2xl border border-border bg-card px-5 py-4"
        >
          <div class="flex items-center gap-4">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="g.settled ? 'bg-green-500/10' : 'bg-yellow-500/10'"
            >
              <CheckCircle2 v-if="g.settled" class="h-5 w-5 text-green-500" />
              <Gift v-else class="h-5 w-5 text-yellow-500" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="font-semibold">{{ formatAmount(g.total_amount) }} {{ g.token_symbol }}</p>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="g.settled ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'"
                >
                  {{ g.settled ? 'All claimed' : 'Active' }}
                </span>
              </div>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {{ g.claimed_count }} / {{ g.total_slots }} claimed · {{ fmtDate(g.created_at) }}
              </p>
              <!-- Progress bar -->
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  class="h-full rounded-full transition-all"
                  :class="g.settled ? 'bg-green-500' : 'bg-yellow-500'"
                  :style="{ width: `${Math.round((g.claimed_count / g.total_slots) * 100)}%` }"
                />
              </div>
            </div>

            <div class="shrink-0 flex items-center gap-1.5">
              <button
                v-if="!g.settled"
                class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                @click="copyLink(g.id)"
              >
                {{ copied === g.id ? 'Copied!' : 'Copy link' }}
              </button>
              <a
                :href="`/gift/${g.id}`"
                target="_blank"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent"
              >
                <ExternalLink class="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- RECEIVED tab -->
    <template v-else>
      <div v-if="!data?.claimed?.length" class="flex flex-col items-center justify-center py-24 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          <Gift class="h-7 w-7 text-muted-foreground" />
        </div>
        <p class="font-semibold">No gifts received yet</p>
        <p class="mt-1 text-sm text-muted-foreground">Claim a gift link to see it here.</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="c in data.claimed"
          :key="c.id"
          class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4"
        >
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
            <Gift class="h-5 w-5 text-green-500" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="font-semibold">+{{ formatAmount(c.amount) }} {{ c.token_symbol }}</p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              From <span class="font-medium text-foreground">@{{ c.from_username ?? 'unknown' }}</span>
              · {{ fmtDate(c.created_at) }}
            </p>
          </div>

          <a
            v-if="c.tx_signature"
            :href="`https://solscan.io/tx/${c.tx_signature}`"
            target="_blank"
            class="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent"
          >
            <ExternalLink class="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </template>

  </div>

  <GiftModal v-model:open="showGift" />
</template>
