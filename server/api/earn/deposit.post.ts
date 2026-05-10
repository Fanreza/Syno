import BN from 'bn.js'
import { VersionedTransaction } from '@solana/web3.js'
import { authorizationContext } from '../../utils/privy'
import { buildEarnDepositTx } from '../../utils/jupiter-lend'
import { getConnection, getTokenBalance } from '../../utils/solana'

async function signAndBroadcastLendTx(privy: any, walletId: string, base64Tx: string): Promise<string> {
  const connection = getConnection()
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

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

  const decimals = body.decimals ?? 6
  const rawAmount = Math.round(body.amount * Math.pow(10, decimals))
  const isSwap = body.inputMint && body.inputMint !== body.mint
  // Only enforce minimum on direct deposits — swap path output amount is validated by Jupiter Earn itself
  if (!isSwap) {
    const MIN_RAW = Math.pow(10, Math.max(decimals - 2, 0)) // 0.01 vault tokens minimum
    if (rawAmount < MIN_RAW) {
      const minHuman = (MIN_RAW / Math.pow(10, decimals)).toFixed(2)
      throw createError({ statusCode: 400, statusMessage: `Minimum deposit is ${minHuman} USDC` })
    }
  }

  const db = adminDb()
  const { data: me } = await db
    .from('users')
    .select('wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me?.privy_wallet_id) throw createError({ statusCode: 400, statusMessage: 'Wallet not found' })

  const privy = getPrivy()
  const inputMint = body.inputMint ?? body.mint
  const vaultMint = body.mint

  if (inputMint !== vaultMint) {
    const quote = await getJupiterQuote({
      inputMint,
      outputMint: vaultMint,
      amount: rawAmount,
      swapMode: 'ExactIn',
    })
    const swapTx = await buildJupiterSwapTx({ quote, userPublicKey: me.wallet_address })

    const swapConnection = getConnection()
    const { blockhash: swapBlockhash, lastValidBlockHeight: swapLastValid } = await swapConnection.getLatestBlockhash()
    const swapSignResponse = await (privy.wallets() as any).solana().signTransaction(
      me.privy_wallet_id,
      { transaction: swapTx, ...authorizationContext() }
    )
    const swapSigned = Buffer.from(swapSignResponse.signed_transaction as string, 'base64')
    const swapSig = await swapConnection.sendRawTransaction(swapSigned, { skipPreflight: false })
    await swapConnection.confirmTransaction({ signature: swapSig, blockhash: swapBlockhash, lastValidBlockHeight: swapLastValid }, 'confirmed')

    // Read post-swap balance from tx metadata to avoid RPC lag on a separate getTokenAccountBalance call
    const { PublicKey } = await import('@solana/web3.js')
    const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
    const swapTxResult = await swapConnection.getTransaction(swapSig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
    const ata = getAssociatedTokenAddressSync(new PublicKey(vaultMint), new PublicKey(me.wallet_address))
    const ataStr = ata.toBase58()
    const postBalances = swapTxResult?.meta?.postTokenBalances ?? []
    const ataEntry = postBalances.find((b: any) => b.mint === vaultMint && b.owner === me.wallet_address)
      ?? postBalances.find((b: any) => swapTxResult?.transaction?.message?.staticAccountKeys?.[b.accountIndex]?.toBase58() === ataStr)
    const depositRaw = ataEntry ? BigInt(ataEntry.uiTokenAmount.amount) : await getTokenBalance(me.wallet_address, vaultMint)

    const vaultDecimals = ataEntry ? (ataEntry.uiTokenAmount.decimals ?? 6) : 6
    const MIN_DEPOSIT_RAW = BigInt(Math.pow(10, Math.max(vaultDecimals - 1, 0))) // 0.1 vault tokens minimum
    if (depositRaw < MIN_DEPOSIT_RAW) {
      const minHuman = (Number(MIN_DEPOSIT_RAW) / Math.pow(10, vaultDecimals)).toFixed(1)
      throw createError({ statusCode: 400, statusMessage: `Swap output too small to deposit. Minimum is ${minHuman} tokens — try a larger amount.` })
    }

    const depositTx = await buildEarnDepositTx(me.wallet_address, vaultMint, new BN(depositRaw.toString()))
    const signature = await signAndBroadcastLendTx(privy, me.privy_wallet_id, depositTx)
    return { signature }
  }

  const depositTx = await buildEarnDepositTx(me.wallet_address, vaultMint, new BN(String(rawAmount)))
  const signature = await signAndBroadcastLendTx(privy, me.privy_wallet_id, depositTx)
  return { signature }
})
