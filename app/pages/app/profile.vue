<script setup lang="ts">
import { Copy, Check, ExternalLink, LogOut, Shield, Mail, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-vue-next'

const { user, apiFetch, logout } = useAuth()

const exportLoading = ref(false)
const exportError = ref('')
const privateKey = ref('')
const showKey = ref(false)
const exportConfirmed = ref(false)

async function exportPrivateKey() {
  exportError.value = ''
  exportLoading.value = true
  try {
    const res = await apiFetch<{ private_key: string }>('/api/wallet/export')
    privateKey.value = res.private_key
    showKey.value = false
  } catch (e: any) {
    exportError.value = e?.data?.statusMessage || e?.message || 'Export failed'
  } finally { exportLoading.value = false }
}

const { data: balance } = await useAsyncData(
  () => `profile-balance-${user.value?.wallet_address}`,
  () => user.value?.wallet_address
    ? $fetch<{ sol: number; usd: number }>(`/api/balance?address=${user.value.wallet_address}`)
    : Promise.resolve({ sol: 0, usd: 0 }),
  { watch: [user] }
)

const copiedAddr = ref(false)
const copiedKey = ref(false)

function copyAddr() {
  if (!user.value?.wallet_address) return
  navigator.clipboard.writeText(user.value.wallet_address)
  copiedAddr.value = true
  setTimeout(() => (copiedAddr.value = false), 1500)
}

function copyPrivKey() {
  navigator.clipboard.writeText(privateKey.value)
  copiedKey.value = true
  setTimeout(() => (copiedKey.value = false), 1500)
}

const explorerUrl = computed(() =>
  user.value?.wallet_address ? `https://explorer.solana.com/address/${user.value.wallet_address}` : '#'
)

const avatarGradient = computed(() => {
  const name = user.value?.username ?? ''
  const gradients = [
    'hsl(222 55% 18%), hsl(240 50% 26%)',
    'hsl(262 60% 28%), hsl(280 55% 35%)',
    'hsl(195 70% 20%), hsl(210 65% 28%)',
    'hsl(340 60% 22%), hsl(350 55% 30%)',
    'hsl(160 50% 18%), hsl(175 55% 25%)',
  ]
  return gradients[name.charCodeAt(0) % gradients.length]
})
</script>

<template>
  <div class="min-h-screen p-8">

    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Profile</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Your account and wallet.</p>
      </div>
      <button
        class="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
        @click="logout"
      >
        <LogOut class="h-4 w-4" /> Log out
      </button>
    </div>

    <div class="space-y-4">

      <!-- Hero banner -->
      <div class="overflow-hidden rounded-2xl border border-border bg-card">
        <div class="h-20 w-full" :style="`background: linear-gradient(135deg, ${avatarGradient})`" />
        <div class="flex items-end gap-4 px-6 pb-5">
          <!-- Avatar -->
          <div
            class="-mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white ring-4 ring-card"
            :style="`background: linear-gradient(135deg, ${avatarGradient})`"
          >
            {{ user?.username?.[0]?.toUpperCase() }}
          </div>

          <!-- Info row -->
          <div class="flex flex-1 items-center justify-between pb-0.5">
            <div>
              <h2 class="text-lg font-bold">@{{ user?.username }}</h2>
              <p v-if="user?.email" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail class="h-3 w-3" /> {{ user.email }}
              </p>
            </div>

            <!-- Balance -->
            <div class="text-right">
              <p class="text-2xl font-bold">{{ formatUsd(balance?.usd || 0) }}</p>
              <p class="text-sm text-muted-foreground">{{ formatAmount(balance?.sol || 0) }} SOL</p>
            </div>
          </div>
        </div>

        <!-- Address bar inside card -->
        <div class="flex items-center gap-3 border-t border-border px-6 py-3">
          <p class="flex-1 truncate font-mono text-xs text-muted-foreground">{{ user?.wallet_address }}</p>
          <button
            class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
            @click="copyAddr"
          >
            <Check v-if="copiedAddr" class="h-3.5 w-3.5 text-green-500" />
            <Copy v-else class="h-3.5 w-3.5" />
            {{ copiedAddr ? 'Copied!' : 'Copy' }}
          </button>
          <a
            :href="explorerUrl" target="_blank"
            class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
          >
            <ExternalLink class="h-3.5 w-3.5" /> Explorer
          </a>
          <div class="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400">
            <Shield class="h-3.5 w-3.5" /> Non-custodial
          </div>
        </div>
      </div>

      <!-- Export private key -->
      <div class="rounded-2xl border border-border bg-card p-5">
        <div class="mb-4 flex items-center gap-2">
          <KeyRound class="h-4 w-4 text-muted-foreground" />
          <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Export Private Key</p>
        </div>

        <div v-if="!privateKey">
          <div class="mb-4 flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
            <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
            <p class="text-xs leading-relaxed text-yellow-700 dark:text-yellow-400">
              Your private key gives full access to this wallet. Never share it. Store it somewhere safe if you export it.
            </p>
          </div>
          <div class="flex items-center justify-between">
            <label class="flex cursor-pointer items-center gap-2 text-sm">
              <input v-model="exportConfirmed" type="checkbox" class="rounded" />
              I understand the risks
            </label>
            <button
              :disabled="!exportConfirmed || exportLoading"
              class="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-accent disabled:opacity-40"
              @click="exportPrivateKey"
            >
              <span v-if="exportLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <KeyRound v-else class="h-4 w-4" />
              {{ exportLoading ? 'Exporting...' : 'Export private key' }}
            </button>
          </div>
          <p v-if="exportError" class="mt-2 text-xs text-destructive">{{ exportError }}</p>
        </div>

        <div v-else class="space-y-3">
          <div class="relative rounded-xl bg-secondary px-4 py-3 pr-10">
            <p class="break-all font-mono text-xs leading-relaxed" :class="showKey ? '' : 'select-none blur-sm'">
              {{ privateKey }}
            </p>
            <button class="absolute right-3 top-3 text-muted-foreground transition hover:text-foreground" @click="showKey = !showKey">
              <EyeOff v-if="showKey" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
          <div class="flex gap-2">
            <button
              class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium transition hover:bg-accent"
              @click="copyPrivKey"
            >
              <Check v-if="copiedKey" class="h-4 w-4 text-green-500" />
              <Copy v-else class="h-4 w-4" />
              {{ copiedKey ? 'Copied!' : 'Copy key' }}
            </button>
            <button
              class="flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-accent"
              @click="privateKey = ''; exportConfirmed = false"
            >
              Hide
            </button>
          </div>
          <p class="text-xs text-muted-foreground">Import into Phantom or any Solana wallet.</p>
        </div>
      </div>

    </div>
  </div>
</template>
