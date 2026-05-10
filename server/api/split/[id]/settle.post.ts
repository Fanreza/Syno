export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const billId = getRouterParam(event, 'id')
  const body = await readBody<{ participantId: string }>(event)

  if (!billId || !body?.participantId)
    throw createError({ statusCode: 400, statusMessage: 'Missing billId or participantId' })

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data: bill } = await db
    .from('split_bills')
    .select('id, creator_id')
    .eq('id', billId)
    .maybeSingle()
  if (!bill) throw createError({ statusCode: 404, statusMessage: 'Bill not found' })
  if (bill.creator_id !== me.id)
    throw createError({ statusCode: 403, statusMessage: 'Only the bill creator can manually settle participants' })

  const { data: participant } = await db
    .from('split_participants')
    .select('id, status')
    .eq('id', body.participantId)
    .eq('bill_id', billId)
    .maybeSingle()
  if (!participant) throw createError({ statusCode: 404, statusMessage: 'Participant not found' })
  if (participant.status === 'paid')
    throw createError({ statusCode: 409, statusMessage: 'Already marked as paid' })

  await db
    .from('split_participants')
    .update({ status: 'paid', tx_signature: null })
    .eq('id', body.participantId)

  // Check if all participants are now paid — close the bill
  const { data: allParticipants } = await db
    .from('split_participants')
    .select('status')
    .eq('bill_id', billId)

  const allPaid = (allParticipants ?? []).every(p => p.status === 'paid')
  if (allPaid) {
    await db.from('split_bills').update({ status: 'settled' }).eq('id', billId)
  }

  return { success: true }
})
