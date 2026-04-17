export default defineEventHandler(async (event) => {
  const { username } = getQuery(event) as { username?: string }
  if (!username) throw createError({ statusCode: 400, statusMessage: 'username required' })
  const clean = username.replace(/^@/, '').toLowerCase().trim()
  const { data } = await adminDb()
    .from('users')
    .select('id, username, wallet_address')
    .eq('username', clean)
    .maybeSingle()
  if (!data) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return data
})
