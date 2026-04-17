<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import Button from '~/components/ui/Button.vue'
import Input from '~/components/ui/Input.vue'
import { ArrowLeft, Search } from 'lucide-vue-next'
import { watchDebounced } from '@vueuse/core'
import { shortAddr } from '~/utils'
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'

const { solanaAddress, getSolanaProvider, apiFetch } = useAuth()
const config = useRuntimeConfig()

const recipient = ref('')
const amount = ref<number | null>(null)
const memo = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const searchResults = ref<any[]>([])

watchDebounced(
  recipient,
  async (v) => {
    if (!v || v.length < 2) { searchResults.value = []; return }
    const q = v.replace(/^@/, '')
    searchResults.value = await $fetch('/api/users/search', { query: { q } })
  },
  { debounce: 300 }
)

async function resolveRecipient(): Promise<string> {
  const v = recipient.value.trim()
  const isAddress = v.length > 30 && !v.startsWith('@')
  if (isAddress) return v
  const handle = v.replace(/^@/, '').toLowerCase()
  const u = await $fetch<{ wallet_address: string }>('/api/users/resolve', {
    query: { username: handle }
  })
  return u.wallet_address
}

async function onSend() {
  error.value = ''; success.value = ''
  if (!amount.value || amount.value <= 0) { error.value = 'Enter amount'; return }
  if (!solanaAddress.value) { error.value = 'Wallet not ready'; return }
  loading.value = true
  try {
    const toAddress = await resolveRecipient()

    const connection = new Connection(config.public.solanaRpcUrl as string, 'confirmed')
    const fromPk = new PublicKey(solanaAddress.value)
    const toPk = new PublicKey(toAddress)
    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: fromPk, recentBlockhash: blockhash }).add(
      SystemProgram.transfer({
        fromPubkey: fromPk,
        toPubkey: toPk,
        lamports: Math.round(amount.value * LAMPORTS_PER_SOL)
      })
    )

    const provider = await getSolanaProvider()
    const result = await provider.request({
      method: 'signAndSendTransaction',
      params: { transaction: tx, connection }
    })
    const signature = (result as { signature: string }).signature

    await apiFetch('/api/payments/record', {
      method: 'POST',
      body: {
        toAddress,
        amount: amount.value,
        signature,
        memo: memo.value
      }
    })

    success.value = signature
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed'
  } finally { loading.value = false }
}

function pickUser(u: any) {
  recipient.value = '@' + u.username
  searchResults.value = []
}
</script>

<template>
  <div class="px-5 pt-6">
    <div class="mb-6 flex items-center gap-3">
      <NuxtLink to="/app" class="rounded-full p-2 hover:bg-accent"><ArrowLeft class="h-5 w-5" /></NuxtLink>
      <h1 class="text-lg font-bold">Send</h1>
    </div>

    <Card class="p-5">
      <label class="mb-2 block text-sm font-medium">To</label>
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="recipient" placeholder="@username or Solana address" class="pl-10" />
      </div>
      <div v-if="searchResults.length" class="mt-2 space-y-1 rounded-lg border bg-background p-2">
        <button
          v-for="u in searchResults"
          :key="u.id"
          class="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-accent"
          @click="pickUser(u)"
        >
          <span class="font-medium">@{{ u.username }}</span>
          <span class="text-xs text-muted-foreground">{{ shortAddr(u.wallet_address) }}</span>
        </button>
      </div>

      <label class="mb-2 mt-4 block text-sm font-medium">Amount (SOL)</label>
      <Input v-model.number="amount" type="number" placeholder="0.00" />

      <label class="mb-2 mt-4 block text-sm font-medium">Memo (optional)</label>
      <Input v-model="memo" placeholder="Dinner last night" />

      <Button class="mt-6 w-full" size="lg" :loading="loading" :disabled="!recipient || !amount" @click="onSend">
        Send
      </Button>

      <p v-if="error" class="mt-3 text-center text-sm text-destructive">{{ error }}</p>
      <div v-if="success" class="mt-4 rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
        ✓ Sent! tx: {{ success.slice(0, 16) }}…
      </div>
    </Card>
  </div>
</template>
