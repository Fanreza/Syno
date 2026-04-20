export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [sentRes, receivedRes, splitsRes] = await Promise.all([
    db.from('payments')
      .select('amount')
      .eq('sender_id', me.id)
      .eq('status', 'confirmed')
      .gte('created_at', thirtyDaysAgo),

    db.from('payments')
      .select('amount')
      .eq('receiver_id', me.id)
      .eq('status', 'confirmed')
      .gte('created_at', thirtyDaysAgo),

    db.from('split_bills')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', me.id)
      .eq('status', 'open'),
  ])

  const sentSol = (sentRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const receivedSol = (receivedRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const openSplits = splitsRes.count ?? 0

  return { sentSol, receivedSol, openSplits }
})
