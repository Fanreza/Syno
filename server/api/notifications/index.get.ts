export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users').select('id').eq('privy_user_id', auth.userId).maybeSingle()
  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data: notifications } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { count } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', me.id)
    .eq('read', false)

  return { notifications: notifications ?? [], unread: count ?? 0 }
})
