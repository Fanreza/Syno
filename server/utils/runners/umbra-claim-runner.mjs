/**
 * Umbra claim-only runner.
 * Scans for claimable UTXOs and claims the latest one.
 * Called by background poller — not part of the user-facing request.
 *
 * Input (stdin JSON):
 *   { senderSecretKey: number[], rpcUrl: string, network: string }
 *
 * Output (stdout JSON):
 *   { claimed: number, signatures: string[] } | { error: string }
 */

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const opts = JSON.parse(input)

  try {
    const {
      createSignerFromPrivateKeyBytes,
      getUmbraClient,
      getSelfClaimableUtxoToPublicBalanceClaimerFunction,
      getClaimableUtxoScannerFunction,
      getUmbraRelayer,
    } = await import('@umbra-privacy/sdk')

    const {
      getClaimSelfClaimableUtxoIntoPublicBalanceProver,
    } = await import('@umbra-privacy/web-zk-prover')

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

    process.stderr.write('[umbra-claim] scanning for claimable UTXOs...\n')
    const scan = getClaimableUtxoScannerFunction({ client })
    const scanResult = await scan(0n, 0n)
    const all = [
      ...(scanResult.publicSelfBurnable ?? []),
      ...(scanResult.selfBurnable ?? []),
    ]

    process.stderr.write('[umbra-claim] found ' + all.length + ' UTXOs\n')

    if (all.length === 0) {
      process.stdout.write(JSON.stringify({ claimed: 0, signatures: [] }))
      process.exit(0)
    }

    // Claim one at a time (latest first) to avoid ZK proof timeout
    const utxo = all.sort((a, b) => Number(b.insertionIndex) - Number(a.insertionIndex))[0]
    process.stderr.write('[umbra-claim] claiming insertionIndex=' + utxo.insertionIndex + ' amount=' + utxo.amount + ' dest=' + utxo.destinationAddress + '\n')

    const relayer = getUmbraRelayer({ apiEndpoint: 'https://relayer.api.umbraprivacy.com' })
    const claimProver = getClaimSelfClaimableUtxoIntoPublicBalanceProver()
    const claim = getSelfClaimableUtxoToPublicBalanceClaimerFunction(
      { client },
      { zkProver: claimProver, relayer, fetchBatchMerkleProof: client.fetchBatchMerkleProof }
    )

    const claimResult = await claim([utxo])
    process.stderr.write('[umbra-claim] claimResult: ' + JSON.stringify(claimResult, (_k, v) => typeof v === 'bigint' ? v.toString() : v) + '\n')

    const signaturesMap = claimResult.signatures ?? claimResult.batches ?? {}
    const firstBatch = Object.values(signaturesMap)[0]
    const sig = (Array.isArray(firstBatch) ? firstBatch[0] : firstBatch?.signatures?.[0] ?? firstBatch?.signature) ?? ''

    process.stdout.write(JSON.stringify({
      claimed: 1,
      signatures: sig ? [sig] : [],
      insertionIndex: utxo.insertionIndex?.toString(),
      destinationAddress: utxo.destinationAddress,
      amount: utxo.amount?.toString(),
    }))
    process.exit(0)
  } catch (err) {
    const detail = err?.logs ? `${err.message}\nLogs: ${err.logs.join('\n')}` : (err?.message ?? String(err))
    process.stdout.write(JSON.stringify({ error: detail }))
    process.exit(1)
  }
}

main()
