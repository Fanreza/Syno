export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ amount: number; memo?: string }>(event)
  if (!body?.amount || body.amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'amount required' })
  }

  const db = adminDb()
  const { data: me } = await db
    .from('users')
    .select('id, wallet_address')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me) throw createError({ statusCode: 400, statusMessage: 'User not onboarded' })

  const { data, error } = await db
    .from('payments')
    .insert({
      sender_id: null,
      receiver_id: me.id,
      receiver_address: me.wallet_address,
      amount: body.amount,
      token: 'SOL',
      status: 'pending',
      memo: body.memo || null
    })
    .select('id')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { id: data.id }
})
