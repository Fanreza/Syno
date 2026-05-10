import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { watch, useState } from '#imports'

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCXYm8OrQ6N3o8GDP35jH72IevzLgjfErM',
  authDomain: 'syno-f8455.firebaseapp.com',
  projectId: 'syno-f8455',
  storageBucket: 'syno-f8455.firebasestorage.app',
  messagingSenderId: '53376678294',
  appId: '1:53376678294:web:48347c81c77964a74e05b7',
}

export default defineNuxtPlugin({
  name: 'firebase-fcm',
  parallel: true,
  setup() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const config = useRuntimeConfig()
    const vapidKey = config.public.firebaseVapidKey as string
    if (!vapidKey) return

    const authToken = useState<string | null>('auth:token')

    // Fire and forget — never blocks navigation
    ;(async () => {
      try {
        const app = getApps().length ? getApps()[0]! : initializeApp(FIREBASE_CONFIG)
        const messaging = getMessaging(app)

        onMessage(messaging, (payload) => {
          const title = payload.notification?.title ?? 'Syno'
          const body = payload.notification?.body ?? ''
          // Show via service worker so it appears even when the tab is focused
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, { body, icon: '/icon-192.png' })
          }).catch(() => {
            new Notification(title, { body, icon: '/icon-192.png' })
          })
        })

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

        // Wait for THIS registration to activate, not any SW on the page.
        // navigator.serviceWorker.ready waits for the controlling SW which may
        // never resolve if vite-pwa SW is waiting with skipWaiting:false.
        if (!registration.active) {
          await new Promise<void>(resolve => {
            const sw = registration.installing ?? registration.waiting
            if (!sw) { resolve(); return }
            sw.addEventListener('statechange', function handler() {
              if ((this as ServiceWorker).state === 'activated') {
                sw.removeEventListener('statechange', handler)
                resolve()
              }
            })
          })
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

        if (authToken.value) {
          await save(authToken.value)
        } else {
          const stop = watch(authToken, async (token) => {
            if (!token) return
            stop()
            await save(token)
          })
        }
      } catch (err) {
        console.warn('[FCM] plugin failed:', err)
      }
    })()
  },
})
