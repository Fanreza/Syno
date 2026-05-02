// Server-level SOL price cache — shared across all requests, refreshed every 60s
let _solPriceCache = 0
let _solPriceFetchedAt = 0

async function getCachedSolPrice(): Promise<number> {
  const now = Date.now()
  if (_solPriceCache > 0 && now - _solPriceFetchedAt < 60_000) return _solPriceCache
  const SOL_MINT = 'So11111111111111111111111111111111111111112'
  try {
    const config = useRuntimeConfig()
    const headers: Record<string, string> = {}
    if (config.jupiterApiKey) headers['x-api-key'] = config.jupiterApiKey as string
    const res = await $fetch<Record<string, { usdPrice: number }>>(`https://api.jup.ag/price/v3?ids=${SOL_MINT}`, {
      headers,
      retry: 0,
    })
    const price = res?.[SOL_MINT]?.usdPrice
    if (price) { _solPriceCache = price; _solPriceFetchedAt = now }
  } catch { /* keep stale value */ }
  return _solPriceCache
}

export default defineEventHandler(async (event) => {
  const { address } = getQuery(event) as { address?: string }
  if (!address) throw createError({ statusCode: 400, statusMessage: 'address required' })

  const rpcUrl = useRuntimeConfig().solanaRpcUrl as string
  const { LAMPORTS_PER_SOL } = await import('@solana/web3.js')

  const [lamportsRes, assetsRes, solPrice]: [any, any, number] = await Promise.all([
    $fetch<any>(rpcUrl, {
      method: 'POST',
      retry: 0,
      body: { jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address, { commitment: 'processed' }] },
    }).catch(() => null),
    $fetch<any>(rpcUrl, {
      method: 'POST',
      retry: 0,
      body: {
        jsonrpc: '2.0', id: 2, method: 'getAssetsByOwner',
        params: { ownerAddress: address, page: 1, limit: 100, displayOptions: { showFungible: true, showNativeBalance: true } },
      },
    }).catch(() => null),
    getCachedSolPrice(),
  ])

  const sol = lamportsRes?.result?.value ? lamportsRes.result.value / LAMPORTS_PER_SOL : 0

  const tokens: any[] = []
  const assets: any[] = assetsRes?.result?.items ?? []

  for (const asset of assets) {
    if (asset.interface !== 'FungibleToken' && asset.interface !== 'FungibleAsset') continue
    const info = asset.token_info
    const uiAmount = info?.balance ? info.balance / Math.pow(10, info.decimals ?? 0) : 0
    if (uiAmount <= 0) continue

    const price = info?.price_info?.price_per_token ?? 0
    tokens.push({
      mint: asset.id,
      symbol: asset.content?.metadata?.symbol ?? asset.id.slice(0, 6),
      name: asset.content?.metadata?.name ?? asset.id.slice(0, 10),
      logoURI: asset.content?.links?.image ?? null,
      balance: uiAmount,
      price,
      usd: uiAmount * price,
    })
  }

  const usd = sol * solPrice + tokens.reduce((s, t) => s + t.usd, 0)
  return { address, sol, usd, solPrice: solPrice, tokens }
})
