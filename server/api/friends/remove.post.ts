export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const { friendId } = await readBody<{ friendId: string }>(event)
  if (!friendId) throw createError({ statusCode: 400, statusMessage: 'friendId required' })

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me) throw createError({ statusCode: 400, statusMessage: 'User not onboarded' })

  await db.from('friends').delete().eq('user_id', me.id).eq('friend_id', friendId)
  return { ok: true }
})
