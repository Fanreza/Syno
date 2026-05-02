export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ id?: string }>(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users').select('id').eq('privy_user_id', auth.userId).maybeSingle()
  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const q = db.from('notifications').update({ read: true }).eq('user_id', me.id)
  if (body?.id) {
    await q.eq('id', body.id)
  } else {
    await q.eq('read', false)
  }

  return { ok: true }
})
