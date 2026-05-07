importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyCXYm8OrQ6N3o8GDP35jH72IevzLgjfErM",
  authDomain: "syno-f8455.firebaseapp.com",
  projectId: "syno-f8455",
  storageBucket: "syno-f8455.firebasestorage.app",
  messagingSenderId: "53376678294",
  appId: "1:53376678294:web:48347c81c77964a74e05b7",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Syno'
  const body = payload.notification?.body ?? ''
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
  })
})
