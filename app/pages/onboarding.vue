<script setup lang="ts">
import Card from '~/components/ui/card/Card.vue'
import { Button } from '~/components/ui/button'
import Input from '~/components/ui/input/Input.vue'
import Logo from '~/components/Logo.vue'
import { Loader2, Bell, BellOff, ChevronRight } from 'lucide-vue-next'

definePageMeta({ layout: false })

const { registerUsername, logout, apiFetch } = useAuth()

// ── Step 1: username ──────────────────────────────────────────────────────────
const step = ref<'username' | 'notifications'>('username')
const username = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmitUsername() {
  loading.value = true; error.value = ''
  try {
    await registerUsername(username.value)
    step.value = 'notifications'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed'
  } finally { loading.value = false }
}

// ── Step 2: notifications ─────────────────────────────────────────────────────
const notifLoading = ref(false)
const notifDone = ref(false)

async function enableNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    await finish()
    return
  }
  notifLoading.value = true
  try {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      const { initializeApp, getApps } = await import('firebase/app')
      const { getMessaging, getToken } = await import('firebase/messaging')
      const cfg = useRuntimeConfig()
      const FIREBASE_CONFIG = {
        apiKey: cfg.public.firebaseApiKey as string,
        authDomain: cfg.public.firebaseAuthDomain as string,
        projectId: cfg.public.firebaseProjectId as string,
        storageBucket: cfg.public.firebaseStorageBucket as string,
        messagingSenderId: cfg.public.firebaseMessagingSenderId as string,
        appId: cfg.public.firebaseAppId as string,
      }
      const app = getApps().length ? getApps()[0]! : initializeApp(FIREBASE_CONFIG)
      const messaging = getMessaging(app)
      const config = useRuntimeConfig()
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      await navigator.serviceWorker.ready
      const token = await getToken(messaging, {
        vapidKey: config.public.firebaseVapidKey as string,
        serviceWorkerRegistration: registration,
      })
      if (token) await apiFetch('/api/users/fcm-token', { method: 'POST', body: { token } }).catch(() => {})
      notifDone.value = true
      await finish()
    } else {
      await finish()
    }
  } catch {
    await finish()
  } finally { notifLoading.value = false }
}

async function finish() {
  await navigateTo('/app')
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-6">

    <!-- Step 1: Username -->
    <template v-if="step === 'username'">
      <div class="mb-6 w-full max-w-sm text-center">
        <Logo size="lg" class="mx-auto mb-4" />
        <h1 class="text-2xl font-bold tracking-tight">Pick a username</h1>
        <p class="mt-1 text-sm text-muted-foreground">This is how friends will find and pay you.</p>
      </div>
      <Card class="w-full max-w-sm p-6">
        <div class="flex items-center rounded-lg border border-input bg-background pl-3">
          <span class="text-muted-foreground">@</span>
          <Input v-model="username" placeholder="alex" class="border-0 focus-visible:ring-0" @keydown.enter="onSubmitUsername" />
        </div>
        <p class="mt-2 text-xs text-muted-foreground">3–20 chars, a–z 0–9 _</p>
        <Button class="mt-5 w-full" size="lg" :disabled="!username || loading" @click="onSubmitUsername">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          <template v-else>Continue <ChevronRight class="ml-1 h-4 w-4" /></template>
        </Button>
        <p v-if="error" class="mt-3 text-center text-sm text-destructive">{{ error }}</p>
      </Card>
      <button class="mt-4 text-sm text-muted-foreground transition hover:text-foreground" @click="logout">
        Back to login
      </button>
    </template>

    <!-- Step 2: Notifications -->
    <template v-else>
      <div class="mb-6 w-full max-w-sm text-center">
        <Logo size="lg" class="mx-auto mb-4" />
        <h1 class="text-2xl font-bold tracking-tight">Stay in the loop</h1>
        <p class="mt-1 text-sm text-muted-foreground">Get notified when someone sends you crypto.</p>
      </div>
      <Card class="w-full max-w-sm p-6 space-y-4">
        <!-- Icon -->
        <div class="flex justify-center">
          <div v-if="notifDone" class="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <Bell class="h-8 w-8 text-green-500" />
          </div>
          <div v-else class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell class="h-8 w-8 text-primary" />
          </div>
        </div>

        <div v-if="notifDone" class="text-center">
          <p class="font-semibold text-green-600 dark:text-green-400">Notifications on</p>
          <p class="mt-1 text-sm text-muted-foreground">Taking you to the app…</p>
        </div>

        <template v-else>
          <ul class="space-y-2 text-sm text-muted-foreground">
            <li class="flex items-center gap-2"><span class="text-primary">✓</span> Payment received</li>
            <li class="flex items-center gap-2"><span class="text-primary">✓</span> Gift claimed</li>
            <li class="flex items-center gap-2"><span class="text-primary">✓</span> Split paid</li>
          </ul>

          <Button class="w-full" size="lg" :disabled="notifLoading" @click="enableNotifications">
            <Loader2 v-if="notifLoading" class="mr-2 h-4 w-4 animate-spin" />
            <Bell v-else class="mr-2 h-4 w-4" />
            {{ notifLoading ? 'Setting up…' : 'Allow notifications' }}
          </Button>

          <button class="w-full text-center text-sm text-muted-foreground transition hover:text-foreground" @click="finish">
            Skip for now
          </button>
        </template>
      </Card>
    </template>

  </div>
</template>
