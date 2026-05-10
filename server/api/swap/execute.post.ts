import { authorizationContext } from '../../utils/privy'
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    inputMint: string
    outputMint: string
    amount: number
    inputDecimals: number
    slippageBps?: number
  }>(event)

  if (!body?.inputMint || !body?.outputMint || !body?.amount) {
    throw createError({ statusCode: 400, statusMessage: 'inputMint, outputMint, amount required' })
  }

  const db = adminDb()
  const { data: user } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!user?.privy_wallet_id) throw createError({ statusCode: 400, statusMessage: 'Wallet not found' })

  const rawAmount = Math.round(body.amount * Math.pow(10, body.inputDecimals))

  const feeAccount = getJupiterFeeAccount(body.outputMint)
  const quote = await getJupiterQuote({
    inputMint: body.inputMint,
    outputMint: body.outputMint,
    amount: rawAmount,
    slippageBps: body.slippageBps ?? 50,
    swapMode: 'ExactIn',
    platformFeeBps: feeAccount ? 10 : undefined,
  })

  const swapTx = await buildJupiterSwapTx({ quote, userPublicKey: user.wallet_address, feeAccount })

  const config = useRuntimeConfig()
  const privy = getPrivy()
  const authCtx = authorizationContext()

  const signed = await (privy.wallets() as any).solana().signTransaction(
    user.privy_wallet_id,
    { transaction: swapTx, ...authCtx }
  )

  const buf = Buffer.from(signed.signed_transaction, 'base64')
  let tx: Transaction | VersionedTransaction
  try { tx = VersionedTransaction.deserialize(buf) } catch { tx = Transaction.from(buf) }

  const connection = new Connection(config.solanaRpcUrl as string, 'confirmed')
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

  const signature = await connection.sendRawTransaction(
    tx instanceof VersionedTransaction ? tx.serialize() : (tx as Transaction).serialize(),
    { skipPreflight: false, preflightCommitment: 'confirmed' }
  )
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

  return {
    signature,
    inputMint: body.inputMint,
    outputMint: body.outputMint,
    inAmount: quote.inAmount,
    outAmount: quote.outAmount,
  }
})
