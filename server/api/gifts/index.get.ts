export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!me) throw createError({ statusCode: 401, statusMessage: 'User not found' })

  // Gifts I created
  const { data: created } = await db
    .from('gifts')
    .select('id, total_amount, total_slots, claimed_count, token, created_at')
    .eq('creator_id', me.id)
    .order('created_at', { ascending: false })

  // Gifts I claimed
  const { data: claims } = await db
    .from('gift_claims')
    .select('id, amount, tx_signature, created_at, gift_id, gifts(id, total_amount, total_slots, token, creator_id)')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false })

  // Fetch creator usernames for claimed gifts
  const creatorIds = [...new Set((claims ?? []).map((c: any) => c.gifts?.creator_id).filter(Boolean))]
  const creatorMap: Record<string, string> = {}
  if (creatorIds.length) {
    const { data: creators } = await db.from('users').select('id, username').in('id', creatorIds)
    for (const u of creators ?? []) creatorMap[u.id] = u.username
  }

  const KNOWN_MINTS: Record<string, string> = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  }

  return {
    created: (created ?? []).map((g: any) => ({
      id: g.id,
      total_amount: g.total_amount,
      total_slots: g.total_slots,
      claimed_count: g.claimed_count,
      token: g.token,
      token_symbol: KNOWN_MINTS[g.token] ?? g.token?.slice(0, 6) + '…',
      created_at: g.created_at,
      settled: g.claimed_count >= g.total_slots,
    })),
    claimed: (claims ?? []).map((c: any) => ({
      id: c.id,
      gift_id: c.gift_id,
      amount: c.amount,
      tx_signature: c.tx_signature,
      created_at: c.created_at,
      token: c.gifts?.token,
      token_symbol: KNOWN_MINTS[c.gifts?.token] ?? c.gifts?.token?.slice(0, 6) + '…',
      from_username: creatorMap[c.gifts?.creator_id] ?? null,
    })),
  }
})
