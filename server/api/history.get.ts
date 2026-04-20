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

  const rpcUrl = config.solanaRpcUrl || 'https://api.mainnet-beta.solana.com'

  try {
    const sigRes = await $fetch<any>(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [me.wallet_address, { limit: 25 }],
      },
    })

    const sigs: any[] = sigRes?.result ?? []

    const txs = sigs.map((s: any) => ({
      tx_hash: s.signature,
      block_signed_at: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
      successful: s.err === null,
      fees_paid: null,
      from_address: me.wallet_address,
      to_address: null,
    }))

    return { address: me.wallet_address, txs }
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `RPC error: ${e.message}` })
  }
})
