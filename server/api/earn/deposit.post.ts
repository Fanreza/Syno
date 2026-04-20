import { authorizationContext } from '../../utils/privy'
import { getTokenBalance, getConnection } from '../../utils/solana'
import { VersionedTransaction } from '@solana/web3.js'

async function signAndBroadcastLendTx(privy: any, walletId: string, base64Tx: string): Promise<string> {
  const connection = getConnection()
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

  // Rebuild tx with fresh blockhash using decompile — Jupiter Lend tx is legacy, not versioned
  const buf = Buffer.from(base64Tx, 'base64')
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

  // Sign only — we broadcast ourselves so we control timing
  const signResponse = await (privy.wallets() as any).solana().signTransaction(walletId, {
    transaction: serializedTx,
    ...authorizationContext(),
  })

  const signedBytes = Buffer.from(signResponse.signed_transaction as string, 'base64')
  const signature = await connection.sendRawTransaction(signedBytes, { skipPreflight: false })
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
  return signature
}

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

  // Step 1: swap first if paying with different token
  if (inputMint !== vaultMint) {
    const quote = await getJupiterQuote({
      inputMint,
      outputMint: vaultMint,
      amount: rawAmount,
      swapMode: 'ExactIn',
    })
    const swapTx = await buildJupiterSwapTx({ quote, userPublicKey: me.wallet_address })

    // Sign + broadcast swap ourselves so we can await confirmation before querying balance
    const swapConnection = getConnection()
    const { blockhash: swapBlockhash, lastValidBlockHeight: swapLastValid } = await swapConnection.getLatestBlockhash()
    const swapSignResponse = await (privy.wallets() as any).solana().signTransaction(
      me.privy_wallet_id,
      { transaction: swapTx, ...authorizationContext() }
    )
    const swapSigned = Buffer.from(swapSignResponse.signed_transaction as string, 'base64')
    const swapSig = await swapConnection.sendRawTransaction(swapSigned, { skipPreflight: false })
    await swapConnection.confirmTransaction({ signature: swapSig, blockhash: swapBlockhash, lastValidBlockHeight: swapLastValid }, 'confirmed')

    const depositRaw = String(await getTokenBalance(me.wallet_address, vaultMint))
    const res = await $fetch<{ transaction: string }>('https://api.jup.ag/lend/v1/earn/deposit', {
      method: 'POST',
      headers,
      body: { asset: vaultMint, signer: me.wallet_address, amount: depositRaw },
    })
    const signature = await signAndBroadcastLendTx(privy, me.privy_wallet_id, res.transaction)
    return { signature }
  }

  // Step 2: direct deposit — same token
  const res = await $fetch<{ transaction: string }>('https://api.jup.ag/lend/v1/earn/deposit', {
    method: 'POST',
    headers,
    body: { asset: vaultMint, signer: me.wallet_address, amount: String(rawAmount) },
  })

  const signature = await signAndBroadcastLendTx(privy, me.privy_wallet_id, res.transaction)
  return { signature }
})
