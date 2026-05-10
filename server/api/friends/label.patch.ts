export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ friendId: string; label: string }>(event)
  if (!body?.friendId) throw createError({ statusCode: 400, statusMessage: 'friendId required' })

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me) throw createError({ statusCode: 400, statusMessage: 'User not onboarded' })

  const { error } = await db
    .from('friends')
    .update({ label: body.label?.trim() || null })
    .eq('user_id', me.id)
    .eq('friend_id', body.friendId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
