import { authorizationContext } from '../../utils/privy'
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js'

const SOL_MINT = 'So11111111111111111111111111111111111111112'

// Known decimals for common mints — fallback to Jupiter price API for unknown tokens
const KNOWN_DECIMALS: Record<string, number> = {
  'So11111111111111111111111111111111111111112': 9,
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT
}

async function getTokenDecimals(mint: string): Promise<number> {
  if (KNOWN_DECIMALS[mint] !== undefined) return KNOWN_DECIMALS[mint]
  try {
    const res = await $fetch<any>(`https://tokens.jup.ag/token/${mint}`)
    return res?.decimals ?? 6
  } catch {
    return 6
  }
}

async function signAndBroadcast(
  privy: any,
  walletId: string,
  txBase64: string,
  connection: Connection,
  blockhash: string,
  lastValidBlockHeight: number,
  authCtx: object
): Promise<string> {
  const signed = await privy.wallets().solana().signTransaction(walletId, { transaction: txBase64, ...authCtx })
  const buf = Buffer.from(signed.signed_transaction, 'base64')
  let tx: Transaction | VersionedTransaction
  try { tx = VersionedTransaction.deserialize(buf) } catch { tx = Transaction.from(buf) }
  const sig = await connection.sendRawTransaction(
    tx instanceof VersionedTransaction ? tx.serialize() : (tx as Transaction).serialize(),
    { skipPreflight: false, preflightCommitment: 'confirmed' }
  )
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
  return sig
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    toUsername?: string
    toAddress?: string
    amount: number
    memo?: string
    paymentLinkId?: string
    inputToken?: string  // mint address of token sender is paying with (default: SOL mint)
    outputToken?: string // mint address receiver wants (only from payment links)
    decimals?: number    // optional hint from frontend
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
  const inputMint = body.inputToken ?? SOL_MINT
  // outputMint defaults to inputMint — only payment links can specify a different output
  let outputMint = body.outputToken ?? inputMint

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
    // payment links store mint address in token column
    outputMint = link.token ?? SOL_MINT
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
  const authCtx = authorizationContext()
  let signature = ''
  let actualToken = outputMint
  let actualAmount = body.amount

  const needsSwap = inputMint !== outputMint

  if (needsSwap) {
    // ── Jupiter swap: payer pays with inputMint, receiver gets outputMint ──
    const outDecimals = body.decimals ?? await getTokenDecimals(outputMint)
    const outUnits = Math.round(body.amount * Math.pow(10, outDecimals))

    let quote: any
    try {
      quote = await getJupiterQuote({
        inputMint,
        outputMint,
        amount: outUnits,
        swapMode: 'ExactOut',
        slippageBps: 100,
      })
    } catch (e: any) {
      throw createError({ statusCode: 502, statusMessage: `Jupiter quote failed: ${e.message}` })
    }

    let swapTxBase64: string
    try {
      swapTxBase64 = await buildJupiterSwapTx({ quote, userPublicKey: sender.wallet_address, destinationWallet: toAddress })
    } catch (e: any) {
      throw createError({ statusCode: 502, statusMessage: `Jupiter swap build failed: ${e.message}` })
    }

    // Jupiter returns a transaction with fresh blockhash — use signAndSendTransaction directly
    const result = await (privy.wallets() as any).solana().signAndSendTransaction(
      sender.privy_wallet_id,
      { caip2: config.solanaCaip2, transaction: swapTxBase64, ...authCtx }
    )
    signature = result.signature ?? result.hash ?? result
    actualAmount = Number(quote.outAmount) / Math.pow(10, outDecimals)

  } else if (inputMint === SOL_MINT) {
    // ── Direct SOL transfer ────────────────────────────────────────────────
    const connection = new Connection(config.solanaRpcUrl, 'confirmed')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    const txBase64 = await buildTransferSolTx(sender.wallet_address, toAddress!, body.amount, blockhash)
    signature = await signAndBroadcast(privy, sender.privy_wallet_id, txBase64, connection, blockhash, lastValidBlockHeight, authCtx)

  } else {
    // ── Direct SPL transfer (any token: USDC, USDT, JUP, etc.) ────────────
    const decimals = body.decimals ?? await getTokenDecimals(inputMint)
    const connection = new Connection(config.solanaRpcUrl, 'confirmed')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    const txBase64 = await buildTransferSplTx(sender.wallet_address, toAddress!, inputMint, body.amount, decimals, blockhash)
    signature = await signAndBroadcast(privy, sender.privy_wallet_id, txBase64, connection, blockhash, lastValidBlockHeight, authCtx)
  }

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
