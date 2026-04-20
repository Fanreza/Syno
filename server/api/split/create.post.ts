export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    title: string
    totalAmount: number
    token?: string
    participants: { username: string; amount: number }[]
  }>(event)
  if (!body?.totalAmount || !body.participants?.length) {
    throw createError({ statusCode: 400, statusMessage: 'missing fields' })
  }

  const db = adminDb()
  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .single()

  const { data: bill, error } = await db
    .from('split_bills')
    .insert({
      creator_id: me?.id,
      title: body.title || 'Split Bill',
      total_amount: body.totalAmount,
      token: body.token ?? 'So11111111111111111111111111111111111111112',
      status: 'open'
    })
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = await Promise.all(
    body.participants.map(async (p) => {
      const clean = p.username.replace(/^@/, '').toLowerCase()
      const { data: u } = await db.from('users').select('id').eq('username', clean).maybeSingle()
      return {
        bill_id: bill.id,
        user_id: u?.id || null,
        username: clean,
        amount: p.amount,
        status: 'pending'
      }
    })
  )
  await db.from('split_participants').insert(rows)

  return { id: bill.id }
})
