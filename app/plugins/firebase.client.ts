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

        // Use the vite-pwa SW (which already includes firebase-messaging-sw-core.js).
        // Do NOT register a separate /firebase-messaging-sw.js — that would create a
        // second SW at the same scope and they would keep replacing each other.
        const registration = await navigator.serviceWorker.getRegistration('/')
        if (!registration) return

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
