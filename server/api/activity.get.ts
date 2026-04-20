export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Payments sent or received (confirmed only)
  const { data: payments } = await db
    .from('payments')
    .select(`
      id, amount, token, memo, status, tx_signature, created_at,
      sender_id, receiver_id, receiver_address,
      sender:users!payments_sender_id_fkey(username),
      receiver:users!payments_receiver_id_fkey(username)
    `)
    .or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(20)

  // Split bills created by user
  const { data: splits } = await db
    .from('split_bills')
    .select('id, title, total_amount, token, status, created_at')
    .eq('creator_id', me.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Gift claims received
  const { data: claims } = await db
    .from('gift_claims')
    .select('id, amount, tx_signature, created_at, gift_id')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Merge and sort all activity by created_at descending
  const activity = [
    ...(payments ?? []).map((p) => ({
      type: (p.sender_id === me.id ? 'sent' : 'received') as 'sent' | 'received',
      id: p.id,
      amount: Number(p.amount),
      token: p.token,
      memo: p.memo,
      tx_signature: p.tx_signature,
      counterparty: p.sender_id === me.id
        ? ((p.receiver as any)?.username ?? p.receiver_address)
        : ((p.sender as any)?.username ?? null),
      created_at: p.created_at,
    })),
    ...(splits ?? []).map((s) => ({
      type: 'split' as const,
      id: s.id,
      amount: Number(s.total_amount),
      token: s.token,
      memo: s.title,
      tx_signature: null,
      counterparty: null,
      status: s.status,
      created_at: s.created_at,
    })),
    ...(claims ?? []).map((c) => ({
      type: 'gift_claim' as const,
      id: c.id,
      amount: Number(c.amount),
      token: 'SOL',
      memo: 'Gift claimed',
      tx_signature: c.tx_signature,
      counterparty: null,
      gift_id: c.gift_id,
      created_at: c.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   .slice(0, 20)

  return activity
})
