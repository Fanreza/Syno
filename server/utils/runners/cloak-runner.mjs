/**
 * Cloak private send runner.
 *
 * Input (stdin JSON):
 *   { senderSecretKey: number[], recipientAddress: string, rawAmount: string, mint: string, rpcUrl: string }
 *
 * Output (stdout JSON):
 *   { signature, depositSignature, withdrawSignature } | { error: string }
 *
 * Flow: transact() (deposit into shielded pool) → fullWithdraw() (to recipient public address)
 * Min send: ~10 USDC (fixed fee of 5 USDC + 0.3% variable)
 */

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const opts = JSON.parse(input)

  try {
    const { Connection, Keypair, PublicKey } = await import('@solana/web3.js')
    const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
    const {
      transact,
      fullWithdraw,
      getShieldPoolPDAs,
      generateNote,
      CLOAK_PROGRAM_ID,
      isWithdrawAmountSufficient,
    } = await import('@cloak.dev/sdk')

    const senderKeypair = Keypair.fromSecretKey(new Uint8Array(opts.senderSecretKey))
    const connection = new Connection(opts.rpcUrl, 'confirmed')
    const programId = CLOAK_PROGRAM_ID
    const mint = new PublicKey(opts.mint)
    const rawAmount = BigInt(opts.rawAmount)

    if (!isWithdrawAmountSufficient(rawAmount)) {
      throw new Error(`Amount too small for Cloak. Min ~10 USDC after fees.`)
    }

    // Generate a fresh UTXO keypair for this send
    const note = await generateNote(rawAmount, mint, senderKeypair.publicKey)

    // Build ALT for SPL tokens (required — tx exceeds legacy limit without it)
    const { AddressLookupTableProgram } = await import('@solana/web3.js')
    const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
    const pdas = getShieldPoolPDAs(programId, mint)
    const senderAta = getAssociatedTokenAddressSync(mint, senderKeypair.publicKey)

    let alt = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const slot = await connection.getSlot('finalized')
        const [createIx, altAddress] = AddressLookupTableProgram.createLookupTable({
          authority: senderKeypair.publicKey,
          payer: senderKeypair.publicKey,
          recentSlot: slot,
        })
        const extendIx = AddressLookupTableProgram.extendLookupTable({
          payer: senderKeypair.publicKey,
          authority: senderKeypair.publicKey,
          lookupTable: altAddress,
          addresses: [
            pdas.pool, pdas.merkleTree, pdas.treasury, pdas.vaultAuthority,
            senderAta, TOKEN_PROGRAM_ID, programId,
          ],
        })
        const { blockhash } = await connection.getLatestBlockhash()
        const { Transaction } = await import('@solana/web3.js')
        const tx = new Transaction({ recentBlockhash: blockhash, feePayer: senderKeypair.publicKey })
        tx.add(createIx, extendIx)
        tx.sign(senderKeypair)
        await connection.sendRawTransaction(tx.serialize())

        // Poll for ALT activation
        let activated = null
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 500))
          const res = await connection.getAddressLookupTable(altAddress)
          if (res.value?.isActive()) { activated = res.value; break }
        }
        if (!activated) throw new Error('ALT not activated after 30 polls')
        alt = activated
        break
      } catch (e) {
        if (attempt < 2 && e.message?.includes('not a recent slot')) {
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        throw e
      }
    }

    const altAccounts = alt ? [alt] : []

    // Deposit into shielded pool
    const depositResult = await transact(note, {
      connection,
      programId,
      depositorKeypair: senderKeypair,
      depositorPublicKey: senderKeypair.publicKey,
      walletPublicKey: senderKeypair.publicKey,
      signTransaction: async (tx) => { tx.sign(senderKeypair); return tx },
      enforceViewingKeyRegistration: false,
      addressLookupTableAccounts: altAccounts,
    })

    // Withdraw to recipient's public address
    const recipient = new PublicKey(opts.recipientAddress)
    const withdrawResult = await fullWithdraw([note], recipient, {
      connection,
      programId,
      depositorKeypair: senderKeypair,
      depositorPublicKey: senderKeypair.publicKey,
      walletPublicKey: senderKeypair.publicKey,
      signTransaction: async (tx) => { tx.sign(senderKeypair); return tx },
      enforceViewingKeyRegistration: false,
      addressLookupTableAccounts: altAccounts,
    })

    const depositSignature = depositResult?.signature ?? ''
    const withdrawSignature = withdrawResult?.signature ?? ''

    process.stdout.write(JSON.stringify({
      signature: withdrawSignature || depositSignature,
      depositSignature,
      withdrawSignature,
    }))
    process.exit(0)
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err?.message ?? String(err) }))
    process.exit(1)
  }
}

main()
