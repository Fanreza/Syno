export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data: transfers } = await db
    .from('payments')
    .select(`
      id, amount, token, memo, tx_signature, created_at,
      receiver_address,
      receiver:users!payments_receiver_id_fkey(username)
    `)
    .eq('sender_id', me.id)
    .eq('token', 'PRIVATE')
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(50)

  return (transfers ?? []).map(t => ({
    id: t.id,
    amount: Number(t.amount),
    token: 'USDC',
    recipient_address: t.receiver_address ?? '',
    recipient_username: (t.receiver as any)?.username ?? null,
    memo: t.memo,
    tx_signature: t.tx_signature,
    created_at: t.created_at,
  }))
})
