export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = adminDb()
  const { data: bill } = await db.from('split_bills').select('*').eq('id', id).maybeSingle()
  if (!bill) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const { data: participants } = await db
    .from('split_participants')
    .select('*')
    .eq('bill_id', id)

  let creator: any = null
  if (bill.creator_id) {
    const { data: c } = await db
      .from('users')
      .select('username, wallet_address')
      .eq('id', bill.creator_id)
      .maybeSingle()
    creator = c
  }

  // Fetch existing payment links for each participant
  const participantIds = (participants ?? []).map((p: any) => p.id)
  const paymentLinkMap: Record<string, string> = {}
  if (participantIds.length) {
    const { data: links } = await db
      .from('payments')
      .select('id, split_participant_id, status')
      .in('split_participant_id', participantIds)
      .eq('status', 'pending')
    for (const l of links ?? []) {
      if (l.split_participant_id) paymentLinkMap[l.split_participant_id] = l.id
    }
  }

  // Detect which participant the current user is (optional auth)
  let myParticipantId: string | null = null
  try {
    const auth = await requireUser(event)
    const { data: me } = await db
      .from('users')
      .select('id, username')
      .eq('privy_user_id', auth.userId)
      .maybeSingle()
    if (me) {
      const mine = (participants ?? []).find(
        (p: any) => p.user_id === me.id || p.username?.toLowerCase() === me.username?.toLowerCase()
      )
      myParticipantId = mine?.id ?? null
    }
  } catch {}

  const enriched = (participants ?? []).map((p: any) => ({
    ...p,
    payment_link_id: paymentLinkMap[p.id] ?? null,
  }))

  return { ...bill, participants: enriched, creator, myParticipantId }
})
