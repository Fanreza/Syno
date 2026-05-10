import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { watch, useState } from '#imports'

export default defineNuxtPlugin({
  name: 'firebase-fcm',
  parallel: true,
  setup() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const config = useRuntimeConfig()
    const vapidKey = config.public.firebaseVapidKey as string
    if (!vapidKey) return

    const firebaseConfig = {
      apiKey: config.public.firebaseApiKey as string,
      authDomain: config.public.firebaseAuthDomain as string,
      projectId: config.public.firebaseProjectId as string,
      storageBucket: config.public.firebaseStorageBucket as string,
      messagingSenderId: config.public.firebaseMessagingSenderId as string,
      appId: config.public.firebaseAppId as string,
    }

    const authToken = useState<string | null>('auth:token')

    // Fire and forget — never blocks navigation
    ;(async () => {
      try {
        const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)
        const messaging = getMessaging(app)

        onMessage(messaging, (payload) => {
          const title = payload.notification?.title ?? 'Syno'
          const body = payload.notification?.body ?? ''
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, { body, icon: '/icon-192.png' })
          }).catch(() => {
            new Notification(title, { body, icon: '/icon-192.png' })
          })
        })

        // Use the vite-pwa SW (which includes firebase-messaging-sw-core.js).
        // Send Firebase config to SW via postMessage so the SW doesn't need it hardcoded.
        const registration = await navigator.serviceWorker.getRegistration('/')
        if (!registration) return

        const target = registration.active ?? registration.waiting ?? registration.installing
        if (target) {
          target.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
        }

        const fcmToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
        if (!fcmToken) return

        async function save(token: string) {
          await $fetch('/api/users/fcm-token', {
            method: 'POST',
            body: { token: fcmToken },
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {})
        }

        watch(authToken, async (token) => {
          if (!token) return
          await save(token)
        }, { immediate: true })
      } catch (err) {
        console.warn('[FCM] plugin failed:', err)
      }
    })()
  },
})
