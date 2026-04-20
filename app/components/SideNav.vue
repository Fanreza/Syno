<script setup lang="ts">
import { Home, User, LogOut, Scissors, Activity, Sun, Moon, Users } from 'lucide-vue-next'

const route = useRoute()
const { user, logout } = useAuth()
const { isDark, toggle } = useTheme()

const items = [
  { to: '/app', icon: Home, label: 'Home' },
  { to: '/app/split', icon: Scissors, label: 'Splits' },
  { to: '/app/friends', icon: Users, label: 'Friends' },
  { to: '/app/activity', icon: Activity, label: 'Activity' },
  { to: '/app/profile', icon: User, label: 'Profile' },
]

function isActive(to: string) {
  if (to === '/app') return route.path === '/app'
  return route.path.startsWith(to)
}
</script>

<template>
  <aside class="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card sticky top-0">
    <!-- Logo -->
    <div class="flex items-center gap-2.5 px-6 py-5 border-b border-border">
      <img src="/icon.jpeg" alt="Payra" class="h-8 w-8 rounded-xl object-cover shadow-sm" />
      <span class="text-lg font-bold tracking-tight">Payra</span>
    </div>

    <!-- User pill -->
    <div class="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5">
      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {{ user?.username?.[0]?.toUpperCase() }}
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
</template>
