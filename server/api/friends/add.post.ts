export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const { username } = await readBody<{ username: string }>(event)
  if (!username?.trim()) throw createError({ statusCode: 400, statusMessage: 'username required' })

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me) throw createError({ statusCode: 400, statusMessage: 'User not onboarded' })

  const { data: friend } = await db
    .from('users')
    .select('id, username, wallet_address')
    .eq('username', username.replace(/^@/, '').toLowerCase().trim())
    .maybeSingle()
  if (!friend) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (friend.id === me.id) throw createError({ statusCode: 400, statusMessage: 'Cannot add yourself' })

  const { error } = await db
    .from('friends')
    .insert({ user_id: me.id, friend_id: friend.id })

  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Already a friend' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { username: friend.username, wallet_address: friend.wallet_address }
})
