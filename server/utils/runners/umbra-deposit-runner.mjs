/**
 * Umbra deposit-only runner.
 * Creates a self-claimable UTXO from sender's public ATA with destinationAddress = recipient.
 *
 * Input (stdin JSON):
 *   { senderSecretKey: number[], recipientAddress: string, rawAmount: string, mint: string, rpcUrl: string, network: string }
 *
 * Output (stdout JSON):
 *   { depositSignature: string, createUtxoSignature: string } | { error: string }
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
    } = await import('@umbra-privacy/sdk')

    const {
      getUserRegistrationProver,
      getCreateSelfClaimableUtxoFromPublicBalanceProver,
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

    process.stderr.write('[umbra-deposit] registering sender...\n')
    const registrationProver = getUserRegistrationProver()
    const register = getUserRegistrationFunction({ client }, { zkProver: registrationProver })
    await register({ confidential: true, anonymous: true })

    process.stderr.write('[umbra-deposit] creating UTXO...\n')
    const createProver = getCreateSelfClaimableUtxoFromPublicBalanceProver()
    const createUtxo = getPublicBalanceToSelfClaimableUtxoCreatorFunction(
      { client },
      { zkProver: createProver }
    )

    const createResult = await createUtxo({
      destinationAddress: opts.recipientAddress,
      mint: opts.mint,
      amount: BigInt(opts.rawAmount),
    })

    process.stderr.write('[umbra-deposit] createResult: ' + JSON.stringify(createResult, (_k, v) => typeof v === 'bigint' ? v.toString() : v) + '\n')

    const depositSignature = createResult.createProofAccountSignature ?? ''
    const createUtxoSignature = createResult.createUtxoSignature ?? ''

    process.stderr.write('[umbra-deposit] done — depositSignature=' + depositSignature + '\n')

    process.stdout.write(JSON.stringify({ depositSignature, createUtxoSignature }))
    process.exit(0)
  } catch (err) {
    const detail = err?.logs ? `${err.message}\nLogs: ${err.logs.join('\n')}` : (err?.message ?? String(err))
    process.stdout.write(JSON.stringify({ error: detail }))
    process.exit(1)
  }
}

main()
