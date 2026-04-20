export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Bills created by user
  const { data: created } = await db
    .from('split_bills')
    .select(`
      id, title, total_amount, token, status, created_at,
      split_participants(id, status)
    `)
    .eq('creator_id', me.id)
    .order('created_at', { ascending: false })

  // Bills where user is a participant
  const { data: participating } = await db
    .from('split_participants')
    .select(`
      id, amount, status, username,
      bill:split_bills(id, title, total_amount, token, status, created_at)
    `)
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })

  const createdBills = (created ?? []).map((b) => ({
    ...b,
    role: 'creator' as const,
    paid: (b.split_participants ?? []).filter((p: any) => p.status === 'paid').length,
    total: (b.split_participants ?? []).length,
  }))

  const participatingBills = (participating ?? [])
    .filter((p) => p.bill)
    .map((p) => ({
      ...(p.bill as any),
      role: 'participant' as const,
      myAmount: Number(p.amount),
      myStatus: p.status,
      participantId: p.id,
    }))

  return { created: createdBills, participating: participatingBills }
})
