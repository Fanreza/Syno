<script setup lang="ts">
import { ShieldCheck, Clock, RefreshCw, ExternalLink } from 'lucide-vue-next'

interface Utxo {
  insertionIndex: string
  amount: string
  destinationAddress: string
  bucket: string
}

const { apiFetch } = useAuth()
const utxos = ref<Utxo[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await apiFetch<{ utxos: Utxo[], error?: string }>('/api/payments/private-utxos')
    if (res.error) error.value = res.error
    else utxos.value = res.utxos ?? []
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load'
  } finally {
    loading.value = false
  }
}

onMounted(load)

let interval: ReturnType<typeof setInterval>
onMounted(() => { interval = setInterval(load, 30_000) })
onUnmounted(() => clearInterval(interval))

function formatAmount(raw: string) {
  return (Number(raw) / 1_000_000).toFixed(6).replace(/\.?0+$/, '')
}
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-6 space-y-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <ShieldCheck class="h-5 w-5 text-violet-400" />
        <h1 class="text-lg font-semibold">Private transfers</h1>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent transition"
        :class="{ 'opacity-50 pointer-events-none': loading }"
        @click="load"
      >
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
        Refresh
      </button>
    </div>

    <p class="text-xs text-muted-foreground">
      Tokens sitting in the Umbra mixer waiting to be claimed by the recipient.
    </p>

    <div v-if="loading && !utxos.length" class="flex justify-center py-12">
      <RefreshCw class="h-5 w-5 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
      {{ error }}
    </div>

    <div v-else-if="!utxos.length" class="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <ShieldCheck class="h-8 w-8 opacity-30" />
      <p class="text-sm">No pending UTXOs in mixer</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="u in utxos"
        :key="u.insertionIndex"
        class="rounded-2xl border border-border bg-card p-4 space-y-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-0.5 min-w-0">
            <p class="text-sm font-semibold">{{ formatAmount(u.amount) }} USDC</p>
            <p class="text-xs text-muted-foreground truncate">to {{ shortAddr(u.destinationAddress) }}</p>
          </div>
          <div class="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-violet-500/10 text-violet-400">
            <Clock class="h-3 w-3" />
            Mixing
          </div>
        </div>

        <div class="h-1 rounded-full bg-secondary overflow-hidden">
          <div class="h-full rounded-full bg-violet-500 w-1/3 transition-all duration-500" />
        </div>

        <p class="text-[11px] text-muted-foreground">UTXO #{{ u.insertionIndex }}</p>
      </div>
    </div>
  </div>
</template>
