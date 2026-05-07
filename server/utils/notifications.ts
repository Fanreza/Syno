import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

type NotifType =
  | 'payment_received'
  | 'split_paid'
  | 'split_created'
  | 'split_settled'
  | 'gift_claimed'
  | 'gift_fully_claimed'
  | 'gift_received'
  | 'payroll_received'
  | 'friend_added'

interface NotifPayload {
  userId: string
  type: NotifType
  title: string
  body: string
  data?: Record<string, unknown>
}

function getFirebaseAdmin() {
  if (getApps().length) return getApps()[0]!
  const config = useRuntimeConfig()
  const serviceAccount = config.firebaseServiceAccount as string
  if (!serviceAccount) return null
  try {
    return initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
  } catch {
    return null
  }
}

async function pushFcm(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
  const app = getFirebaseAdmin()
  if (!app) {
    console.warn('[FCM] firebase-admin not initialized — check FIREBASE_SERVICE_ACCOUNT env var')
    return
  }
  try {
    const result = await getMessaging(app).send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    })
    console.log('[FCM] push sent:', result)
  } catch (err: any) {
    console.warn('[FCM] push failed:', err?.message ?? err)
  }
}

export async function createNotification(payload: NotifPayload) {
  const db = adminDb()
  const { error } = await db.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  })

  if (error) {
    console.error('[notifications] insert failed:', error.message, '| userId:', payload.userId, '| type:', payload.type)
    return
  }

  const { data: user } = await db
    .from('users')
    .select('fcm_token')
    .eq('id', payload.userId)
    .maybeSingle()

  if (user?.fcm_token) {
    await pushFcm(
      user.fcm_token as string,
      payload.title,
      payload.body,
      payload.data ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)])) : undefined,
    )
  }
}
