// Unified requests endpoint: payment links + split bills, both directions
export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
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

  // Split bills where I'm a participant
  const { data: participating } = await db
    .from('split_participants')
    .select('id, amount, status, bill:split_bills(id, title, token, status, created_at, creator_id), payment:payments(id)')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })

  const creatorIds = [...new Set((participating ?? []).map((p: any) => p.bill?.creator_id).filter(Boolean))]
  const creatorMap: Record<string, string> = {}
  if (creatorIds.length) {
    const { data: creators } = await db.from('users').select('id, username').in('id', creatorIds)
    for (const u of creators ?? []) creatorMap[u.id] = u.username
  }

  const toMe = (participating ?? [])
    .filter((p: any) => p.bill)
    .map((p: any) => ({
      kind: 'split' as const,
      participant_id: p.id,
      payment_id: p.payment?.id ?? null,
      bill_id: p.bill.id,
      title: p.bill.title ?? 'Untitled split',
      amount: p.amount,
      token: p.bill.token,
      bill_status: p.bill.status,
      my_status: p.status,
      created_at: p.bill.created_at,
      from_username: creatorMap[p.bill.creator_id] ?? null,
    }))

  return {
    by_me: [...byMeLinks, ...byMeSplits].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    to_me: toMe,
  }
})
