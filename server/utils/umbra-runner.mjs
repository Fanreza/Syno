/**
 * Standalone child-process runner for Umbra private send.
 * Runs outside Nitro to avoid any bundler/module issues.
 *
 * Input (stdin JSON):
 *   { senderSecretKey: number[], recipientAddress: string, rawAmount: string, mint: string, rpcUrl: string, network: string }
 *
 * Output (stdout JSON):
 *   { depositSignature, withdrawSignature } | { error: string }
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
      getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
      getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
    } = await import('@umbra-privacy/sdk')

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

    // Register sender (idempotent — safe to call every time)
    const register = getUserRegistrationFunction({ client })
    await register({ confidential: true, anonymous: false })

    // Deposit into sender's encrypted balance
    const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client })
    const rawAmount = BigInt(opts.rawAmount)
    const depositResult = await deposit(signer.address, opts.mint, rawAmount)

    // Withdraw from sender's encrypted balance directly to recipient's public ATA
    const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client })
    const withdrawResult = await withdraw(opts.recipientAddress, opts.mint, rawAmount)

    process.stdout.write(JSON.stringify({
      depositSignature: depositResult.callbackSignature ?? depositResult.queueSignature,
      withdrawSignature: withdrawResult.callbackSignature ?? withdrawResult.queueSignature,
    }))
    process.exit(0)
  } catch (err) {
    const detail = err?.logs ? `${err.message}\nLogs: ${err.logs.join('\n')}` : (err?.message ?? String(err))
    process.stdout.write(JSON.stringify({ error: detail, stack: err?.stack?.slice(0, 500) }))
    process.exit(1)
  }
}

main()
