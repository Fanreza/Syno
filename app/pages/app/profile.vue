<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import Button from '~/components/ui/Button.vue'
import { Copy, LogOut } from 'lucide-vue-next'
import { shortAddr } from '~/utils'

const { user, logout } = useAuth()
const copied = ref(false)

function copyAddr() {
  if (!user.value?.wallet_address) return
  navigator.clipboard.writeText(user.value.wallet_address)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="px-5 pt-8">
    <h1 class="mb-6 text-lg font-bold">Profile</h1>

    <Card class="p-6 text-center">
      <div class="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full gradient-brand text-3xl font-bold text-white">
        {{ user?.username?.[0]?.toUpperCase() }}
      </div>
      <h2 class="text-xl font-bold">@{{ user?.username }}</h2>
      <p class="text-sm text-muted-foreground">{{ user?.email }}</p>
    </Card>

    <Card class="mt-4 p-5">
      <p class="mb-1 text-xs text-muted-foreground">Solana Wallet</p>
      <div class="flex items-center justify-between gap-2">
        <p class="font-mono text-sm">{{ shortAddr(user?.wallet_address, 6) }}</p>
        <button class="rounded-full bg-accent p-2" @click="copyAddr">
          <Copy class="h-4 w-4" />
        </button>
      </div>
      <p v-if="copied" class="mt-2 text-xs text-primary">Copied!</p>
    </Card>

    <Button variant="outline" class="mt-6 w-full" @click="logout">
      <LogOut class="h-4 w-4" /> Logout
    </Button>
  </div>
</template>
