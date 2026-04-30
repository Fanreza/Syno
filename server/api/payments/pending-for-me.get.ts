// Payment requests targeting this user specifically — from splits
export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id, username')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!me) throw createError({ statusCode: 401, statusMessage: 'User not found' })

  // Find pending split participants where this user owes money
  const { data: participants } = await db
    .from('split_participants')
    .select(`
      id, amount, status,
      bill:split_bills(id, title, token, creator_id),
      payment:payments(id, memo)
    `)
    .eq('user_id', me.id)
    .eq('status', 'pending')

  if (!participants?.length) return []

  // Get creator info for each bill
  const creatorIds = [...new Set(participants.map((p: any) => p.bill?.creator_id).filter(Boolean))]
  const { data: creators } = await db
    .from('users')
    .select('id, username')
    .in('id', creatorIds)
  const creatorMap: Record<string, string> = {}
  for (const c of creators ?? []) creatorMap[c.id] = c.username

  return participants.map((p: any) => ({
    type: 'split',
    split_participant_id: p.id,
    amount: p.amount,
    token: p.bill?.token ?? 'SOL',
    bill_id: p.bill?.id,
    bill_title: p.bill?.title ?? 'Untitled split',
    payment_id: p.payment?.id ?? null,
    memo: p.payment?.memo ?? null,
    from_username: creatorMap[p.bill?.creator_id] ?? null,
  }))
})
