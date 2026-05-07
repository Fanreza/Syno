export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data, error } = await db
    .from('contacts')
    .select('id, wallet_address, label, note, created_at')
    .eq('user_id', me.id)
    .order('label', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data ?? []
})
