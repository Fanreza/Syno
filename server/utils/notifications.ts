type NotifType =
  | 'payment_received'
  | 'split_paid'
  | 'split_created'
  | 'gift_claimed'
  | 'gift_received'
  | 'payroll_received'

interface NotifPayload {
  userId: string
  type: NotifType
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function createNotification(payload: NotifPayload) {
  const db = adminDb()
  await db.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  })
}
