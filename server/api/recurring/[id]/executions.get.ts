export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const recurringId = getRouterParam(event, 'id')
  if (!recurringId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Verify ownership
  const { data: payment } = await db
    .from('recurring_payments')
    .select('id')
    .eq('id', recurringId)
    .eq('creator_id', me.id)
    .maybeSingle()
  if (!payment) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const { data: executions } = await db
    .from('recurring_executions')
    .select('id, executed_at, status, tx_signature, error')
    .eq('recurring_payment_id', recurringId)
    .order('executed_at', { ascending: false })
    .limit(20)

  return executions ?? []
})
