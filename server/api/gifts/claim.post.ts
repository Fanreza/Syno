import { authorizationContext } from '../../utils/privy'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ giftId: string }>(event)
  if (!body?.giftId) throw createError({ statusCode: 400, statusMessage: 'Missing giftId' })

  const db = adminDb()
  const privy = getPrivy()
  const config = useRuntimeConfig()

  // Get claimer
  const { data: claimer } = await db
    .from('users')
    .select('id, wallet_address')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!claimer) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Get gift — lock for update by checking claimed_count
  const { data: gift } = await db
    .from('gifts')
    .select('id, total_amount, total_slots, claimed_count, pool_wallet, pool_privy_wallet_id, token')
    .eq('id', body.giftId)
    .maybeSingle()
  if (!gift) throw createError({ statusCode: 404, statusMessage: 'Gift not found' })

  if (gift.claimed_count >= gift.total_slots) {
    throw createError({ statusCode: 409, statusMessage: 'All slots claimed' })
  }

  // Check already claimed
  const { data: existing } = await db
    .from('gift_claims')
    .select('id')
    .eq('gift_id', body.giftId)
    .eq('user_id', claimer.id)
    .maybeSingle()
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Already claimed' })

  const amountPerClaim = gift.total_amount / gift.total_slots

  // Transfer from pool wallet to claimer
  const txBase64 = await buildTransferSolTx(gift.pool_wallet, claimer.wallet_address, amountPerClaim)
  const result = await (privy.wallets() as any).solana().signAndSendTransaction(gift.pool_privy_wallet_id, {
    caip2: config.solanaCaip2,
    transaction: txBase64,
    ...authorizationContext()
  })
  const signature: string = result.signature ?? result.hash ?? ''

  // Record claim and increment counter
  await db.from('gift_claims').insert({
    gift_id: body.giftId,
    user_id: claimer.id,
    amount: amountPerClaim,
    tx_signature: signature
  })

  await db
    .from('gifts')
    .update({ claimed_count: gift.claimed_count + 1 })
    .eq('id', body.giftId)

  return { signature, amount: amountPerClaim, token: gift.token }
})
