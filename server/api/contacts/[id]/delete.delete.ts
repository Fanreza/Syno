export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, statusMessage: 'Contact id required' })

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { error } = await db
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', me.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { ok: true }
})
