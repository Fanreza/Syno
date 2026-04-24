/**
 * Umbra private send runner.
 *
 * Flow: create self-claimable UTXO from sender's public ATA with destination = recipient
 *       → scan for the new UTXO → sender claims it → tokens land in recipient's ATA
 *       Recipient does not need to be registered with Umbra.
 *
 * Input (stdin JSON):
 *   { senderSecretKey: number[], recipientAddress: string, rawAmount: string, mint: string, rpcUrl: string, network: string }
 *
 * Output (stdout JSON):
 *   { signature, depositSignature, withdrawSignature } | { error: string }
 */

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const opts = JSON.parse(input)

  try {
    const {
      createSignerFromPrivateKeyBytes,
      getUmbraClient,
      getUserRegistrationFunction,
      getPublicBalanceToSelfClaimableUtxoCreatorFunction,
      getSelfClaimableUtxoToPublicBalanceClaimerFunction,
      getClaimableUtxoScannerFunction,
      getUmbraRelayer,
    } = await import('@umbra-privacy/sdk')

    const {
      getUserRegistrationProver,
      getCreateSelfClaimableUtxoFromPublicBalanceProver,
      getClaimSelfClaimableUtxoIntoPublicBalanceProver,
    } = await import('@umbra-privacy/web-zk-prover')

    const signer = await createSignerFromPrivateKeyBytes(
      new Uint8Array(opts.senderSecretKey)
    )

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

    process.stderr.write('[umbra] step 1/4: registering sender...\n')
    const registrationProver = getUserRegistrationProver()
    const register = getUserRegistrationFunction({ client }, { zkProver: registrationProver })
    await register({ confidential: true, anonymous: true })
    process.stderr.write('[umbra] step 1/4: done\n')

    const rawAmount = BigInt(opts.rawAmount)

    process.stderr.write('[umbra] step 2/4: creating UTXO (deposit)...\n')
    const createProver = getCreateSelfClaimableUtxoFromPublicBalanceProver()
    const createUtxo = getPublicBalanceToSelfClaimableUtxoCreatorFunction(
      { client },
      { zkProver: createProver }
    )

    const createResult = await createUtxo({
      destinationAddress: opts.recipientAddress,
      mint: opts.mint,
      amount: rawAmount,
    })

    process.stderr.write('[umbra] createResult: ' + JSON.stringify(createResult, (_k, v) => typeof v === 'bigint' ? v.toString() : v) + '\n')
    const depositSignature = createResult.signature ?? createResult.txSignature ?? createResult.txHash ?? Object.values(createResult).find(v => typeof v === 'string' && v.length > 40) ?? ''
    process.stderr.write('[umbra] step 2/4: done, depositSignature=' + depositSignature + '\n')

    process.stderr.write('[umbra] step 3/4: polling indexer for claimable UTXO...\n')
    const scan = getClaimableUtxoScannerFunction({ client })
    let claimableUtxos = []
    const pollInterval = 5000
    const pollTimeout = 180_000
    const pollStart = Date.now()
    while (Date.now() - pollStart < pollTimeout) {
      await new Promise(r => setTimeout(r, pollInterval))
      try {
        const scanResult = await scan(0n, 0n)
        const all = [
          ...(scanResult.publicSelfBurnable ?? []),
          ...(scanResult.selfBurnable ?? []),
        ]
        process.stderr.write('[umbra] poll: publicSelfBurnable=' + (scanResult.publicSelfBurnable?.length ?? 0) + ' selfBurnable=' + (scanResult.selfBurnable?.length ?? 0) + '\n')
        if (all.length > 0) {
          claimableUtxos = all
          break
        }
      } catch (e) {
        process.stderr.write('[umbra] poll error: ' + e?.message + '\n')
      }
    }

    if (claimableUtxos.length === 0) {
      throw new Error('No claimable UTXOs found after 3 minutes. Deposit signature: ' + depositSignature)
    }

    process.stderr.write('[umbra] step 3/4: found ' + claimableUtxos.length + ' UTXO(s)\n')

    // Only claim the most recently inserted UTXO (highest insertionIndex) to avoid
    // claiming all historical UTXOs from previous sessions
    claimableUtxos = claimableUtxos.sort((a, b) => Number(b.insertionIndex) - Number(a.insertionIndex)).slice(0, 1)
    process.stderr.write('[umbra] claiming only latest UTXO insertionIndex=' + claimableUtxos[0].insertionIndex + ' amount=' + claimableUtxos[0].amount + '\n')

    process.stderr.write('[umbra] step 4/4: claiming UTXO -> recipient ATA...\n')
    const relayer = getUmbraRelayer({
      apiEndpoint: 'https://relayer.api.umbraprivacy.com',
    })
    const claimProver = getClaimSelfClaimableUtxoIntoPublicBalanceProver()
    const claim = getSelfClaimableUtxoToPublicBalanceClaimerFunction(
      { client },
      { zkProver: claimProver, relayer, fetchBatchMerkleProof: client.fetchBatchMerkleProof }
    )

    const claimResult = await claim(claimableUtxos)

    process.stderr.write('[umbra] claimResult: ' + JSON.stringify(claimResult, (_k, v) => typeof v === 'bigint' ? v.toString() : v) + '\n')

    // Relayer submits the claim tx async — SDK returns { batches: {} } with no signature.
    // Treat empty batches as success; depositSignature is the canonical on-chain ref.
    const signaturesMap = claimResult.signatures ?? claimResult.batches ?? {}
    const firstBatch = Object.values(signaturesMap)[0]
    const withdrawSignature = (Array.isArray(firstBatch) ? firstBatch[0] : firstBatch?.signatures?.[0] ?? firstBatch?.signature)
      ?? claimResult.signature
      ?? claimResult.txSignature
      ?? claimResult.txHash
      ?? ''

    process.stderr.write('[umbra] step 4/4: done, withdrawSignature=' + withdrawSignature + '\n')

    process.stdout.write(JSON.stringify({
      signature: withdrawSignature || depositSignature,
      depositSignature,
      withdrawSignature,
    }))
    process.exit(0)
  } catch (err) {
    const detail = err?.logs ? `${err.message}\nLogs: ${err.logs.join('\n')}` : (err?.message ?? String(err))
    process.stdout.write(JSON.stringify({ error: detail }))
    process.exit(1)
  }
}

main()
