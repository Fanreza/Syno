<script setup lang="ts">
import { Home, User, LogOut, Activity, Sun, Moon, Users, TrendingUp, MoreHorizontal, X, Link, Gift, Bell, Send, QrCode, Scissors, HelpCircle, BarChart2, Calendar, BookUser } from 'lucide-vue-next'
import { useNotifications } from '~/composables/useNotifications'
import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'

const route = useRoute()
const { user, logout } = useAuth()
const { isDark, toggle } = useTheme()
const { unread, fetchUnread } = useNotifications()
const { startTour, resetTour } = useOnboarding()

function replayTour() {
  resetTour()
  startTour()
}

onMounted(() => fetchUnread())

const avatarDataUrl = computed(() => {
  const seed = user.value?.username ?? 'default'
  const svg = createAvatar(bottts, { seed, size: 32 }).toString()
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
})

type NavItem = { to: string; icon: any; label: string; badge?: boolean }
type NavSection = { label?: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    items: [
      { to: '/app', icon: Home, label: 'Home' },
      { to: '/app/notifications', icon: Bell, label: 'Notifications', badge: true },
    ],
  },
  {
    label: 'Payments',
    items: [
      { to: '/app/requests', icon: Link, label: 'Requests' },
      { to: '/app/gifts', icon: Gift, label: 'Gifts' },
      { to: '/app/recurring', icon: Calendar, label: 'Transfers' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/app/portfolio', icon: BarChart2, label: 'Portfolio' },
      { to: '/app/earn', icon: TrendingUp, label: 'Earn' },
      { to: '/app/activity', icon: Activity, label: 'Activity' },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/app/people', icon: Users, label: 'People' },
      { to: '/app/profile', icon: User, label: 'Profile' },
    ],
  },
]

// flat list kept for data-tour attribute resolution
const items = sections.flatMap(s => s.items)

// Bottom bar: Home | Activity | [Send FAB] | Request | More
const bottomItems = [
  { to: '/app', icon: Home, label: 'Home' },
  { to: '/app/activity', icon: Activity, label: 'Activity' },
]

const showMore = ref(false)
const showSendGlobal = useState<boolean>('global-show-send', () => false)
const showSwapGlobal = useState<boolean>('global-show-swap', () => false)
const showRequestGlobal = useState<boolean>('global-show-request', () => false)
const showSplitGlobal = useState<boolean>('global-show-split', () => false)
const showGiftGlobal = useState<boolean>('global-show-gift', () => false)
const showPayrollGlobal = useState<boolean>('global-show-payroll', () => false)

const moreItems = [
  { to: '/app/notifications', icon: Bell, label: 'Notifications', badge: true },
  { to: '/app/requests', icon: Link, label: 'Requests' },
  { to: '/app/gifts', icon: Gift, label: 'Gifts' },
  { to: '/app/recurring', icon: Calendar, label: 'Transfers' },
  { to: '/app/portfolio', icon: BarChart2, label: 'Portfolio' },
  { to: '/app/earn', icon: TrendingUp, label: 'Earn' },
  { to: '/app/people', icon: Users, label: 'People' },
  { to: '/app/profile', icon: User, label: 'Profile' },
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
      <img src="/syno-logo.jpeg" alt="Syno" class="h-8 w-8 rounded-xl object-cover shadow-sm" />
      <span class="text-lg font-bold tracking-tight">Syno</span>
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
    <nav class="mt-3 flex-1 overflow-y-auto px-3 space-y-3">
      <div v-for="section in sections" :key="section.label ?? '__top'">
        <p v-if="section.label" class="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {{ section.label }}
        </p>
        <div class="space-y-0.5">
          <NuxtLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            :data-tour="`nav-${item.to.split('/').pop()}`"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
            :class="isActive(item.to)
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            <div class="relative shrink-0">
              <component :is="item.icon" class="h-4 w-4" />
              <span
                v-if="item.badge && unread > 0"
                class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
              >{{ unread > 9 ? '9+' : unread }}</span>
            </div>
            {{ item.label }}
          </NuxtLink>
        </div>
      </div>
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
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
        @click="replayTour"
      >
        <HelpCircle class="h-4 w-4 shrink-0" />
        Tour guide
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
    <div class="flex items-center px-2 safe-bottom" style="padding-top: 8px; padding-bottom: 8px;">

      <!-- Left: Home, Activity -->
      <NuxtLink
        v-for="item in bottomItems"
        :key="item.to"
        :to="item.to"
        :data-tour="`nav-${item.to.split('/').pop()}`"
        class="flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all min-w-0"
        :class="isActive(item.to) ? 'text-primary' : 'text-muted-foreground'"
      >
        <component :is="item.icon" class="h-5 w-5 shrink-0 transition-transform" :class="isActive(item.to) ? 'scale-110' : ''" />
        <span class="text-[9px] font-medium truncate">{{ item.label }}</span>
      </NuxtLink>

      <!-- Center: Send FAB -->
      <div class="flex flex-col items-center flex-1 min-w-0 -mt-5">
        <button
          class="flex h-14 w-14 items-center justify-center rounded-full shadow-lg btn-spring animate-fab-in"
          style="background: linear-gradient(135deg, hsl(252 60% 38%) 0%, hsl(258 55% 50%) 100%); box-shadow: 0 4px 20px hsl(252 60% 38% / 0.5);"
          @click="showSendGlobal = true"
        >
          <Send class="h-6 w-6 text-white" />
        </button>
        <span class="mt-1 text-[9px] font-medium text-muted-foreground">Send</span>
      </div>

      <!-- Right: Request -->
      <NuxtLink
        to="/app/requests"
        class="flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all min-w-0"
        :class="isActive('/app/requests') ? 'text-primary' : 'text-muted-foreground'"
      >
        <QrCode class="h-5 w-5 shrink-0" />
        <span class="text-[9px] font-medium">Request</span>
      </NuxtLink>

      <button
        class="flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all min-w-0"
        :class="showMore ? 'text-primary' : 'text-muted-foreground'"
        @click="showMore = !showMore"
      >
        <MoreHorizontal class="h-5 w-5 shrink-0" />
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
            <div class="relative shrink-0">
              <component :is="item.icon" class="h-4 w-4" />
              <span
                v-if="item.badge && unread > 0"
                class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
              >{{ unread > 9 ? '9+' : unread }}</span>
            </div>
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
