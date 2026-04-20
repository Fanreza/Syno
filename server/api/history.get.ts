// On-chain transaction history via GoldRush (Covalent) API
export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()
  const config = useRuntimeConfig()

  const { data: me } = await db
    .from('users')
    .select('wallet_address')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (!config.goldrushApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'GoldRush API key not configured' })
  }

  const chain = 'solana-mainnet'
  const url = `https://api.covalenthq.com/v1/${chain}/address/${me.wallet_address}/transactions_v3/?page-size=25`

  try {
    const res = await $fetch<any>(url, {
      headers: { Authorization: `Bearer ${config.goldrushApiKey}` }
    })
    const txs = (res?.data?.items ?? []).map((tx: any) => ({
      tx_hash: tx.tx_hash,
      block_signed_at: tx.block_signed_at,
      successful: tx.successful,
      fees_paid: tx.fees_paid,
      value_quote: tx.value_quote,
      from_address: tx.from_address,
      to_address: tx.to_address,
      transfers: (tx.log_events ?? []).slice(0, 3),
    }))
    return { address: me.wallet_address, txs }
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `GoldRush error: ${e.message}` })
  }
})
