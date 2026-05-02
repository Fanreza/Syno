import { authorizationContext } from '../../utils/privy'
import { createNotification } from '../../utils/notifications'
import {
  Connection, PublicKey, Transaction, VersionedTransaction, SystemProgram, LAMPORTS_PER_SOL
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ giftId: string }>(event)
  if (!body?.giftId) throw createError({ statusCode: 400, statusMessage: 'Missing giftId' })

  const db = adminDb()
  const privy = getPrivy()
  const config = useRuntimeConfig()

  const { data: claimer } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!claimer) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data: gift } = await db
    .from('gifts')
    .select('id, total_amount, total_slots, claimed_count, token, creator_id')
    .eq('id', body.giftId)
    .maybeSingle()
  if (!gift) throw createError({ statusCode: 404, statusMessage: 'Gift not found' })
  if (gift.claimed_count >= gift.total_slots) throw createError({ statusCode: 409, statusMessage: 'All slots claimed' })

  const { data: existing } = await db.from('gift_claims').select('id')
    .eq('gift_id', body.giftId).eq('user_id', claimer.id).maybeSingle()
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Already claimed' })

  // Get creator wallet info for signing
  const { data: creator } = await db
    .from('users')
    .select('wallet_address, privy_wallet_id')
    .eq('id', gift.creator_id)
    .maybeSingle()
  if (!creator) throw createError({ statusCode: 404, statusMessage: 'Creator not found' })

  const SOL_MINT = 'So11111111111111111111111111111111111111112'
  const KNOWN_DECIMALS: Record<string, number> = {
    'So11111111111111111111111111111111111111112': 9,
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6,
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6,
  }
  const tokenMint: string = gift.token ?? SOL_MINT
  const amountPerClaim = gift.total_amount / gift.total_slots

  async function getDecimals(mint: string): Promise<number> {
    if (KNOWN_DECIMALS[mint] !== undefined) return KNOWN_DECIMALS[mint]
    try { return (await $fetch<any>(`https://tokens.jup.ag/token/${mint}`))?.decimals ?? 6 }
    catch { return 6 }
  }

  const connection = new Connection(config.solanaRpcUrl as string, 'confirmed')
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

  const creatorPk = new PublicKey(creator.wallet_address)
  const claimerPk = new PublicKey(claimer.wallet_address)

  let txBase64: string

  if (tokenMint === SOL_MINT) {
    // SOL: creator signs, creator pays fee
    const tx = new Transaction({ feePayer: creatorPk, recentBlockhash: blockhash })
    tx.add(SystemProgram.transfer({
      fromPubkey: creatorPk,
      toPubkey: claimerPk,
      lamports: Math.round(amountPerClaim * LAMPORTS_PER_SOL),
    }))
    txBase64 = Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString('base64')

    const signed = await (privy.wallets() as any).solana().signTransaction(creator.privy_wallet_id, {
      transaction: txBase64, ...authorizationContext()
    })
    const buf = Buffer.from(signed.signed_transaction, 'base64')
    let finalTx: Transaction | VersionedTransaction
    try { finalTx = VersionedTransaction.deserialize(buf) } catch { finalTx = Transaction.from(buf) }
    const signature = await connection.sendRawTransaction(
      finalTx instanceof VersionedTransaction ? finalTx.serialize() : (finalTx as Transaction).serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    )
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

    await db.from('gift_claims').insert({ gift_id: body.giftId, user_id: claimer.id, amount: amountPerClaim, tx_signature: signature })
    await db.from('gifts').update({ claimed_count: gift.claimed_count + 1 }).eq('id', body.giftId)
    const { data: claimerUser } = await db.from('users').select('username').eq('id', claimer.id).maybeSingle()
    await createNotification({
      userId: gift.creator_id,
      type: 'gift_claimed',
      title: 'Gift claimed',
      body: `@${claimerUser?.username ?? 'someone'} claimed ${amountPerClaim.toFixed(4)} from your gift`,
      data: { gift_id: body.giftId, tx_signature: signature },
    })
    return { signature, amount: amountPerClaim, token: gift.token }

  } else {
    // SPL: claimer pays fee, creator signs token transfer
    const decimals = await getDecimals(tokenMint)
    const mintPk = new PublicKey(tokenMint)

    const mintInfo = await connection.getAccountInfo(mintPk)
    const tokenProgramId = mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

    const creatorAta = getAssociatedTokenAddressSync(mintPk, creatorPk, false, tokenProgramId)
    const claimerAta = getAssociatedTokenAddressSync(mintPk, claimerPk, false, tokenProgramId)

    // claimer is fee payer so they pay for ATA creation too
    const tx = new Transaction({ feePayer: claimerPk, recentBlockhash: blockhash })

    const claimerAtaInfo = await connection.getAccountInfo(claimerAta)
    if (!claimerAtaInfo) {
      tx.add(createAssociatedTokenAccountInstruction(claimerPk, claimerAta, claimerPk, mintPk, tokenProgramId))
    }

    const rawAmount = BigInt(Math.round(amountPerClaim * Math.pow(10, decimals)))
    tx.add(createTransferCheckedInstruction(creatorAta, mintPk, claimerAta, creatorPk, rawAmount, decimals, [], tokenProgramId))

    txBase64 = Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString('base64')

    // Step 1: creator signs token transfer
    const creatorSigned = await (privy.wallets() as any).solana().signTransaction(creator.privy_wallet_id, {
      transaction: txBase64, ...authorizationContext()
    })

    // Step 2: claimer signs as fee payer
    const claimerSigned = await (privy.wallets() as any).solana().signTransaction(claimer.privy_wallet_id, {
      transaction: creatorSigned.signed_transaction, ...authorizationContext()
    })

    const finalBuf = Buffer.from(claimerSigned.signed_transaction, 'base64')
    let finalTx: Transaction | VersionedTransaction
    try { finalTx = VersionedTransaction.deserialize(finalBuf) } catch { finalTx = Transaction.from(finalBuf) }
    const signature = await connection.sendRawTransaction(
      finalTx instanceof VersionedTransaction ? finalTx.serialize() : (finalTx as Transaction).serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    )
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

    await db.from('gift_claims').insert({ gift_id: body.giftId, user_id: claimer.id, amount: amountPerClaim, tx_signature: signature })
    await db.from('gifts').update({ claimed_count: gift.claimed_count + 1 }).eq('id', body.giftId)
    const { data: claimerUser2 } = await db.from('users').select('username').eq('id', claimer.id).maybeSingle()
    await createNotification({
      userId: gift.creator_id,
      type: 'gift_claimed',
      title: 'Gift claimed',
      body: `@${claimerUser2?.username ?? 'someone'} claimed ${amountPerClaim.toFixed(4)} from your gift`,
      data: { gift_id: body.giftId, tx_signature: signature },
    })
    return { signature, amount: amountPerClaim, token: gift.token }
  }
})
