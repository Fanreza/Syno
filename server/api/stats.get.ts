const SOL_MINT = 'So11111111111111111111111111111111111111112'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

const STABLECOIN_PRICE: Record<string, number> = {
  [USDC_MINT]: 1,
  [USDT_MINT]: 1,
}

// Price cache shared across all requests — refreshes every 90 seconds
let priceCache: Record<string, number> = {}
let priceCacheAt = 0
const PRICE_TTL = 90_000

function normalizeMint(token: string | null): string {
  if (!token || token === 'SOL') return SOL_MINT
  return token
}

async function fetchPrices(mints: string[]): Promise<Record<string, number>> {
  const real = [...new Set(mints.map(normalizeMint).filter(m => m !== 'PRIVATE' && m !== 'unknown'))]
  if (!real.length) return {}

  // Return from cache if still fresh and covers all requested mints
  const now = Date.now()
  if (now - priceCacheAt < PRICE_TTL && real.every(m => priceCache[m] !== undefined || STABLECOIN_PRICE[m])) {
    return priceCache
  }

  const out: Record<string, number> = {}

  // Stablecoins: always $1 — no API call needed
  for (const m of real) {
    if (STABLECOIN_PRICE[m]) out[m] = STABLECOIN_PRICE[m]
  }

  // SOL: CoinGecko
  if (real.includes(SOL_MINT)) {
    try {
      const sol = await $fetch<any>(`https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`)
      const solPrice = sol?.solana?.usd
      if (solPrice) out[SOL_MINT] = solPrice
    } catch {}
  }

  // Other tokens: Jupiter v3 with API key
  const remaining = real.filter(m => !out[m])
  if (remaining.length) {
    try {
      const config = useRuntimeConfig()
      const headers: Record<string, string> = {}
      if ((config as any).jupiterApiKey) headers['x-api-key'] = (config as any).jupiterApiKey
      const res = await $fetch<Record<string, { usdPrice: number }>>(
        `https://api.jup.ag/price/v3?ids=${remaining.join(',')}`,
        { headers, retry: 0 },
      )
      for (const m of remaining) {
        const price = res?.[m]?.usdPrice
        if (price) out[m] = price
      }
    } catch (e: any) {
      console.error('[stats] Jupiter price fetch failed:', e?.message)
    }
  }

  priceCache = out
  priceCacheAt = now
  return out
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
