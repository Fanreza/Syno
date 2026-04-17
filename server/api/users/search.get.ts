export default defineEventHandler(async (event) => {
  const { q } = getQuery(event) as { q?: string }
  if (!q || q.length < 2) return []
  const { data } = await adminDb()
    .from('users')
    .select('id, username, wallet_address')
    .ilike('username', `%${q.replace(/^@/, '').toLowerCase()}%`)
    .limit(10)
  return data || []
})
