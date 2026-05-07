import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js'
import { authorizationContext } from '../../utils/privy'
import { createNotification } from '../../utils/notifications'

const SOL_MINT = 'So11111111111111111111111111111111111111112'

function computeNext(from: Date, frequency: 'weekly' | 'monthly'): Date {
  const d = new Date(from)
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()
  const config = useRuntimeConfig()

  const { data: me } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me?.privy_wallet_id) {
    throw createError({ statusCode: 404, statusMessage: 'User wallet not found' })
  }

  const now = new Date().toISOString()

  const { data: overdue, error: fetchError } = await db
    .from('recurring_payments')
    .select('*')
    .eq('creator_id', me.id)
    .eq('active', true)
    .lte('next_run_at', now)

  if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })

  const payments = overdue ?? []
  const results: { id: string; success: boolean; signature?: string; error?: string }[] = []

  const privy = getPrivy()
  const authCtx = authorizationContext()

  for (const payment of payments) {
    try {
      // Resolve recipient address
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
        const { data: recipient } = await db
          .from('users')
          .select('id')
          .eq('wallet_address', recipientAddress)
          .maybeSingle()
        recipientId = recipient?.id ?? null
      }

      if (!recipientAddress) throw new Error('Could not resolve recipient address')

      const connection = getConnection()
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

      let txBase64: string
      if (payment.token === SOL_MINT) {
        txBase64 = await buildTransferSolTx(me.wallet_address, recipientAddress, payment.amount, blockhash)
      } else {
        txBase64 = await buildTransferSplTx(
          me.wallet_address,
          recipientAddress,
          payment.token,
          payment.amount,
          payment.decimals,
          blockhash
        )
      }

      const signed = await privy.wallets().solana().signTransaction(me.privy_wallet_id, {
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

      // Insert payment record
      await db.from('payments').insert({
        sender_id: me.id,
        receiver_id: recipientId,
        receiver_address: recipientAddress,
        amount: payment.amount,
        token: payment.token,
        status: 'confirmed',
        tx_signature: sig,
        memo: payment.memo ?? null,
      })

      // Notify recipient if they have an account
      if (recipientId && recipientId !== me.id) {
        const { data: senderUser } = await db.from('users').select('username').eq('id', me.id).maybeSingle()
        const senderUsername = senderUser?.username ?? 'someone'
        const tokenSymbol = payment.token === SOL_MINT ? 'SOL' : payment.token.slice(0, 6)
        await createNotification({
          userId: recipientId,
          type: 'payment_received',
          title: 'Payment received',
          body: `@${senderUsername} sent you ${Number(payment.amount).toFixed(4)} ${tokenSymbol}${payment.memo ? ` · ${payment.memo}` : ''}`,
          data: { tx_signature: sig, amount: payment.amount, token: payment.token },
        })
      }

      // Advance next_run_at
      const nextRunAt = computeNext(new Date(payment.next_run_at), payment.frequency)
      await db.from('recurring_payments').update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunAt.toISOString(),
      }).eq('id', payment.id)

      results.push({ id: payment.id, success: true, signature: sig })
    } catch (err: any) {
      results.push({ id: payment.id, success: false, error: err?.message ?? 'Unknown error' })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    processed: results.length,
    succeeded,
    failed,
    results,
  }
})
