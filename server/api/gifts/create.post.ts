export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    totalAmount: number
    totalSlots: number
    token?: string
  }>(event)

  if (!body?.totalAmount || !body?.totalSlots || body.totalAmount <= 0 || body.totalSlots < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid gift parameters' })
  }

  const db = adminDb()
  const privy = getPrivy()

  const { data: creator } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!creator) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  // Create a dedicated pool wallet for this gift
  const poolWalletRes = await (privy.wallets() as any).create({ chain_type: 'solana' })
  const poolWalletId: string = poolWalletRes.id
  const poolWalletAddress: string = poolWalletRes.address

  // Fund the pool wallet from the creator's wallet
  const txBase64 = await buildTransferSolTx(creator.wallet_address, poolWalletAddress, body.totalAmount)
  const config = useRuntimeConfig()
  await (privy.wallets() as any).solana().signAndSendTransaction(creator.privy_wallet_id, {
    caip2: config.solanaCaip2,
    transaction: { encoding: 'base64', serializedTransaction: txBase64 }
  })

  const { data: gift, error } = await db
    .from('gifts')
    .insert({
      creator_id: creator.id,
      pool_wallet: poolWalletAddress,
      pool_privy_wallet_id: poolWalletId,
      total_amount: body.totalAmount,
      token: body.token ?? 'So11111111111111111111111111111111111111112',
      total_slots: body.totalSlots,
      claimed_count: 0
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return gift
})
