<script setup lang="ts">
import { Bell, CheckCheck, Gift, CreditCard, Users, Inbox } from 'lucide-vue-next'

const { apiFetch } = useAuth()

const { data, refresh, pending } = useAsyncData(
  'notifications-page',
  () => apiFetch<{ notifications: any[]; unread: number }>('/api/notifications'),
  { lazy: true }
)

async function markAllRead() {
  await apiFetch('/api/notifications/read', { method: 'POST', body: {} })
  refresh()
}

async function markRead(id: string) {
  await apiFetch('/api/notifications/read', { method: 'POST', body: { id } })
  refresh()
}

function fmtDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

const iconMap: Record<string, any> = {
  payment_received: CreditCard,
  payroll_received: CreditCard,
  split_created: Users,
  split_paid: Users,
  gift_claimed: Gift,
  gift_received: Gift,
}

const colorMap: Record<string, string> = {
  payment_received: 'bg-green-500/10 text-green-500',
  payroll_received: 'bg-green-500/10 text-green-500',
  split_created: 'bg-blue-500/10 text-blue-500',
  split_paid: 'bg-blue-500/10 text-blue-500',
  gift_claimed: 'bg-yellow-500/10 text-yellow-500',
  gift_received: 'bg-yellow-500/10 text-yellow-500',
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8">

    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Notifications</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">
          {{ data?.unread ? `${data.unread} unread` : 'All caught up' }}
        </p>
      </div>
      <button
        v-if="data?.unread"
        class="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-accent"
        @click="markAllRead"
      >
        <CheckCheck class="h-4 w-4" />
        Mark all read
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-2">
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div class="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-secondary" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-48 animate-pulse rounded bg-secondary" />
          <div class="h-3 w-28 animate-pulse rounded bg-secondary" />
        </div>
        <div class="h-3 w-12 animate-pulse rounded bg-secondary" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!data?.notifications?.length" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <Inbox class="h-7 w-7 text-muted-foreground" />
      </div>
      <p class="font-semibold">No notifications yet</p>
      <p class="mt-1 text-sm text-muted-foreground">Activity from payments, splits, and gifts will show here.</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-2">
      <div
        v-for="n in data.notifications"
        :key="n.id"
        class="flex items-start gap-4 rounded-2xl border px-5 py-4 transition cursor-pointer"
        :class="n.read ? 'border-border bg-card hover:bg-accent/50' : 'border-primary/20 bg-primary/5 hover:bg-primary/10'"
        @click="!n.read && markRead(n.id)"
      >
        <div
          class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          :class="colorMap[n.type] ?? 'bg-secondary text-muted-foreground'"
        >
          <component :is="iconMap[n.type] ?? Bell" class="h-5 w-5" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold">{{ n.title }}</p>
            <span v-if="!n.read" class="h-2 w-2 shrink-0 rounded-full bg-primary" />
          </div>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ n.body }}</p>
        </div>

        <p class="shrink-0 text-xs text-muted-foreground">{{ fmtDate(n.created_at) }}</p>
      </div>
    </div>

  </div>
</template>
