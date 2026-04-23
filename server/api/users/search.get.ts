export default defineEventHandler(async (event) => {
  const { q } = getQuery(event) as { q?: string }
  if (!q || q.length < 2) return []

  const db = adminDb()

  // If input looks like a Solana address (base58, 32-44 chars), lookup by wallet_address
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
    const { data } = await db
      .from('users')
      .select('id, username, wallet_address')
      .ilike('wallet_address', q)
      .limit(1)
    return data || []
  }

  const { data } = await db
    .from('users')
    .select('id, username, wallet_address')
    .ilike('username', `%${q.replace(/^@/, '').toLowerCase()}%`)
    .limit(10)
  return data || []
})
