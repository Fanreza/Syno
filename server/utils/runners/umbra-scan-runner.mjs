/**
 * Scan Umbra indexer for claimable UTXOs belonging to this signer.
 *
 * Input (stdin JSON):
 *   { senderSecretKey: number[], rpcUrl: string, network: string }
 *
 * Output (stdout JSON):
 *   { utxos: Array<{ amount, destinationAddress, insertionIndex, status }> }
 */

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const opts = JSON.parse(input)

  try {
    const {
      createSignerFromPrivateKeyBytes,
      getUmbraClient,
      getClaimableUtxoScannerFunction,
    } = await import('@umbra-privacy/sdk')

    const signer = await createSignerFromPrivateKeyBytes(new Uint8Array(opts.senderSecretKey))
    const rpcUrl = opts.rpcUrl
    const rpcSubscriptionsUrl = rpcUrl.replace(/^https/, 'wss').replace(/^http/, 'ws')

    const client = await getUmbraClient({
      signer,
      network: opts.network ?? 'mainnet',
      rpcUrl,
      rpcSubscriptionsUrl,
      indexerApiEndpoint: 'https://utxo-indexer.api.umbraprivacy.com',
      deferMasterSeedSignature: false,
    })

    const scan = getClaimableUtxoScannerFunction({ client })
    const scanResult = await scan(0n, 0n)

    const utxos = [
      ...(scanResult.publicSelfBurnable ?? []).map(u => ({ ...u, bucket: 'publicSelfBurnable' })),
      ...(scanResult.selfBurnable ?? []).map(u => ({ ...u, bucket: 'selfBurnable' })),
    ].map(u => ({
      insertionIndex: u.insertionIndex?.toString(),
      amount: u.amount?.toString(),
      destinationAddress: u.destinationAddress,
      bucket: u.bucket,
    })).sort((a, b) => Number(b.insertionIndex) - Number(a.insertionIndex))

    process.stdout.write(JSON.stringify({ utxos }))
    process.exit(0)
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err?.message ?? String(err) }))
    process.exit(1)
  }
}

main()
