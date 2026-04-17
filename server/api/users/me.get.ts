export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()
  const { data } = await db
    .from('users')
    .select('*')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  return data
})
