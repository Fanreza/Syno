import bs58 from 'bs58'
import { privateSend, toRawAmount } from '../../utils/private-send'
import { authorizationContext } from '../../utils/privy'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    toUsername?: string
    toAddress?: string
    amount: number
    decimals?: number
    mint?: string
    inputMint?: string
    memo?: string
  }>(event)

  if (!body?.amount || body.amount <= 0)
    throw createError({ statusCode: 400, statusMessage: 'amount required' })
  if (!body.toUsername && !body.toAddress)
    throw createError({ statusCode: 400, statusMessage: 'toUsername or toAddress required' })

  const PRIVATE_SEND_MINTS = new Set([
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  ])
  const mintAddress = body.mint ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  if (!PRIVATE_SEND_MINTS.has(mintAddress))
    throw createError({ statusCode: 400, statusMessage: 'Private send only supports USDC and USDT.' })
  const decimals = body.decimals ?? 6
  const db = adminDb()

  console.log(`[private-send] start — amount=${body.amount} mint=${mintAddress} to=${body.toUsername ?? body.toAddress}`)

  const { data: sender } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!sender?.privy_wallet_id)
    throw createError({ statusCode: 400, statusMessage: 'Wallet not found' })

  console.log(`[private-send] sender wallet=${sender.wallet_address}`)

  let recipientAddress = body.toAddress ?? ''
  let recipientId: string | null = null
  if (body.toUsername) {
    const username = body.toUsername.replace(/^@/, '')
    const { data: rec } = await db
      .from('users')
      .select('id, wallet_address')
      .ilike('username', username)
      .single()
    if (!rec) throw createError({ statusCode: 404, statusMessage: 'Recipient not found' })
    recipientAddress = rec.wallet_address
    recipientId = rec.id
  }

  console.log(`[private-send] recipient wallet=${recipientAddress}`)

  const config = useRuntimeConfig()
  if (!(config as any).privyAuthorizationKey)
    throw createError({ statusCode: 500, statusMessage: 'Authorization key not configured' })

  console.log(`[private-send] checking sender balance...`)
  const { PublicKey, Connection } = await import('@solana/web3.js')
  const rpcUrl = (config as any).solanaRpcUrl || 'https://api.mainnet-beta.solana.com'
  const connection = new Connection(rpcUrl, 'confirmed')

  console.log(`[private-send] exporting private key...`)
  const privy = getPrivy()
  const { private_key } = await (privy.wallets() as any).exportPrivateKey(sender.privy_wallet_id, {
    authorization_context: { authorization_private_keys: [(config as any).privyAuthorizationKey] },
  })

  // If user pays with a different token, swap to the target mint first.
  // MagicBlock charges ~1% protocol fee on top of the send amount, so we swap
  // for amount + fee so the sender's wallet has enough to cover both.
  const MAGICBLOCK_FEE_RATE = 0.01
  const needsSwap = body.inputMint && body.inputMint !== mintAddress
  if (needsSwap) {
    console.log(`[private-send] swapping ${body.inputMint} → ${mintAddress}`)
    const totalNeeded = body.amount * (1 + MAGICBLOCK_FEE_RATE)
    const outUnits = Math.round(totalNeeded * Math.pow(10, decimals))
    const quote = await getJupiterQuote({
      inputMint: body.inputMint!,
      outputMint: mintAddress,
      amount: outUnits,
      swapMode: 'ExactOut',
      slippageBps: 100,
    })
    const swapTxBase64 = await buildJupiterSwapTx({ quote, userPublicKey: sender.wallet_address })
    const authCtx = authorizationContext()
    const swapResult = await (privy.wallets() as any).solana().signAndSendTransaction(
      sender.privy_wallet_id,
      { caip2: (config as any).solanaCaip2, transaction: swapTxBase64, ...authCtx },
    )
    const swapSig = swapResult.signature ?? swapResult.hash ?? swapResult
    console.log(`[private-send] swap signature=${swapSig}`)
    const { blockhash: swapBlockhash, lastValidBlockHeight: swapLastValid } = await connection.getLatestBlockhash('confirmed')
    await connection.confirmTransaction({ signature: swapSig as string, blockhash: swapBlockhash, lastValidBlockHeight: swapLastValid }, 'confirmed')
    console.log(`[private-send] swap confirmed, proceeding with private send`)
  }

  // Check output token balance after potential swap
  try {
    const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
    const ata = getAssociatedTokenAddressSync(new PublicKey(mintAddress), new PublicKey(sender.wallet_address))
    const acct = await connection.getTokenAccountBalance(ata)
    const senderBalance = acct.value.uiAmount ?? 0
    console.log(`[private-send] token balance=${senderBalance}`)
    if (senderBalance <= 0)
      throw createError({ statusCode: 400, statusMessage: `You don't have ${mintAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'USDT'} in your wallet.` })
    const feeBuffer = Math.max(body.amount * MAGICBLOCK_FEE_RATE, 0.000001)
    const minRequired = body.amount + feeBuffer
    if (senderBalance < minRequired)
      throw createError({ statusCode: 400, statusMessage: `Insufficient balance. Need ${minRequired.toFixed(6)} (amount + protocol fee), have ${senderBalance.toFixed(6)}.` })
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 400, statusMessage: `Token account not found. You don't have this token in your wallet.` })
  }

  const rawAmount = toRawAmount(body.amount, decimals)

  console.log(`[private-send] sending privately...`)
  const result = await privateSend({
    senderPrivyWalletSecret: bs58.decode(private_key),
    recipientAddress,
    rawAmount,
    mint: mintAddress,
    rpcUrl,
    split: 1,
    minDelayMs: 0,
    maxDelayMs: 0,
  })

  console.log(`[private-send] done — signature=${result.signature} provider=${result.provider}`)

  const { data: senderUser } = await db.from('users').select('username').eq('id', sender.id).maybeSingle()
  const senderUsername = senderUser?.username ?? 'someone'

  await db.from('payments').insert({
    sender_id: sender.id,
    receiver_id: recipientId,
    receiver_address: recipientAddress,
    amount: body.amount,
    token: 'PRIVATE',
    tx_signature: result.signature,
    status: 'confirmed',
    memo: body.memo ?? null,
  })

  if (recipientId && recipientId !== sender.id) {
    await createNotification({
      userId: recipientId,
      type: 'payment_received',
      title: 'Private payment received',
      body: `@${senderUsername} sent you ${body.amount.toFixed(4)} ${mintAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'USDT'} privately${body.memo ? ` · ${body.memo}` : ''}`,
      data: { tx_signature: result.signature },
    })
  }

  return { signature: result.signature, provider: result.provider }
})
