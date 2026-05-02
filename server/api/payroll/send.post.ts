import { authorizationContext } from '../../utils/privy'
import { createNotification } from '../../utils/notifications'
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js'

const SOL_MINT = 'So11111111111111111111111111111111111111112'

const KNOWN_DECIMALS: Record<string, number> = {
  'So11111111111111111111111111111111111111112': 9,
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6,
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6,
}

async function getDecimals(mint: string) {
  if (KNOWN_DECIMALS[mint] !== undefined) return KNOWN_DECIMALS[mint]
  try { return (await $fetch<any>(`https://tokens.jup.ag/token/${mint}`))?.decimals ?? 6 }
  catch { return 6 }
}

interface PayrollRecipient {
  username?: string
  address?: string
  amount: number
  memo?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    recipients: PayrollRecipient[]
    token?: string
    decimals?: number
    label?: string
  }>(event)

  if (!body?.recipients?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No recipients' })
  }
  if (body.recipients.some(r => !r.username && !r.address)) {
    throw createError({ statusCode: 400, statusMessage: 'Each recipient needs a username or address' })
  }
  if (body.recipients.some(r => !r.amount || r.amount <= 0)) {
    throw createError({ statusCode: 400, statusMessage: 'Each recipient needs a valid amount' })
  }

  const db = adminDb()
  const privy = getPrivy()
  const config = useRuntimeConfig()
  const authCtx = authorizationContext()

  const { data: sender } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id, username')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (!sender?.privy_wallet_id) throw createError({ statusCode: 400, statusMessage: 'Sender wallet not found' })

  const tokenMint = body.token ?? SOL_MINT
  const decimals = body.decimals ?? await getDecimals(tokenMint)
  const connection = new Connection(config.solanaRpcUrl as string, 'confirmed')

  const results: { username?: string; address?: string; amount: number; signature?: string; error?: string }[] = []

  for (const recipient of body.recipients) {
    try {
      let toAddress: string
      let receiverId: string | null = null

      if (recipient.username) {
        const clean = recipient.username.replace(/^@/, '').toLowerCase()
        const { data: u } = await db.from('users').select('id, wallet_address').eq('username', clean).maybeSingle()
        if (!u) throw new Error(`User @${clean} not found`)
        toAddress = u.wallet_address
        receiverId = u.id
      } else {
        toAddress = recipient.address!
        const { data: u } = await db.from('users').select('id').eq('wallet_address', toAddress).maybeSingle()
        receiverId = u?.id ?? null
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

      let txBase64: string
      if (tokenMint === SOL_MINT) {
        txBase64 = await buildTransferSolTx(sender.wallet_address, toAddress, recipient.amount, blockhash)
      } else {
        txBase64 = await buildTransferSplTx(sender.wallet_address, toAddress, tokenMint, recipient.amount, decimals, blockhash)
      }

      const signed = await (privy.wallets() as any).solana().signTransaction(sender.privy_wallet_id, { transaction: txBase64, ...authCtx })
      const buf = Buffer.from(signed.signed_transaction, 'base64')
      let tx: Transaction | VersionedTransaction
      try { tx = VersionedTransaction.deserialize(buf) } catch { tx = Transaction.from(buf) }
      const signature = await connection.sendRawTransaction(
        tx instanceof VersionedTransaction ? tx.serialize() : (tx as Transaction).serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      )
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

      await db.from('payments').insert({
        sender_id: sender.id,
        receiver_id: receiverId,
        receiver_address: toAddress,
        amount: recipient.amount,
        token: tokenMint,
        status: 'confirmed',
        tx_signature: signature,
        memo: recipient.memo ?? body.label ?? 'Payroll',
      })

      if (receiverId && receiverId !== sender.id) {
        const tokenSymbol = tokenMint === SOL_MINT ? 'SOL' : tokenMint.slice(0, 6)
        await createNotification({
          userId: receiverId,
          type: 'payroll_received',
          title: 'Payment received',
          body: `@${sender.username} sent you ${recipient.amount.toFixed(4)} ${tokenSymbol}${body.label ? ` · ${body.label}` : ''}`,
          data: { tx_signature: signature, amount: recipient.amount, token: tokenMint },
        })
      }

      results.push({ username: recipient.username, address: toAddress, amount: recipient.amount, signature })
    } catch (e: any) {
      results.push({ username: recipient.username, address: recipient.address, amount: recipient.amount, error: e.message })
    }
  }

  const succeeded = results.filter(r => r.signature).length
  const failed = results.filter(r => r.error).length
  return { results, succeeded, failed }
})
