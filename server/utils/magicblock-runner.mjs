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
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`MagicBlock API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const txBase64 = data.transactionBase64 ?? data.transaction ?? data
    const sendTo = data.sendTo ?? opts.rpcUrl

    // Deserialize, sign, broadcast
    const txBytes = Buffer.from(txBase64, 'base64')

    let signature
    try {
      // Try versioned first
      const vtx = VersionedTransaction.deserialize(txBytes)
      vtx.sign([senderKeypair])
      signature = await connection.sendRawTransaction(vtx.serialize(), { skipPreflight: false })
    } catch {
      // Fall back to legacy
      const tx = Transaction.from(txBytes)
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = senderKeypair.publicKey
      tx.sign(senderKeypair)
      signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
    }

    await connection.confirmTransaction(signature, 'confirmed')

    process.stdout.write(JSON.stringify({ signature }))
    process.exit(0)
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err?.message ?? String(err) }))
    process.exit(1)
  }
}

main()
