import { Keypair, Connection, Transaction, VersionedTransaction } from '@solana/web3.js'

const MAGICBLOCK_API = 'https://payments.magicblock.app'

export function toRawAmount(amount: number, decimals: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, decimals)))
}

export interface PrivateSendOpts {
  senderPrivyWalletSecret: Uint8Array
  recipientAddress: string
  rawAmount: bigint
  mint: string
  rpcUrl: string
  split?: number
  minDelayMs?: number
  maxDelayMs?: number
}

export interface PrivateSendResult {
  signature: string
  provider: 'magicblock'
}

export async function privateSend(opts: PrivateSendOpts): Promise<PrivateSendResult> {
  const senderKeypair = Keypair.fromSecretKey(opts.senderPrivyWalletSecret)
  const connection = new Connection(opts.rpcUrl, 'confirmed')

  const res = await fetch(`${MAGICBLOCK_API}/v1/spl/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: senderKeypair.publicKey.toBase58(),
      to: opts.recipientAddress,
      amount: Number(opts.rawAmount),
      mint: opts.mint,
      visibility: 'private',
      fromBalance: 'base',
      toBalance: 'base',
      initIfMissing: true,
      initAtasIfMissing: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw createError({ statusCode: 502, statusMessage: `MagicBlock API error ${res.status}: ${err}` })
  }

  const data = await res.json()
  const txBase64 = data.transactionBase64 ?? data.transaction
  if (!txBase64) throw createError({ statusCode: 502, statusMessage: `Unexpected MagicBlock response: ${JSON.stringify(data)}` })

  const sendTo = data.sendTo ?? 'base'
  const validatorUrl = data.validator ?? opts.rpcUrl
  const broadcastRpc = sendTo === 'ephemeral' ? validatorUrl : opts.rpcUrl
  const broadcastConnection = new Connection(broadcastRpc, 'confirmed')

  const txBytes = Buffer.from(txBase64, 'base64')
  let signature: string
  let isVersioned = false
  try { VersionedTransaction.deserialize(txBytes); isVersioned = true } catch {}

  if (isVersioned) {
    const vtx = VersionedTransaction.deserialize(txBytes)
    vtx.sign([senderKeypair])
    signature = await broadcastConnection.sendRawTransaction(vtx.serialize(), { skipPreflight: false })
  } else {
    const tx = Transaction.from(txBytes)
    tx.feePayer = senderKeypair.publicKey
    tx.sign(senderKeypair)
    signature = await broadcastConnection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

  const txResult = await connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
  if (txResult?.meta?.err) {
    throw createError({ statusCode: 502, statusMessage: `Transaction failed on-chain: ${JSON.stringify(txResult.meta.err)}` })
  }

  return { signature, provider: 'magicblock' }
}
