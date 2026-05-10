export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing gift id' })

  const db = adminDb()

  const { data: gift, error } = await db
    .from('gifts')
    .select(`
      id, total_amount, token, total_slots, claimed_count, created_at,
      creator:creator_id ( username, wallet_address )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !gift) throw createError({ statusCode: 404, statusMessage: 'Gift not found' })

  const amountPerClaim = gift.total_amount / gift.total_slots
  const remaining = gift.total_slots - gift.claimed_count

  // Optionally check if the logged-in user already claimed
  let alreadyClaimed = false
  try {
    const auth = await requireUser(event)
    const { data: me } = await db.from('users').select('id').eq('privy_user_id', auth.userId).maybeSingle()
    if (me) {
      const { data: claim } = await db.from('gift_claims').select('id').eq('gift_id', id).eq('user_id', me.id).maybeSingle()
      alreadyClaimed = !!claim
    }
  } catch { /* not logged in — leave alreadyClaimed false */ }

  return {
    ...gift,
    amount_per_claim: amountPerClaim,
    remaining_slots: remaining,
    is_exhausted: remaining <= 0,
    already_claimed: alreadyClaimed,
  }
})
