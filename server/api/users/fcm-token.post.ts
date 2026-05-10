export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const { token } = await readBody<{ token: string }>(event)

  if (!token) throw createError({ statusCode: 400, statusMessage: 'token required' })

  const db = adminDb()
  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Clear this token from any other user who currently holds it
  await db.from('users').update({ fcm_token: null }).eq('fcm_token', token).neq('id', me.id)

  await db.from('users').update({ fcm_token: token }).eq('id', me.id)

  return { ok: true }
})
