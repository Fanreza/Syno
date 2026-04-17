export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    toAddress: string
    amount: number
    signature: string
    memo?: string
    paymentLinkId?: string
    splitParticipantId?: string
  }>(event)

  if (!body?.signature || !body.toAddress || !body.amount) {
    throw createError({ statusCode: 400, statusMessage: 'missing fields' })
  }

  const db = adminDb()

  const { data: sender } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  const { data: receiver } = await db
    .from('users')
    .select('id')
    .eq('wallet_address', body.toAddress)
    .maybeSingle()

  const { data: payment } = await db
    .from('payments')
    .insert({
      sender_id: sender?.id,
      receiver_id: receiver?.id,
      receiver_address: body.toAddress,
      amount: body.amount,
      token: 'SOL',
      status: 'confirmed',
      tx_signature: body.signature,
      memo: body.memo || null
    })
    .select()
    .single()

  if (body.paymentLinkId) {
    await db
      .from('payments')
      .update({ status: 'confirmed', tx_signature: body.signature })
      .eq('id', body.paymentLinkId)
  }

  if (body.splitParticipantId) {
    await db
      .from('split_participants')
      .update({
        status: 'paid',
        tx_signature: body.signature,
        paid_at: new Date().toISOString(),
        user_id: sender?.id
      })
      .eq('id', body.splitParticipantId)
  }

  return { payment }
})
