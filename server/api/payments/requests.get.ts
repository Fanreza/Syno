export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 401, statusMessage: 'User not found' })

  // Payment links = payments where this user is receiver and sender_id was initially null
  // We identify them by: receiver_id = me AND split_participant_id IS NULL
  // (split payments have split_participant_id set)
  const { data } = await db
    .from('payments')
    .select('id, amount, token, status, memo, created_at, sender_id, tx_signature')
    .eq('receiver_id', me.id)
    .is('split_participant_id', null)
    .neq('token', 'PRIVATE')
    .order('created_at', { ascending: false })

  // Enrich with sender info where available
  const senderIds = [...new Set((data ?? []).filter(p => p.sender_id).map(p => p.sender_id))]
  let senders: Record<string, { username: string }> = {}
  if (senderIds.length) {
    const { data: users } = await db
      .from('users')
      .select('id, username')
      .in('id', senderIds)
    for (const u of users ?? []) senders[u.id] = { username: u.username }
  }

  return (data ?? []).map(p => ({
    ...p,
    sender: p.sender_id ? (senders[p.sender_id] ?? null) : null,
    appUrl: useRuntimeConfig().public.appUrl,
  }))
})
