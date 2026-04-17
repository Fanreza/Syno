<script setup lang="ts">
import { Home, Send, Users, User } from 'lucide-vue-next'
const route = useRoute()
const items = [
  { to: '/app', icon: Home, label: 'Home' },
  { to: '/app/send', icon: Send, label: 'Send' },
  { to: '/app/split', icon: Users, label: 'Split' },
  { to: '/app/profile', icon: User, label: 'Profile' }
]
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
    <div class="mx-auto flex max-w-md items-center justify-around px-2 py-2">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition"
        :class="route.path === item.to ? 'text-primary font-semibold' : 'text-muted-foreground'"
      >
        <component :is="item.icon" class="h-5 w-5" />
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
