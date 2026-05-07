export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    recipientUsername?: string
    recipientAddress?: string
    amount: number
    token: string
    decimals: number
    memo?: string
    frequency: 'weekly' | 'monthly'
    startDate?: string
  }>(event)

  if (!body?.amount || body.amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'amount must be > 0' })
  }
  if (!body.frequency || !['weekly', 'monthly'].includes(body.frequency)) {
    throw createError({ statusCode: 400, statusMessage: 'frequency must be weekly or monthly' })
  }
  if (!body.recipientUsername && !body.recipientAddress) {
    throw createError({ statusCode: 400, statusMessage: 'recipientUsername or recipientAddress required' })
  }

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const now = new Date()
  let nextRunAt: Date

  if (body.startDate) {
    const start = new Date(body.startDate)
    nextRunAt = start > now ? start : computeNext(now, body.frequency)
  } else {
    nextRunAt = computeNext(now, body.frequency)
  }

  const { data, error } = await db
    .from('recurring_payments')
    .insert({
      creator_id: me.id,
      recipient_username: body.recipientUsername ?? null,
      recipient_address: body.recipientAddress ?? null,
      amount: body.amount,
      token: body.token,
      decimals: body.decimals,
      memo: body.memo ?? null,
      frequency: body.frequency,
      next_run_at: nextRunAt.toISOString(),
      active: true,
    })
    .select()
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})

function computeNext(from: Date, frequency: 'weekly' | 'monthly'): Date {
  const d = new Date(from)
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d
}
