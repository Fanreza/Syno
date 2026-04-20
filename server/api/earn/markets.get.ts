const CACHE_TTL_MS = 5 * 60 * 1000
let cachedMarkets: any[] | null = null
let cacheAt = 0

export default defineEventHandler(async () => {
  const now = Date.now()
  if (cachedMarkets && now - cacheAt < CACHE_TTL_MS) return cachedMarkets

  const config = useRuntimeConfig()
  const apiKey = (config as any).jupiterApiKey || process.env.JUPITER_API_KEY || ''

  try {
    const data = await $fetch<any[]>('https://api.jup.ag/lend/v1/earn/tokens', {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
    })

    const tokens: any[] = Array.isArray(data) ? data : []
    cachedMarkets = tokens.map((d: any) => ({
      mint: d.assetAddress ?? '',
      jlMint: d.address ?? '',
      decimals: d.asset?.decimals ?? d.decimals ?? 6,
      symbol: d.asset?.symbol ?? d.symbol ?? '',
      name: d.asset?.name ?? d.name ?? '',
      logoURI: d.asset?.logoUrl ?? d.asset?.logoURI ?? '',
      price: d.asset?.price ? Number(d.asset.price) : 0,
      // supplyRate is in basis points (314 = 3.14%)
      supplyApr: d.supplyRate ? Number(d.supplyRate) / 100 : 0,
      totalAssets: d.totalAssets ? Number(d.totalAssets) : 0,
      totalSupply: d.totalSupply ? Number(d.totalSupply) : 0,
    }))
    cacheAt = now
    return cachedMarkets
  } catch {
    return cachedMarkets ?? []
  }
})
