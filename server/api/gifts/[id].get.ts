export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing gift id' })

  const db = adminDb()

  const { data: gift, error } = await db
    .from('gifts')
    .select(`
      id, total_amount, token, total_slots, claimed_count, created_at, expires_at, distribution, creator_id,
      creator:creator_id ( username, wallet_address )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !gift) throw createError({ statusCode: 404, statusMessage: 'Gift not found' })

  const amountPerClaim = gift.total_amount / gift.total_slots
  const remaining = gift.total_slots - gift.claimed_count
  const isExpired = gift.expires_at ? new Date(gift.expires_at) < new Date() : false

  // Optionally check if the logged-in user already claimed; if creator, return claim list
  let alreadyClaimed = false
  let claims: { id: string; amount: number; tx_signature: string | null; claimed_at: string; username: string | null }[] = []
  try {
    const auth = await requireUser(event)
    const { data: me } = await db.from('users').select('id').eq('privy_user_id', auth.userId).maybeSingle()
    if (me) {
      const { data: claim } = await db.from('gift_claims').select('id').eq('gift_id', id).eq('user_id', me.id).maybeSingle()
      alreadyClaimed = !!claim

      if (me.id === (gift as any).creator_id) {
        const { data: claimsData } = await db.from('gift_claims')
          .select('id, amount, tx_signature, created_at, claimer:user_id(username, wallet_address)')
          .eq('gift_id', id)
          .order('created_at', { ascending: false })
        claims = (claimsData ?? []).map((c: any) => ({
          id: c.id,
          amount: Number(c.amount),
          tx_signature: c.tx_signature ?? null,
          claimed_at: c.created_at,
          username: c.claimer?.username ?? null,
        }))
      }
    }
  } catch { /* not logged in — leave alreadyClaimed false */ }

  return {
    ...gift,
    amount_per_claim: amountPerClaim,
    remaining_slots: remaining,
    is_exhausted: remaining <= 0,
    is_expired: isExpired,
    already_claimed: alreadyClaimed,
    claims,
  }
})
