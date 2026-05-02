export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    totalAmount: number
    totalSlots: number
    token?: string
    decimals?: number
  }>(event)

  if (!body?.totalAmount || !body?.totalSlots || body.totalAmount <= 0 || body.totalSlots < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid gift parameters' })
  }

  const db = adminDb()

  const { data: creator } = await db
    .from('users')
    .select('id, wallet_address')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!creator) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Check balance before creating
  const SOL_MINT = 'So11111111111111111111111111111111111111112'
  const tokenMint = body.token ?? SOL_MINT
  if (tokenMint === SOL_MINT) {
    const solBal = await getSolBalance(creator.wallet_address)
    if (body.totalAmount > solBal) {
      throw createError({ statusCode: 400, statusMessage: `Not enough balance. You have ${solBal.toFixed(4)} SOL.` })
    }
  } else {
    const tokenBal = await getTokenBalance(creator.wallet_address, tokenMint)
    const decimals = body.decimals ?? 6
    const needed = BigInt(Math.round(body.totalAmount * Math.pow(10, decimals)))
    if (needed > tokenBal) {
      throw createError({ statusCode: 400, statusMessage: 'Not enough token balance.' })
    }
  }

  const { data: gift, error } = await db
    .from('gifts')
    .insert({
      creator_id: creator.id,
      total_amount: body.totalAmount,
      token: body.token ?? SOL_MINT,
      total_slots: body.totalSlots,
      claimed_count: 0,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return gift
})
