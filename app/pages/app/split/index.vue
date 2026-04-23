<script setup lang="ts">
import SplitModal from '~/components/SplitModal.vue'
import { Plus, Scissors, CheckCircle2, Clock, ChevronRight, Users } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const { apiFetch } = useAuth()

type CreatedBill = {
  id: string
  title: string | null
  total_amount: number
  token: string
  status: string
  created_at: string
  role: 'creator'
  paid: number
  total: number
}

type ParticipatingBill = {
  id: string
  title: string | null
  total_amount: number
  token: string
  status: string
  created_at: string
  role: 'participant'
  myAmount: number
  myStatus: string
}

const { data, refresh, pending } = useAsyncData(
  'splits',
  () => apiFetch<{ created: CreatedBill[]; participating: ParticipatingBill[] }>('/api/split'),
  { lazy: true }
)

const showModal = ref(false)

const created = computed(() => data.value?.created ?? [])
const participating = computed(() => data.value?.participating ?? [])
const hasAny = computed(() => created.value.length > 0 || participating.value.length > 0)

watch(showModal, (v) => { if (!v) setTimeout(refresh, 400) })

function progressPct(b: CreatedBill) {
  return b.total ? Math.round((b.paid / b.total) * 100) : 0
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Split Bills</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Track shared expenses.</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        @click="showModal = true"
      >
        <Plus class="h-4 w-4" /> New split
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-2">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div class="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-secondary" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-40 animate-pulse rounded bg-secondary" />
          <div class="h-1.5 w-full animate-pulse rounded-full bg-secondary" />
        </div>
        <div class="h-4 w-16 animate-pulse rounded bg-secondary" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!hasAny" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <Scissors class="h-7 w-7 text-muted-foreground" />
      </div>
      <p class="font-semibold">No splits yet</p>
      <p class="mt-1 text-sm text-muted-foreground">Create a split to share expenses with friends.</p>
      <button
        class="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        @click="showModal = true"
      >
        <Plus class="h-4 w-4" /> Create your first split
      </button>
    </div>

    <div v-else-if="hasAny" class="space-y-8">

      <!-- Created by me -->
      <div v-if="created.length">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Created by you</p>
        <div class="space-y-2">
          <NuxtLink
            v-for="bill in created"
            :key="bill.id"
            :to="`/app/split/${bill.id}`"
            class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition hover:bg-accent"
          >
            <!-- Icon -->
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
              <Users class="h-5 w-5 text-purple-500" />
            </div>

            <!-- Info -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="font-semibold truncate">{{ bill.title || 'Untitled split' }}</p>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                  :class="bill.status === 'open' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-green-500/10 text-green-600 dark:text-green-400'"
                >
                  {{ bill.status }}
                </span>
              </div>
              <!-- Progress bar -->
              <div class="mt-2 flex items-center gap-2">
                <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div class="h-full rounded-full bg-purple-500 transition-all" :style="{ width: `${progressPct(bill)}%` }" />
                </div>
                <span class="shrink-0 text-xs text-muted-foreground">{{ bill.paid }}/{{ bill.total }} paid</span>
              </div>
            </div>

            <!-- Amount + chevron -->
            <div class="text-right">
              <p class="text-sm font-semibold">{{ formatAmount(bill.total_amount) }} {{ bill.token }}</p>
            </div>
            <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
          </NuxtLink>
        </div>
      </div>

      <!-- Participating in -->
      <div v-if="participating.length">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">You're a participant</p>
        <div class="space-y-2">
          <NuxtLink
            v-for="bill in participating"
            :key="bill.id"
            :to="`/app/split/${bill.id}`"
            class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition hover:bg-accent"
          >
            <!-- Status icon -->
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="bill.myStatus === 'paid' ? 'bg-green-500/10' : 'bg-secondary'"
            >
              <CheckCircle2 v-if="bill.myStatus === 'paid'" class="h-5 w-5 text-green-500" />
              <Clock v-else class="h-5 w-5 text-muted-foreground" />
            </div>

            <!-- Info -->
            <div class="min-w-0 flex-1">
              <p class="font-semibold truncate">{{ bill.title || 'Untitled split' }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Your share: {{ formatAmount(bill.myAmount) }} {{ bill.token }}
              </p>
            </div>

            <!-- Status badge + chevron -->
            <span
              class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="bill.myStatus === 'paid' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'"
            >
              {{ bill.myStatus === 'paid' ? 'Paid' : 'Pending' }}
            </span>
            <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
          </NuxtLink>
        </div>
      </div>

    </div>

    <SplitModal v-model:open="showModal" />
  </div>
</template>
