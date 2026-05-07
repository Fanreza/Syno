export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data: existing } = await db
    .from('recurring_payments')
    .select('id, active')
    .eq('id', id)
    .eq('creator_id', me.id)
    .maybeSingle()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Recurring payment not found' })

  const { data, error } = await db
    .from('recurring_payments')
    .update({ active: !existing.active })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
