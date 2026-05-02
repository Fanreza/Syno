// Unified requests endpoint: payment links + split bills, both directions
export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id, username')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!me) throw createError({ statusCode: 401, statusMessage: 'User not found' })

  // ── BY ME ──────────────────────────────────────────────────────────────────

  // Payment links created by me
  const { data: payLinks } = await db
    .from('payments')
    .select('id, amount, token, status, memo, created_at, sender_id, tx_signature')
    .eq('receiver_id', me.id)
    .is('split_participant_id', null)
    .neq('token', 'PRIVATE')
    .order('created_at', { ascending: false })

  // Enrich payment links with sender username
  const senderIds = [...new Set((payLinks ?? []).filter((p: any) => p.sender_id).map((p: any) => p.sender_id))]
  const senderMap: Record<string, string> = {}
  if (senderIds.length) {
    const { data: senders } = await db.from('users').select('id, username').in('id', senderIds)
    for (const u of senders ?? []) senderMap[u.id] = u.username
  }

  const byMeLinks = (payLinks ?? []).map((p: any) => ({
    kind: 'link' as const,
    id: p.id,
    amount: p.amount,
    token: p.token,
    status: p.status,
    memo: p.memo,
    created_at: p.created_at,
    tx_signature: p.tx_signature,
    paid_by: p.sender_id ? senderMap[p.sender_id] ?? null : null,
  }))

  // Split bills created by me
  const { data: createdSplits } = await db
    .from('split_bills')
    .select('id, title, total_amount, token, status, created_at, split_participants(id, status)')
    .eq('creator_id', me.id)
    .order('created_at', { ascending: false })

  const byMeSplits = (createdSplits ?? []).map((b: any) => ({
    kind: 'split' as const,
    id: b.id,
    title: b.title ?? 'Untitled split',
    amount: b.total_amount,
    token: b.token,
    status: b.status,
    created_at: b.created_at,
    paid: (b.split_participants ?? []).filter((p: any) => p.status === 'paid').length,
    total: (b.split_participants ?? []).length,
  }))

  // ── TO ME ──────────────────────────────────────────────────────────────────

  // Split participants where I'm mentioned — by user_id or username
  const { data: participantRows } = await db
    .from('split_participants')
    .select('id, amount, status, username, user_id, bill_id, tx_signature')
    .or(`user_id.eq.${me.id},and(user_id.is.null,username.ilike.${me.username})`)


  const participating = participantRows ?? []

  // Backfill user_id for username-matched rows
  const unlinked = participating.filter((r: any) => !r.user_id).map((r: any) => r.id)
  if (unlinked.length) {
    await db.from('split_participants').update({ user_id: me.id }).in('id', unlinked)
  }

  // Fetch bills for those participant rows
  const billIds = [...new Set(participating.map((r: any) => r.bill_id).filter(Boolean))]
  const billMap: Record<string, any> = {}
  if (billIds.length) {
    const { data: bills } = await db
      .from('split_bills')
      .select('id, title, token, status, created_at, creator_id')
      .in('id', billIds)
    for (const b of bills ?? []) billMap[b.id] = b
  }

  // Fetch payment links linked to these participant rows
  const { data: linkedPayments } = await db
    .from('payments')
    .select('id, split_participant_id')
    .in('split_participant_id', participating.map((r: any) => r.id))
  const paymentByParticipant: Record<string, string> = {}
  for (const p of linkedPayments ?? []) {
    if (p.split_participant_id) paymentByParticipant[p.split_participant_id] = p.id
  }

  // Fetch creator usernames
  const creatorIds = [...new Set(Object.values(billMap).map((b: any) => b.creator_id).filter(Boolean))]
  const creatorMap: Record<string, string> = {}
  if (creatorIds.length) {
    const { data: creators } = await db.from('users').select('id, username').in('id', creatorIds)
    for (const u of creators ?? []) creatorMap[u.id] = u.username
  }

  const toMe = participating
    .map((p: any) => {
      const bill = billMap[p.bill_id]
      if (!bill) return null
      return {
        kind: 'split' as const,
        participant_id: p.id,
        payment_id: paymentByParticipant[p.id] ?? null,
        bill_id: bill.id,
        title: bill.title ?? 'Untitled split',
        amount: p.amount,
        token: bill.token,
        bill_status: bill.status,
        my_status: p.status,
        tx_signature: p.tx_signature ?? null,
        created_at: bill.created_at,
        from_username: creatorMap[bill.creator_id] ?? null,
      }
    })
    .filter(Boolean)

  return {
    by_me: [...byMeLinks, ...byMeSplits].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    to_me: toMe.sort((a: any, b: any) => {
      if (a.my_status === b.my_status) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return a.my_status === 'pending' ? -1 : 1
    }),
  }
})
