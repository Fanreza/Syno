import BN from 'bn.js'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ mint: string; amount: number; decimals: number }>(event)

  if (!body?.mint || !body?.amount || body.amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'mint and amount required' })
  }

  const db = adminDb()
  const { data: me } = await db
    .from('users')
    .select('wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me?.privy_wallet_id) throw createError({ statusCode: 400, statusMessage: 'Wallet not found' })

  const amountBN = new BN(Math.round(body.amount * Math.pow(10, body.decimals)))
  const txBase64 = await buildEarnWithdrawTx(me.wallet_address, body.mint, amountBN)

  const config = useRuntimeConfig()
  const privy = getPrivy()
  const result = await (privy.wallets() as any).solana().signAndSendTransaction(
    me.privy_wallet_id,
    { caip2: config.solanaCaip2, transaction: { encoding: 'base64', serializedTransaction: txBase64 } }
  )

  return { signature: result.signature ?? result.hash ?? result }
})
