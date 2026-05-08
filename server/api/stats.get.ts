const SOL_MINT = 'So11111111111111111111111111111111111111112'

function normalizeMint(token: string | null): string {
  if (!token || token === 'SOL') return SOL_MINT
  return token
}

async function fetchPrices(mints: string[]): Promise<Record<string, number>> {
  const real = [...new Set(mints.map(normalizeMint).filter(m => m !== 'PRIVATE' && m !== 'unknown'))]
  if (!real.length) return {}
  try {
    const res = await $fetch<any>(`https://api.jup.ag/price/v3?ids=${real.join(',')}`)
    const out: Record<string, number> = {}
    for (const mint of real) {
      const price = parseFloat(res?.data?.[mint]?.price ?? '0')
      if (price > 0) out[mint] = price
    }
    // fallback: if SOL price not returned, fetch separately
    if (!out[SOL_MINT]) {
      try {
        const sol = await $fetch<any>(`https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`)
        const solPrice = sol?.solana?.usd
        if (solPrice) out[SOL_MINT] = solPrice
      } catch {}
    }
    return out
  } catch (e: any) {
    console.error('[stats] fetchPrices failed:', e?.message)
    // last resort: try coingecko for SOL
    try {
      const sol = await $fetch<any>(`https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`)
      const solPrice = sol?.solana?.usd
      if (solPrice) return { [SOL_MINT]: solPrice }
    } catch {}
    return {}
  }
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [sentRes, receivedRes, splitsRes] = await Promise.all([
    db.from('payments')
      .select('amount, token')
      .eq('sender_id', me.id)
      .eq('status', 'confirmed')
      .neq('token', 'PRIVATE')
      .gte('created_at', thirtyDaysAgo),

    db.from('payments')
      .select('amount, token')
      .eq('receiver_id', me.id)
      .eq('status', 'confirmed')
      .neq('token', 'PRIVATE')
      .gte('created_at', thirtyDaysAgo),

    db.from('split_bills')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', me.id)
      .eq('status', 'open'),
  ])

  const sent = sentRes.data ?? []
  const received = receivedRes.data ?? []

  console.log('[stats] sent:', sent.length, 'received:', received.length)

  if (!sent.length && !received.length) {
    return { sentUsd: 0, receivedUsd: 0, openSplits: splitsRes.count ?? 0 }
  }

  const uniqueRawTokens = [...new Set([...sent, ...received].map(r => r.token))]
  console.log('[stats] tokens in DB:', uniqueRawTokens)

  const prices = await fetchPrices(uniqueRawTokens)
  console.log('[stats] prices:', prices)

  const toUsd = (amount: number, token: string | null) =>
    amount * (prices[normalizeMint(token)] ?? 0)

  const sentUsd = sent.reduce((s, r) => s + toUsd(Number(r.amount), r.token), 0)
  const receivedUsd = received.reduce((s, r) => s + toUsd(Number(r.amount), r.token), 0)
  const openSplits = splitsRes.count ?? 0

  console.log('[stats] result:', { sentUsd, receivedUsd, openSplits })

  return { sentUsd, receivedUsd, openSplits }
})
