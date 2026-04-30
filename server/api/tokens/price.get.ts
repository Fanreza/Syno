const MINT_TO_COINGECKO: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'solana',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
}

export default defineEventHandler(async (event) => {
  const { ids } = getQuery(event) as { ids?: string }
  if (!ids) throw createError({ statusCode: 400, message: 'ids required' })

  const config = useRuntimeConfig()
  const mints = String(ids).split(',').map(s => s.trim())
  const data: Record<string, { price: string }> = {}

  // Try Jupiter v3 first (requires API key)
  try {
    const headers: Record<string, string> = {}
    if (config.jupiterApiKey) headers['x-api-key'] = config.jupiterApiKey as string
    const r = await $fetch<Record<string, { usdPrice: number }>>(`https://api.jup.ag/price/v3?ids=${mints.join(',')}`, {
      headers,
      retry: 0,
    })
    for (const mint of mints) {
      const price = r?.[mint]?.usdPrice
      if (price) data[mint] = { price: String(price) }
    }
    if (Object.keys(data).length === mints.length) return { data }
  } catch {}

  // Fallback: CoinGecko for known tokens
  for (const mint of mints) {
    if (data[mint]) continue
    const cgId = MINT_TO_COINGECKO[mint]
    if (!cgId) continue
    try {
      const r = await $fetch<Record<string, { usd: number }>>(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`)
      const price = r[cgId]?.usd
      if (price) data[mint] = { price: String(price) }
    } catch {}
  }

  return { data }
})
