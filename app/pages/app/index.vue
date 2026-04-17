<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import Logo from '~/components/Logo.vue'
import { Send, QrCode, Users, Gift } from 'lucide-vue-next'
import { formatAmount, formatUsd, shortAddr } from '~/utils'

const { user } = useAuth()

const { data: balance } = await useAsyncData(
  () => `balance-${user.value?.wallet_address}`,
  () => user.value?.wallet_address
    ? $fetch<{ sol: number; usd: number }>(`/api/balance?address=${user.value.wallet_address}`)
    : Promise.resolve({ sol: 0, usd: 0 }),
  { watch: [user] }
)

const actions = [
  { label: 'Send', icon: Send, to: '/app/send' },
  { label: 'Receive', icon: QrCode, to: '/app/profile' },
  { label: 'Split', icon: Users, to: '/app/split' },
  { label: 'Gift', icon: Gift, to: '/app/gift' }
]
</script>

<template>
  <div class="px-5 pt-8">
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Logo size="md" />
        <div>
          <p class="text-xs text-muted-foreground">Welcome back</p>
          <h2 class="text-lg font-bold">@{{ user?.username }}</h2>
        </div>
      </div>
      <NuxtLink to="/app/profile" class="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
        {{ user?.username?.[0]?.toUpperCase() }}
      </NuxtLink>
    </div>

    <Card class="mb-6 p-6 gradient-brand text-white">
      <p class="text-sm opacity-80">Total Balance</p>
      <h1 class="mt-1 text-3xl font-bold">{{ formatUsd(balance?.usd || 0) }}</h1>
      <p class="mt-1 text-sm opacity-80">{{ formatAmount(balance?.sol || 0) }} SOL</p>
      <p class="mt-3 text-xs opacity-70">{{ shortAddr(user?.wallet_address) }}</p>
    </Card>

    <div class="mb-6 grid grid-cols-4 gap-3">
      <NuxtLink
        v-for="a in actions"
        :key="a.label"
        :to="a.to"
        class="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 transition hover:border-primary"
      >
        <component :is="a.icon" class="h-5 w-5 text-primary" />
        <span class="text-xs font-medium">{{ a.label }}</span>
      </NuxtLink>
    </div>

    <Card class="p-5">
      <h3 class="mb-3 font-semibold">Recent Activity</h3>
      <p class="text-sm text-muted-foreground">No transactions yet.</p>
    </Card>
  </div>
</template>
