export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ mint: string; amount: number; decimals: number; inputMint?: string }>(event)

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

  const config = useRuntimeConfig()
  const privy = getPrivy()
  const apiKey = (config as any).jupiterApiKey || process.env.JUPITER_API_KEY || ''
  const headers: Record<string, string> = apiKey ? { 'x-api-key': apiKey } : {}

  const inputMint = body.inputMint ?? body.mint
  const vaultMint = body.mint
  const rawAmount = Math.round(body.amount * Math.pow(10, body.decimals))

  // Step 1: if user is paying with a different token, swap it to the vault token first
  if (inputMint !== vaultMint) {
    const quote = await getJupiterQuote({
      inputMint,
      outputMint: vaultMint,
      amount: rawAmount,
      swapMode: 'ExactIn',
    })
    const swapTx = await buildJupiterSwapTx({ quote, userPublicKey: me.wallet_address })
    await (privy.wallets() as any).solana().signAndSendTransaction(
      me.privy_wallet_id,
      { caip2: config.solanaCaip2, transaction: { encoding: 'base64', serializedTransaction: swapTx } }
    )
    // Use the output amount from the swap as the deposit amount
    const depositRaw = quote.outAmount
    const res = await $fetch<{ transaction: string }>('https://api.jup.ag/lend/v1/earn/deposit', {
      method: 'POST',
      headers,
      body: { asset: vaultMint, signer: me.wallet_address, amount: depositRaw },
    })
    const result = await (privy.wallets() as any).solana().signAndSendTransaction(
      me.privy_wallet_id,
      { caip2: config.solanaCaip2, transaction: { encoding: 'base64', serializedTransaction: res.transaction } }
    )
    return { signature: result.signature ?? result.hash ?? result }
  }

  // Step 2: direct deposit — same token
  const res = await $fetch<{ transaction: string }>('https://api.jup.ag/lend/v1/earn/deposit', {
    method: 'POST',
    headers,
    body: { asset: vaultMint, signer: me.wallet_address, amount: String(rawAmount) },
  })

  const result = await (privy.wallets() as any).solana().signAndSendTransaction(
    me.privy_wallet_id,
    { caip2: config.solanaCaip2, transaction: { encoding: 'base64', serializedTransaction: res.transaction } }
  )

  return { signature: result.signature ?? result.hash ?? result }
})
