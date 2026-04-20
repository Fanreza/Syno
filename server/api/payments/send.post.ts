import { authorizationContext } from '../../utils/privy'
// Mainnet SPL token mints
const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // mainnet USDC
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // mainnet USDT
}

const TOKEN_DECIMALS: Record<string, number> = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    toUsername?: string
    toAddress?: string
    amount: number        // in output token units
    memo?: string
    paymentLinkId?: string
    inputToken?: string   // what payer pays with (default: SOL)
    outputToken?: string  // what receiver wants (default: SOL); triggers Jupiter if differs from inputToken
  }>(event)

  if (!body?.amount || body.amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid amount' })
  }
  if (!body.toUsername && !body.toAddress && !body.paymentLinkId) {
    throw createError({ statusCode: 400, statusMessage: 'Recipient required' })
  }

  const db = adminDb()

  const { data: sender } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!sender?.privy_wallet_id) {
    throw createError({ statusCode: 400, statusMessage: 'Sender wallet not found. Please complete registration.' })
  }

  let toAddress = body.toAddress
  let receiverId: string | null = null
  let outputToken = (body.outputToken ?? 'SOL').toUpperCase()
  const inputToken = (body.inputToken ?? 'SOL').toUpperCase()

  // Load recipient + desired output token from payment link
  if (body.paymentLinkId && !body.toAddress && !body.toUsername) {
    const { data: link } = await db
      .from('payments')
      .select('receiver_id, receiver_address, token')
      .eq('id', body.paymentLinkId)
      .eq('status', 'pending')
      .maybeSingle()
    if (!link) throw createError({ statusCode: 404, statusMessage: 'Payment link not found or already paid' })
    toAddress = link.receiver_address
    receiverId = link.receiver_id
    outputToken = (link.token ?? 'SOL').toUpperCase()
  } else if (body.toUsername) {
    const { data: recipient } = await db
      .from('users')
      .select('id, wallet_address')
      .eq('username', body.toUsername.replace(/^@/, '').toLowerCase())
      .maybeSingle()
    if (!recipient) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    toAddress = recipient.wallet_address
    receiverId = recipient.id
  } else if (body.toAddress) {
    const { data: recipient } = await db
      .from('users')
      .select('id')
      .eq('wallet_address', toAddress!)
      .maybeSingle()
    receiverId = recipient?.id ?? null
  }

  const config = useRuntimeConfig()
  const privy = getPrivy()
  let signature = ''
  let actualToken = outputToken
  let actualAmount = body.amount

  const needsSwap = inputToken !== outputToken

  if (needsSwap) {
    // ── Jupiter swap: inputToken → outputToken (ExactOut) ─────────────────
    const inMint = TOKEN_MINTS[inputToken]
    const outMint = TOKEN_MINTS[outputToken]
    if (!inMint) throw createError({ statusCode: 400, statusMessage: `Unsupported input token: ${inputToken}` })
    if (!outMint) throw createError({ statusCode: 400, statusMessage: `Unsupported output token: ${outputToken}` })

    const outDecimals = TOKEN_DECIMALS[outputToken] ?? 9
    // ExactOut: amount = exact output units receiver will receive
    const outUnits = Math.round(body.amount * Math.pow(10, outDecimals))

    let quote: any
    try {
      quote = await getJupiterQuote({
        inputMint: inMint,
        outputMint: outMint,
        amount: outUnits,
        swapMode: 'ExactOut',
        slippageBps: 100,
      })
    } catch (e: any) {
      throw createError({ statusCode: 502, statusMessage: `Jupiter quote failed: ${e.message}` })
    }

    let swapTxBase64: string
    try {
      swapTxBase64 = await buildJupiterSwapTx({
        quote,
        userPublicKey: sender.wallet_address,
        destinationWallet: toAddress,  // ATA derived automatically inside buildJupiterSwapTx
      })
    } catch (e: any) {
      throw createError({ statusCode: 502, statusMessage: `Jupiter swap build failed: ${e.message}` })
    }

    const result = await (privy.wallets() as any).solana().signAndSendTransaction(
      sender.privy_wallet_id,
      { caip2: config.solanaCaip2, transaction: swapTxBase64, ...authorizationContext() }
    )
    signature = result.signature ?? result.hash ?? result
    actualToken = outputToken
    actualAmount = Number(quote.outAmount) / Math.pow(10, outDecimals)
  } else if (outputToken !== 'SOL') {
    // Direct SPL transfer (same token, non-SOL) — not yet implemented
    throw createError({ statusCode: 400, statusMessage: `Direct ${outputToken} transfer not supported. Choose a different input token to trigger Jupiter swap.` })
  } else {
    // ── Direct SOL transfer ────────────────────────────────────────────────
    const txBase64 = await buildTransferSolTx(sender.wallet_address, toAddress!, body.amount)
    const result = await (privy.wallets() as any).solana().signAndSendTransaction(
      sender.privy_wallet_id,
      { caip2: config.solanaCaip2, transaction: txBase64, ...authorizationContext() }
    )
    signature = result.signature ?? result.hash ?? result
  }

  // Record / update payment
  if (body.paymentLinkId) {
    const { data: link } = await db.from('payments')
      .update({ sender_id: sender.id, status: 'confirmed', tx_signature: signature })
      .eq('id', body.paymentLinkId)
      .eq('status', 'pending')
      .select('split_participant_id')
      .maybeSingle()

    if (link?.split_participant_id) {
      await db.from('split_participants')
        .update({ status: 'paid', tx_signature: signature, paid_at: new Date().toISOString() })
        .eq('id', link.split_participant_id)
    }
  } else {
    await db.from('payments').insert({
      sender_id: sender.id,
      receiver_id: receiverId,
      receiver_address: toAddress,
      amount: actualAmount,
      token: actualToken,
      status: 'confirmed',
      tx_signature: signature,
      memo: body.memo ?? null,
    })
  }

  return { signature, amount: actualAmount, token: actualToken, toAddress }
})
