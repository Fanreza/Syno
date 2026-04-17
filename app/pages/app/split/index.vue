<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import Button from '~/components/ui/Button.vue'
import Input from '~/components/ui/Input.vue'
import { ArrowLeft, Plus, X } from 'lucide-vue-next'

const title = ref('')
const totalAmount = ref<number | null>(null)
const participants = ref<{ username: string; amount: number }[]>([{ username: '', amount: 0 }])
const loading = ref(false)
const error = ref('')

function addRow() { participants.value.push({ username: '', amount: 0 }) }
function removeRow(i: number) { participants.value.splice(i, 1) }

function splitEvenly() {
  if (!totalAmount.value || !participants.value.length) return
  const each = totalAmount.value / participants.value.length
  participants.value = participants.value.map((p) => ({ ...p, amount: Number(each.toFixed(4)) }))
}

async function onCreate() {
  error.value = ''
  if (!totalAmount.value || !participants.value.every((p) => p.username && p.amount > 0)) {
    error.value = 'Fill all fields'; return
  }
  loading.value = true
  try {
    const res = await $fetch<{ id: string }>('/api/split/create', {
      method: 'POST',
      body: { title: title.value, totalAmount: totalAmount.value, participants: participants.value }
    })
    await navigateTo(`/app/split/${res.id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="px-5 pt-6">
    <div class="mb-6 flex items-center gap-3">
      <NuxtLink to="/app" class="rounded-full p-2 hover:bg-accent"><ArrowLeft class="h-5 w-5" /></NuxtLink>
      <h1 class="text-lg font-bold">Split Bill</h1>
    </div>

    <Card class="p-5">
      <label class="mb-2 block text-sm font-medium">Title</label>
      <Input v-model="title" placeholder="Dinner at Sushi Tei" />

      <label class="mb-2 mt-4 block text-sm font-medium">Total (SOL)</label>
      <Input v-model.number="totalAmount" type="number" placeholder="0.00" />

      <div class="mt-4 flex items-center justify-between">
        <label class="text-sm font-medium">Participants</label>
        <button class="text-xs font-semibold text-primary" @click="splitEvenly">Split evenly</button>
      </div>

      <div class="mt-2 space-y-2">
        <div v-for="(p, i) in participants" :key="i" class="flex gap-2">
          <Input v-model="p.username" placeholder="@username" class="flex-1" />
          <Input v-model.number="p.amount" type="number" placeholder="0" class="w-24" />
          <button v-if="participants.length > 1" class="text-muted-foreground" @click="removeRow(i)">
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <Button variant="ghost" size="sm" class="mt-2" @click="addRow">
        <Plus class="h-4 w-4" /> Add participant
      </Button>

      <Button class="mt-6 w-full" size="lg" :loading="loading" @click="onCreate">Create Split</Button>
      <p v-if="error" class="mt-3 text-center text-sm text-destructive">{{ error }}</p>
    </Card>
  </div>
</template>
