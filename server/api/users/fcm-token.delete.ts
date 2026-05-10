export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) return { ok: true }

  await db.from('users').update({ fcm_token: null }).eq('id', me.id)

  return { ok: true }
})
