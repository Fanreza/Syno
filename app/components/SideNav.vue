<script setup lang="ts">
import { Home, User, LogOut, Scissors, Activity, Sun, Moon, Users, TrendingUp, MoreHorizontal, X, ShieldCheck } from 'lucide-vue-next'
import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'

const route = useRoute()
const { user, logout } = useAuth()
const { isDark, toggle } = useTheme()

const avatarDataUrl = computed(() => {
  const seed = user.value?.username ?? 'default'
  const svg = createAvatar(bottts, { seed, size: 32 }).toString()
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
})

const items = [
  { to: '/app', icon: Home, label: 'Home' },
  { to: '/app/split', icon: Scissors, label: 'Splits' },
  { to: '/app/earn', icon: TrendingUp, label: 'Earn' },
  { to: '/app/friends', icon: Users, label: 'Friends' },
  { to: '/app/activity', icon: Activity, label: 'Activity' },
  { to: '/app/private', icon: ShieldCheck, label: 'Private' },
  { to: '/app/profile', icon: User, label: 'Profile' },
]

// Bottom bar: 4 core items + More button
const bottomItems = [
  { to: '/app', icon: Home, label: 'Home' },
  { to: '/app/activity', icon: Activity, label: 'Activity' },
  { to: '/app/split', icon: Scissors, label: 'Splits' },
  { to: '/app/profile', icon: User, label: 'Profile' },
]

const showMore = ref(false)
const moreItems = [
  { to: '/app/earn', icon: TrendingUp, label: 'Earn' },
  { to: '/app/friends', icon: Users, label: 'Friends' },
  { to: '/app/private', icon: ShieldCheck, label: 'Private' },
]

function isActive(to: string) {
  if (to === '/app') return route.path === '/app'
  return route.path.startsWith(to)
}
</script>

<template>
  <!-- ── Desktop sidebar ────────────────────────────────────────────────── -->
  <aside class="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card sticky top-0">
    <!-- Logo -->
    <div class="flex items-center gap-2.5 px-6 py-5 border-b border-border">
      <img src="/icon.jpeg" alt="Payra" class="h-8 w-8 rounded-xl object-cover shadow-sm" />
      <span class="text-lg font-bold tracking-tight">Payra</span>
    </div>

    <!-- User pill -->
    <div class="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5">
      <div class="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-secondary flex items-center justify-center">
        <img :src="avatarDataUrl" class="h-10 w-10 scale-110" alt="avatar" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold">@{{ user?.username }}</p>
        <p class="truncate text-[11px] text-muted-foreground">{{ user?.email ?? 'Wallet user' }}</p>
      </div>
    </div>

    <!-- Nav items -->
    <nav class="mt-4 flex-1 space-y-1 px-3">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
        :class="isActive(item.to)
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- Bottom actions -->
    <div class="border-t border-border p-3 space-y-1">
      <button
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
        @click="toggle"
      >
        <Sun v-if="isDark" class="h-4 w-4 shrink-0" />
        <Moon v-else class="h-4 w-4 shrink-0" />
        {{ isDark ? 'Light mode' : 'Dark mode' }}
      </button>
      <button
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        @click="logout"
      >
        <LogOut class="h-4 w-4 shrink-0" />
        Log out
      </button>
    </div>
  </aside>

  <!-- ── Mobile bottom bar ──────────────────────────────────────────────── -->
  <nav class="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
    <div class="flex items-center justify-around px-2 py-2 safe-bottom">
      <NuxtLink
        v-for="item in bottomItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all min-w-0"
        :class="isActive(item.to) ? 'text-primary' : 'text-muted-foreground'"
      >
        <component :is="item.icon" class="h-4.5 w-4.5 shrink-0 transition-transform" :class="isActive(item.to) ? 'scale-110' : ''" />
        <span class="text-[9px] font-medium truncate">{{ item.label }}</span>
      </NuxtLink>

      <!-- More button -->
      <button
        class="flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all min-w-0"
        :class="showMore ? 'text-primary' : 'text-muted-foreground'"
        @click="showMore = !showMore"
      >
        <MoreHorizontal class="h-4.5 w-4.5 shrink-0" />
        <span class="text-[9px] font-medium">More</span>
      </button>
    </div>
  </nav>

  <!-- ── More sheet ─────────────────────────────────────────────────────── -->
  <Transition name="sheet">
    <div v-if="showMore" class="md:hidden fixed inset-0 z-40" @click.self="showMore = false">
      <div class="absolute bottom-16 inset-x-0 rounded-t-2xl border-t border-border bg-card p-4 safe-bottom shadow-2xl">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">More</p>
          <button class="text-muted-foreground" @click="showMore = false"><X class="h-4 w-4" /></button>
        </div>
        <div class="space-y-1">
          <NuxtLink
            v-for="item in moreItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
            :class="isActive(item.to) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'"
            @click="showMore = false"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" />
            {{ item.label }}
          </NuxtLink>
          <button
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent"
            @click="toggle"
          >
            <Sun v-if="isDark" class="h-4 w-4 shrink-0" /><Moon v-else class="h-4 w-4 shrink-0" />
            {{ isDark ? 'Light mode' : 'Dark mode' }}
          </button>
          <button
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
            @click="logout"
          >
            <LogOut class="h-4 w-4 shrink-0" />
            Log out
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
