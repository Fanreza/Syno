export default defineEventHandler(async (event) => {
  await requireUser(event)
  const { participantId } = await readBody<{ participantId: string }>(event)
  if (!participantId) throw createError({ statusCode: 400, statusMessage: 'participantId required' })

  const db = adminDb()

  const { data: participant } = await db
    .from('split_participants')
    .select('id, amount, status, bill_id, username')
    .eq('id', participantId)
    .maybeSingle()

  if (!participant) throw createError({ statusCode: 404, statusMessage: 'Participant not found' })
  if (participant.status === 'paid') throw createError({ statusCode: 400, statusMessage: 'Already paid' })

  const { data: bill } = await db
    .from('split_bills')
    .select('id, title, token, creator_id')
    .eq('id', participant.bill_id)
    .maybeSingle()

  if (!bill) throw createError({ statusCode: 404, statusMessage: 'Bill not found' })

  const { data: creator } = await db
    .from('users')
    .select('id, wallet_address')
    .eq('id', bill.creator_id)
    .maybeSingle()

  if (!creator) throw createError({ statusCode: 404, statusMessage: 'Creator not found' })

  // Reuse existing pending link only if receiver is the creator (not a broken old link)
  const { data: existing } = await db
    .from('payments')
    .select('id')
    .eq('split_participant_id', participantId)
    .eq('status', 'pending')
    .eq('receiver_id', creator.id)
    .maybeSingle()

  if (existing) return { id: existing.id }

  const { data, error } = await db
    .from('payments')
    .insert({
      sender_id: null,
      receiver_id: creator.id,
      receiver_address: creator.wallet_address,
      amount: participant.amount,
      token: bill.token,
      memo: `${bill.title || 'Split'} — @${participant.username}`,
      status: 'pending',
      split_participant_id: participantId,
    })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { id: data.id }
})
