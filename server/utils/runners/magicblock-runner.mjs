/**
 * Standalone child-process runner for MagicBlock private send.
 *
 * Input (stdin JSON):
 *   { senderSecretKey: number[], recipientAddress: string, rawAmount: string, mint: string, rpcUrl: string }
 *
 * Output (stdout JSON):
 *   { signature } | { error: string }
 */

const MAGICBLOCK_API = 'https://payments.magicblock.app'

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const opts = JSON.parse(input)

  try {
    const { Connection, Keypair, Transaction, VersionedTransaction } = await import('@solana/web3.js')

    const senderKeypair = Keypair.fromSecretKey(new Uint8Array(opts.senderSecretKey))
    const connection = new Connection(opts.rpcUrl, 'confirmed')

    // Build unsigned transfer tx via MagicBlock API
    const res = await fetch(`${MAGICBLOCK_API}/v1/spl/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: senderKeypair.publicKey.toBase58(),
        to: opts.recipientAddress,
        amount: parseInt(opts.rawAmount),
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
      throw new Error(`MagicBlock API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const txBase64 = data.transactionBase64 ?? data.transaction
    if (!txBase64) throw new Error(`Unexpected MagicBlock response: ${JSON.stringify(data)}`)

    // MagicBlock tells us where to broadcast — "base" = Solana RPC, "ephemeral" = their validator
    const sendTo = data.sendTo ?? 'base'
    const validatorUrl = data.validator ?? opts.rpcUrl
    const broadcastRpc = sendTo === 'ephemeral' ? validatorUrl : opts.rpcUrl
    const broadcastConnection = new Connection(broadcastRpc, 'confirmed')

    // Deserialize, sign, broadcast
    // skipPreflight: true — Solana simulation doesn't have visibility into MagicBlock's
    // ephemeral state, so preflight always fails even when the tx would succeed on-chain.
    const txBytes = Buffer.from(txBase64, 'base64')
    let signature
    let isVersioned = false
    try { VersionedTransaction.deserialize(txBytes); isVersioned = true } catch {}

    if (isVersioned) {
      const vtx = VersionedTransaction.deserialize(txBytes)
      vtx.sign([senderKeypair])
      signature = await broadcastConnection.sendRawTransaction(vtx.serialize(), { skipPreflight: false })
    } else {
      const tx = Transaction.from(txBytes)
      // Keep MagicBlock's blockhash — don't replace it
      tx.feePayer = senderKeypair.publicKey
      tx.sign(senderKeypair)
      signature = await broadcastConnection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
    }

    // Confirm on the appropriate network
    const { blockhash: confirmBlockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    await connection.confirmTransaction({ signature, blockhash: confirmBlockhash, lastValidBlockHeight }, 'confirmed')

    // Verify on-chain success — a confirmed tx can still have a failed status
    const txResult = await connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
    if (txResult?.meta?.err) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(txResult.meta.err)}`)
    }

    process.stdout.write(JSON.stringify({ signature }))
    process.exit(0)
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err?.message ?? String(err) }))
    process.exit(1)
  }
}

main()
