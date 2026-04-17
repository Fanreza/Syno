<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import Button from '~/components/ui/Button.vue'
import { ArrowLeft, Copy, Check } from 'lucide-vue-next'
import { formatAmount } from '~/utils'

const route = useRoute()
const id = route.params.id as string
const { data: bill, refresh } = await useFetch<any>(`/api/split/${id}`)

const copied = ref('')
function copyLink(username: string) {
  const url = `${window.location.origin}/app/split/${id}?pay=${username}`
  navigator.clipboard.writeText(url)
  copied.value = username
  setTimeout(() => (copied.value = ''), 1500)
}

const paid = computed(() => bill.value?.participants?.filter((p: any) => p.status === 'paid').length || 0)
const total = computed(() => bill.value?.participants?.length || 0)
</script>

<template>
  <div class="px-5 pt-6">
    <div class="mb-6 flex items-center gap-3">
      <NuxtLink to="/app/split" class="rounded-full p-2 hover:bg-accent"><ArrowLeft class="h-5 w-5" /></NuxtLink>
      <h1 class="text-lg font-bold">{{ bill?.title }}</h1>
    </div>

    <Card class="mb-4 p-5">
      <p class="text-sm text-muted-foreground">Total</p>
      <h2 class="text-3xl font-bold">{{ formatAmount(bill?.total_amount || 0) }} {{ bill?.token }}</h2>
      <div class="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div class="h-full bg-primary transition-all" :style="{ width: `${(paid / (total || 1)) * 100}%` }" />
      </div>
      <p class="mt-2 text-xs text-muted-foreground">{{ paid }} of {{ total }} paid</p>
    </Card>

    <Card class="p-5">
      <h3 class="mb-3 font-semibold">Participants</h3>
      <div class="space-y-2">
        <div v-for="p in bill?.participants" :key="p.id" class="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p class="font-medium">@{{ p.username }}</p>
            <p class="text-xs text-muted-foreground">{{ formatAmount(p.amount) }} {{ bill?.token }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="p.status === 'paid'" class="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Paid
            </span>
            <button v-else class="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold" @click="copyLink(p.username)">
              <Check v-if="copied === p.username" class="h-3 w-3" />
              <Copy v-else class="h-3 w-3" />
              {{ copied === p.username ? 'Copied' : 'Copy link' }}
            </button>
          </div>
        </div>
      </div>
      <Button variant="outline" class="mt-4 w-full" @click="refresh()">Refresh status</Button>
    </Card>
  </div>
</template>
