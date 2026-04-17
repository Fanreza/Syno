<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import Button from '~/components/ui/Button.vue'
import { formatAmount, shortAddr } from '~/utils'
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'

definePageMeta({ layout: false })

const route = useRoute()
const id = route.params.id as string
const config = useRuntimeConfig()
const { isAuthenticated, solanaAddress, getSolanaProvider, apiFetch } = useAuth()

const { data: payment } = await useFetch<any>(`/api/payments/${id}`)
const loading = ref(false)
const error = ref('')
const success = ref('')

async function onPay() {
  if (!isAuthenticated.value) {
    await navigateTo(`/login?next=/app/pay/${id}`)
    return
  }
  if (!solanaAddress.value || !payment.value) return
  loading.value = true; error.value = ''
  try {
    const connection = new Connection(config.public.solanaRpcUrl as string, 'confirmed')
    const fromPk = new PublicKey(solanaAddress.value)
    const toPk = new PublicKey(payment.value.receiver_address)
    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: fromPk, recentBlockhash: blockhash }).add(
      SystemProgram.transfer({
        fromPubkey: fromPk,
        toPubkey: toPk,
        lamports: Math.round(Number(payment.value.amount) * LAMPORTS_PER_SOL)
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
        toAddress: payment.value.receiver_address,
        amount: Number(payment.value.amount),
        signature,
        memo: payment.value.memo,
        paymentLinkId: id
      }
    })

    success.value = signature
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Payment failed'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-10">
    <Card class="p-6">
      <div class="text-center">
        <p class="text-sm text-muted-foreground">Payment request</p>
        <h1 class="mt-2 text-4xl font-bold">
          {{ formatAmount(payment?.amount || 0) }} {{ payment?.token }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          To
          <span class="font-medium text-foreground">
            @{{ payment?.receiver?.username || shortAddr(payment?.receiver_address) }}
          </span>
        </p>
        <p v-if="payment?.memo" class="mt-3 rounded-lg bg-accent p-3 text-sm">{{ payment.memo }}</p>
      </div>

      <Button v-if="!success" class="mt-8 w-full" size="lg" :loading="loading" @click="onPay">
        {{ isAuthenticated ? 'Pay Now' : 'Login to Pay' }}
      </Button>
      <div v-else class="mt-6 rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
        ✓ Payment sent! {{ success.slice(0, 20) }}…
      </div>
      <p v-if="error" class="mt-3 text-center text-sm text-destructive">{{ error }}</p>
    </Card>
  </div>
</template>
