import { getCachedEarnTokens } from '../../utils/earn-tokens'

let cachedMarkets: any[] | null = null
let cacheAt = 0

export default defineEventHandler(async () => {
  const now = Date.now()
  if (cachedMarkets && now - cacheAt < 5 * 60 * 1000) return cachedMarkets

  try {
    const tokens = await getCachedEarnTokens()
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
