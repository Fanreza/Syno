import { authorizationContext } from '../../utils/privy'
import { getConnection } from '../../utils/solana'
import { VersionedTransaction } from '@solana/web3.js'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ mint: string; amount: number; decimals: number; jlShares?: string; positionBalance?: number; isMax?: boolean }>(event)

  if (!body?.mint || !body?.amount || body.amount <= 0 || !body.jlShares) {
    throw createError({ statusCode: 400, statusMessage: 'mint, amount, and jlShares required' })
  }

  const db = adminDb()
  const { data: me } = await db
    .from('users')
    .select('wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me?.privy_wallet_id) throw createError({ statusCode: 400, statusMessage: 'Wallet not found' })

  const config = useRuntimeConfig()
  const apiKey = (config as any).jupiterApiKey || process.env.JUPITER_API_KEY || ''
  const headers: Record<string, string> = apiKey ? { 'x-api-key': apiKey } : {}

  // Jupiter Lend withdraw expects shares (jlToken amount), not underlying amount.
  // Use the exact jlShares from the position when withdrawing the full balance,
  // or scale proportionally for partial withdrawals.
  // Withdraw uses shares (jlToken amount).
  // For full withdrawal, use u64::MAX (18446744073709551615) — standard Solana "close position" sentinel.
  // Jupiter Lend interprets this as "withdraw all shares".
  const totalShares = BigInt(body.jlShares!)
  const U64_MAX = '18446744073709551615'
  const sharesAmount = body.isMax
    ? U64_MAX
    : String(BigInt(Math.floor(Number(totalShares) * (body.amount / (body.positionBalance ?? body.amount)))))

  const res = await $fetch<{ transaction: string }>('https://api.jup.ag/lend/v1/earn/withdraw', {
    method: 'POST',
    headers,
    body: { asset: body.mint, signer: me.wallet_address, amount: sharesAmount },
  })

  const connection = getConnection()
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

  const buf = Buffer.from(res.transaction, 'base64')
  let serializedTx: string
  try {
    const tx = VersionedTransaction.deserialize(buf)
    tx.message.recentBlockhash = blockhash
    serializedTx = Buffer.from(tx.serialize()).toString('base64')
  } catch {
    const { Transaction } = await import('@solana/web3.js')
    const tx = Transaction.from(buf)
    tx.recentBlockhash = blockhash
    serializedTx = Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString('base64')
  }

  const privy = getPrivy()
  const signResponse = await (privy.wallets() as any).solana().signTransaction(
    me.privy_wallet_id,
    { transaction: serializedTx, ...authorizationContext() }
  )

  const signedBytes = Buffer.from(signResponse.signed_transaction as string, 'base64')
  const signature = await connection.sendRawTransaction(signedBytes, { skipPreflight: false })
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

  return { signature }
})
