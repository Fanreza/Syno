<script setup lang="ts">
import {
  DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription
} from 'reka-ui'
import { Mail, Chrome, ChevronRight, ArrowLeft, Loader2, LockKeyhole, Wallet } from 'lucide-vue-next'
import { getWallets } from '@wallet-standard/app'

const open = defineModel<boolean>('open', { required: true })

const { sendEmailCode, loginWithEmail, loginWithGoogle, loginWithSolanaWallet } = useAuth()

type View = 'methods' | 'email-input' | 'email-otp' | 'wallet-picker'
const view = ref<View>('methods')
const email = ref('')
const otpCode = ref('')
const error = ref('')
const sending = ref(false)
const verifying = ref(false)
const connectingWallet = ref<string | null>(null)

// Wallet Standard — all compliant Solana wallets register themselves automatically
interface SolanaWallet { id: string; name: string; icon: string }
const solanaWallets = ref<SolanaWallet[]>([])
// Store raw providers outside Vue reactivity to avoid Proxy wrapping breaking private class fields
const walletProviders = new Map<string, any>()

onMounted(() => {
  const { get, on } = getWallets()

  function addWallet(wallet: any) {
    // Only include wallets that support Solana signMessage
    const features = Object.keys(wallet.features ?? {})
    const hasSolana = features.some(f => f.startsWith('solana:') || f === 'standard:signMessage')
    if (!hasSolana) return
    if (walletProviders.has(wallet.name)) return
    walletProviders.set(wallet.name, wallet)
    solanaWallets.value.push({
      id: wallet.name,
      name: wallet.name,
      icon: wallet.icon,
    })
  }

  // Add already-registered wallets
  get().forEach(addWallet)

  // Listen for new wallets registering (e.g. lazy-loaded extensions)
  on('register', (...wallets: any[]) => wallets.forEach(addWallet))
})

function resetState() {
  view.value = 'methods'
  email.value = ''
  otpCode.value = ''
  error.value = ''
  sending.value = false
  verifying.value = false
  connectingWallet.value = null
}

watch(open, (val) => { if (!val) resetState() })

async function handleSendCode() {
  if (!email.value.trim()) return
  sending.value = true; error.value = ''
  try {
    await sendEmailCode(email.value.trim())
    view.value = 'email-otp'
  } catch (e: any) {
    error.value = e?.message || 'Failed to send code'
  } finally { sending.value = false }
}

async function handleVerify() {
  if (otpCode.value.length < 6) return
  verifying.value = true; error.value = ''
  try {
    await loginWithEmail(email.value.trim(), otpCode.value)
    open.value = false
  } catch (e: any) {
    error.value = e?.message || 'Invalid code'
  } finally { verifying.value = false }
}

async function handleGoogle() {
  error.value = ''
  try { await loginWithGoogle() } catch (e: any) { error.value = e?.message || 'Google sign-in failed' }
}

async function handleSolanaWallet(wallet: SolanaWallet) {
  connectingWallet.value = wallet.id; error.value = ''
  try {
    const provider = walletProviders.get(wallet.id)
    await loginWithSolanaWallet(provider, wallet.name)
    open.value = false
  } catch (e: any) {
    const msg = e?.message || ''
    // Surface user-friendly messages for common failures
    if (msg.includes('User rejected') || msg.includes('rejected')) {
      error.value = 'Request rejected. Try again and approve in your wallet.'
    } else if (msg.includes('locked') || msg.includes('unlock')) {
      error.value = 'Wallet is locked. Unlock it and try again.'
    } else if (msg.includes('No account')) {
      error.value = 'No account found. Connect an account in your wallet first.'
    } else {
      error.value = msg || 'Wallet connection failed'
    }
  } finally { connectingWallet.value = null }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-card p-0 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

        <!-- Header -->
        <div class="px-6 pt-6 pb-4 text-center">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <LockKeyhole class="h-5 w-5 text-white" />
          </div>
          <DialogTitle class="text-center text-lg font-semibold">
            {{ view === 'wallet-picker' ? 'Connect Wallet' : view === 'email-input' ? 'Enter your email' : view === 'email-otp' ? 'Check your email' : 'Sign In' }}
          </DialogTitle>
          <DialogDescription class="mt-1 text-center text-sm text-muted-foreground">
            {{ view === 'methods' ? "Choose how you'd like to sign in" :
               view === 'wallet-picker' ? 'Select a Solana wallet to connect' :
               view === 'email-input' ? "We'll send you a verification code" :
               `We sent a 6-digit code to ${email}` }}
          </DialogDescription>
        </div>

        <!-- Error -->
        <div v-if="error" class="px-6 pb-2">
          <p class="text-center text-xs text-destructive">{{ error }}</p>
        </div>

        <!-- Methods view -->
        <div v-if="view === 'methods'" class="space-y-2 px-6 pb-6">
          <!-- Email -->
          <button
            class="group flex w-full items-center gap-3 rounded-xl border border-border bg-muted/50 p-3.5 transition-all hover:border-primary/30 hover:bg-muted active:scale-[0.98]"
            @click="view = 'email-input'"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background group-hover:border-primary/30">
              <Mail class="h-4 w-4" />
            </div>
            <div class="flex-1 text-left">
              <p class="text-sm font-medium">Email</p>
              <p class="text-[11px] text-muted-foreground">Sign in with a verification code</p>
            </div>
            <ChevronRight class="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>

          <div class="flex items-center gap-3 px-2 py-1">
            <div class="h-px flex-1 bg-border" />
            <span class="text-[11px] text-muted-foreground">or continue with</span>
            <div class="h-px flex-1 bg-border" />
          </div>

          <!-- Google -->
          <button
            class="group flex w-full items-center gap-3 rounded-xl border border-border bg-muted/50 p-3.5 transition-all hover:border-primary/30 hover:bg-muted active:scale-[0.98]"
            @click="handleGoogle"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background group-hover:border-primary/30">
              <Chrome class="h-4 w-4" />
            </div>
            <div class="flex-1 text-left">
              <p class="text-sm font-medium">Google</p>
              <p class="text-[11px] text-muted-foreground">Continue with your Google account</p>
            </div>
            <ChevronRight class="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>

          <!-- Solana Wallet -->
          <button
            class="group flex w-full items-center gap-3 rounded-xl border border-border bg-muted/50 p-3.5 transition-all hover:border-primary/30 hover:bg-muted active:scale-[0.98]"
            @click="view = 'wallet-picker'"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background group-hover:border-primary/30">
              <Wallet class="h-4 w-4" />
            </div>
            <div class="flex-1 text-left">
              <p class="text-sm font-medium">Solana Wallet</p>
              <p class="text-[11px] text-muted-foreground">Phantom, Solflare, Backpack & more</p>
            </div>
            <ChevronRight class="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        </div>

        <!-- Wallet picker view -->
        <div v-else-if="view === 'wallet-picker'" class="space-y-2 px-6 pb-6">
          <div v-if="solanaWallets.length === 0" class="rounded-xl border border-border bg-muted/30 py-8 text-center">
            <Wallet class="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p class="text-sm font-medium text-muted-foreground">No wallets detected</p>
            <p class="mt-1 text-xs text-muted-foreground/70">Install Phantom or Solflare browser extension</p>
          </div>

          <button
            v-for="wallet in solanaWallets"
            :key="wallet.id"
            class="group flex w-full items-center gap-3 rounded-xl border border-border bg-muted/50 p-3.5 transition-all hover:border-primary/30 hover:bg-muted active:scale-[0.98] disabled:opacity-50"
            :disabled="!!connectingWallet"
            @click="handleSolanaWallet(wallet)"
          >
            <img :src="wallet.icon" :alt="wallet.name" class="h-9 w-9 rounded-lg object-cover" />
            <p class="flex-1 text-left text-sm font-medium">{{ wallet.name }}</p>
            <Loader2 v-if="connectingWallet === wallet.id" class="h-4 w-4 animate-spin text-muted-foreground" />
            <span v-else class="rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600">Detected</span>
          </button>

          <button
            class="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
            @click="view = 'methods'"
          >
            <ArrowLeft class="h-4 w-4" /> Back
          </button>
        </div>

        <!-- Email input view -->
        <div v-else-if="view === 'email-input'" class="space-y-3 px-6 pb-6">
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            autofocus
            class="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            @keyup.enter="handleSendCode"
          />
          <div class="flex gap-2">
            <button class="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted" @click="view = 'methods'">
              <ArrowLeft class="mr-1.5 inline h-4 w-4" /> Back
            </button>
            <button
              class="flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              :disabled="!email.trim() || sending"
              @click="handleSendCode"
            >
              <Loader2 v-if="sending" class="mr-1.5 h-4 w-4 animate-spin" />
              Send Code
            </button>
          </div>
        </div>

        <!-- OTP view -->
        <div v-else-if="view === 'email-otp'" class="space-y-3 px-6 pb-6">
          <input
            v-model="otpCode"
            type="text"
            inputmode="numeric"
            placeholder="123456"
            maxlength="6"
            autofocus
            class="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-lg tracking-widest outline-none ring-ring focus:ring-2"
            @keyup.enter="handleVerify"
          />
          <div class="flex gap-2">
            <button class="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted" @click="view = 'email-input'; otpCode = ''">
              <ArrowLeft class="mr-1.5 inline h-4 w-4" /> Back
            </button>
            <button
              class="flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              :disabled="otpCode.length < 6 || verifying"
              @click="handleVerify"
            >
              <Loader2 v-if="verifying" class="mr-1.5 h-4 w-4 animate-spin" />
              Verify
            </button>
          </div>
        </div>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
