<script setup lang="ts">
import { Search, ChevronDown, Check } from 'lucide-vue-next'
import type { JupToken } from '~/utils/tokens'
import { POPULAR_TOKENS } from '~/utils/tokens'
import { useBalance } from '~/composables/useBalance'
const { formatDisplay } = useDisplayCurrency()

const props = defineProps<{ label?: string; filter?: string[]; exclude?: string[]; tokenLogos?: Record<string, string> }>()
const modelValue = defineModel<JupToken>({ required: true })

const { balance } = useBalance()

const open = ref(false)
const query = ref('')
const results = ref<JupToken[]>([])
const searching = ref(false)
let timer: ReturnType<typeof setTimeout>

watch(query, (q) => {
  clearTimeout(timer)
  if (!q.trim()) { results.value = []; return }
  searching.value = true
  timer = setTimeout(async () => {
    try {
      results.value = await $fetch<JupToken[]>(`/api/tokens/search?q=${encodeURIComponent(q.trim())}`)
    } catch { results.value = [] }
    finally { searching.value = false }
  }, 300)
})

const SOL_MINT = 'So11111111111111111111111111111111111111112'

function tokenBalance(address: string): number {
  if (!balance.value) return 0
  if (address === SOL_MINT) return balance.value.sol
  return balance.value.tokens.find((t: any) => t.mint === address)?.balance ?? 0
}

function tokenUsd(address: string): number {
  if (!balance.value) return 0
  if (address === SOL_MINT) return balance.value.sol * (balance.value.solPrice ?? 0)
  return balance.value.tokens.find((t: any) => t.mint === address)?.usd ?? 0
}

function resolveLogoURI(mint: string, logoURI?: string | null): string | undefined {
  return props.tokenLogos?.[mint] ?? logoURI ?? undefined
}

const popularSorted = computed(() => {
  const extra: JupToken[] = (balance.value?.tokens ?? [])
    .filter((t: any) => !POPULAR_TOKENS.some(p => p.address === t.mint) && t.balance > 0)
    .map((t: any) => ({
      address: t.mint,
      symbol: t.symbol,
      name: t.name ?? t.symbol,
      decimals: 6,
      logoURI: resolveLogoURI(t.mint, t.logoURI),
    }))
  const popular = POPULAR_TOKENS.map(t => ({
    ...t,
    logoURI: resolveLogoURI(t.address, t.logoURI),
  }))
  return [...popular, ...extra].sort((a, b) => tokenUsd(b.address) - tokenUsd(a.address))
})

const displayed = computed(() => {
  let list = query.value ? results.value : popularSorted.value
  if (props.filter) list = list.filter(t => props.filter!.includes(t.address))
  if (props.exclude) list = list.filter(t => !props.exclude!.includes(t.address))
  return list
})

function select(token: JupToken) {
  modelValue.value = token
  open.value = false
  query.value = ''
  results.value = []
}

function close() { open.value = false; query.value = ''; results.value = [] }

// Close on outside click
const containerRef = ref<HTMLElement>()
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (containerRef.value && !containerRef.value.contains(e.target as Node)) close()
  })
})
</script>

<template>
  <div ref="containerRef" class="relative">
    <label v-if="label" class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {{ label }}
    </label>

    <!-- Trigger -->
    <button
      type="button"
      class="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 transition hover:bg-accent"
      :class="label ? 'w-full' : 'shrink-0'"
      @click="open = !open"
    >
      <img v-if="modelValue.logoURI" :src="modelValue.logoURI" :alt="modelValue.symbol" class="h-6 w-6 rounded-full object-cover" />
      <div v-else class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
        {{ modelValue.symbol[0] }}
      </div>
      <div class="text-left">
        <p class="text-sm font-semibold">{{ modelValue.symbol }}</p>
        <p class="hidden text-xs text-muted-foreground sm:block">{{ modelValue.name }}</p>
      </div>
      <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>

    <!-- Dropdown -->
    <div v-if="open" class="absolute top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-xl" :class="label ? 'left-0 right-0' : 'right-0 w-64'">
      <!-- Search input -->
      <div class="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Search class="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          v-model="query"
          placeholder="Search by name, symbol, or paste address..."
          autofocus
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <span v-if="searching" class="text-xs text-muted-foreground animate-pulse">...</span>
      </div>

      <!-- Token list -->
      <div class="max-h-52 overflow-y-auto">
        <p v-if="!displayed.length && !searching" class="py-6 text-center text-sm text-muted-foreground">
          {{ query ? 'No tokens found' : 'Start typing to search' }}
        </p>
        <button
          v-for="token in displayed"
          :key="token.address"
          type="button"
          class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-accent"
          :class="modelValue.address === token.address ? 'bg-accent' : ''"
          @click="select(token)"
        >
          <img v-if="token.logoURI" :src="token.logoURI" :alt="token.symbol" class="h-8 w-8 rounded-full object-cover" />
          <div v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {{ token.symbol[0] }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ token.symbol }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ token.name }}</p>
          </div>
          <div class="shrink-0 text-right">
            <template v-if="tokenBalance(token.address) > 0">
              <p class="text-xs font-semibold">{{ tokenBalance(token.address).toFixed(4) }}</p>
              <p class="text-[10px] text-muted-foreground">{{ formatDisplay(tokenUsd(token.address)) }}</p>
            </template>
            <Check v-else-if="modelValue.address === token.address" class="h-4 w-4 text-primary" />
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
