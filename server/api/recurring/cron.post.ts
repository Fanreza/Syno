import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js'
import { authorizationContext } from '../../utils/privy'
import { createNotification } from '../../utils/notifications'

const SOL_MINT = 'So11111111111111111111111111111111111111112'

function computeNext(from: Date, frequency: 'weekly' | 'monthly'): Date {
  const d = new Date(from)
  if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Verify cron secret — set CRON_SECRET in env
  const authHeader = getHeader(event, 'authorization')
  const secret = config.cronSecret as string | undefined
  if (!secret || authHeader !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = adminDb()
  const privy = getPrivy()
  const authCtx = authorizationContext()
  const now = new Date().toISOString()

  // Fetch ALL overdue recurring payments across all users
  const { data: overdue, error } = await db
    .from('recurring_payments')
    .select('*, users!recurring_payments_creator_id_fkey(id, wallet_address, privy_wallet_id)')
    .eq('active', true)
    .lte('next_run_at', now)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const payments = overdue ?? []
  const results: { id: string; success: boolean; signature?: string; error?: string }[] = []

  for (const payment of payments) {
    const sender = (payment as any).users
    if (!sender?.privy_wallet_id || !sender?.wallet_address) {
      results.push({ id: payment.id, success: false, error: 'Sender wallet not found' })
      continue
    }

    try {
      let recipientAddress: string | null = payment.recipient_address ?? null
      let recipientId: string | null = null

      if (payment.recipient_username) {
        const { data: recipient } = await db
          .from('users')
          .select('id, wallet_address')
          .eq('username', payment.recipient_username.replace(/^@/, '').toLowerCase())
          .maybeSingle()
        if (!recipient) throw new Error(`User @${payment.recipient_username} not found`)
        recipientAddress = recipient.wallet_address
        recipientId = recipient.id
      } else if (recipientAddress) {
        const { data: recipient } = await db.from('users').select('id').eq('wallet_address', recipientAddress).maybeSingle()
        recipientId = recipient?.id ?? null
      }

      if (!recipientAddress) throw new Error('Could not resolve recipient address')

      const connection = getConnection()
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

      let txBase64: string
      if (payment.token === SOL_MINT) {
        txBase64 = await buildTransferSolTx(sender.wallet_address, recipientAddress, payment.amount, blockhash)
      } else {
        txBase64 = await buildTransferSplTx(sender.wallet_address, recipientAddress, payment.token, payment.amount, payment.decimals, blockhash)
      }

      const signed = await privy.wallets().solana().signTransaction(sender.privy_wallet_id, {
        transaction: txBase64,
        caip2: config.solanaCaip2 as string,
        ...authCtx,
      })

      const buf = Buffer.from(signed.signed_transaction, 'base64')
      let tx: Transaction | VersionedTransaction
      try { tx = VersionedTransaction.deserialize(buf) } catch { tx = Transaction.from(buf) }

      const sig = await connection.sendRawTransaction(
        tx instanceof VersionedTransaction ? tx.serialize() : (tx as Transaction).serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      )
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')

      await db.from('payments').insert({
        sender_id: sender.id,
        receiver_id: recipientId,
        receiver_address: recipientAddress,
        amount: payment.amount,
        token: payment.token,
        status: 'confirmed',
        tx_signature: sig,
        memo: payment.memo ?? null,
      })

      if (recipientId && recipientId !== sender.id) {
        const { data: senderUser } = await db.from('users').select('username').eq('id', sender.id).maybeSingle()
        const tokenSymbol = payment.token === SOL_MINT ? 'SOL' : payment.token.slice(0, 6)
        await createNotification({
          userId: recipientId,
          type: 'payment_received',
          title: 'Payment received',
          body: `@${senderUser?.username ?? 'someone'} sent you ${Number(payment.amount).toFixed(4)} ${tokenSymbol}${payment.memo ? ` · ${payment.memo}` : ''}`,
          data: { tx_signature: sig, amount: payment.amount, token: payment.token },
        })
      }

      await db.from('recurring_payments').update({
        last_run_at: new Date().toISOString(),
        next_run_at: computeNext(new Date(payment.next_run_at), payment.frequency).toISOString(),
      }).eq('id', payment.id)

      results.push({ id: payment.id, success: true, signature: sig })
    } catch (err: any) {
      results.push({ id: payment.id, success: false, error: err?.message ?? 'Unknown error' })
    }
  }

  return {
    processed: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  }
})
