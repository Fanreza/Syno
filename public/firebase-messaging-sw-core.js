importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

let _messaging = null

function initMessaging(config) {
  if (_messaging) return
  if (!firebase.apps.length) {
    firebase.initializeApp(config)
  }
  _messaging = firebase.messaging()
  _messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? 'Syno'
    const body = payload.notification?.body ?? ''
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data,
    })
  })
}

// Receive Firebase config from main app via postMessage
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG' && event.data.config?.apiKey) {
    initMessaging(event.data.config)
  }
})
