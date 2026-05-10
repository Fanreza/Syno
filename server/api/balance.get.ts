// Server-level SOL price cache — shared across all requests, refreshed every 60s
let _solPriceCache = 0
let _solPriceFetchedAt = 0

async function getCachedSolPrice(): Promise<number> {
  const now = Date.now()
  if (_solPriceCache > 0 && now - _solPriceFetchedAt < 60_000) return _solPriceCache
  const SOL_MINT = 'So11111111111111111111111111111111111111112'

  // Try Jupiter v3 first
  try {
    const config = useRuntimeConfig()
    const headers: Record<string, string> = {}
    if (config.jupiterApiKey) headers['x-api-key'] = config.jupiterApiKey as string
    const res = await $fetch<Record<string, { usdPrice: number }>>(`https://api.jup.ag/price/v3?ids=${SOL_MINT}`, {
      headers, retry: 0, timeout: 5000,
    })
    const price = res?.[SOL_MINT]?.usdPrice
    if (price) { _solPriceCache = price; _solPriceFetchedAt = now; return _solPriceCache }
  } catch { /* fall through to CoinGecko */ }

  // Fallback: CoinGecko (no key needed)
  try {
    const res = await $fetch<{ solana: { usd: number } }>(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { retry: 0, timeout: 5000 }
    )
    const price = res?.solana?.usd
    if (price) { _solPriceCache = price; _solPriceFetchedAt = now }
  } catch { /* keep stale value */ }

  return _solPriceCache
}

export default defineEventHandler(async (event): Promise<{ address: string; sol: number; usd: number; solPrice: number; tokens: any[] }> => {
  const { address } = getQuery(event) as { address?: string }
  if (!address) throw createError({ statusCode: 400, statusMessage: 'address required' })

  const rpcUrl = useRuntimeConfig().solanaRpcUrl as string
  const { LAMPORTS_PER_SOL } = await import('@solana/web3.js')

  const [lamportsRes, assetsRes, solPrice, grData]: [any, any, number, any] = await Promise.all([
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
    // GoldRush for enhanced metadata: logos, 24h change, spam flag
    getWalletBalances(address, { noSpam: false }).catch(() => null),
  ])

  const sol = lamportsRes?.result?.value ? lamportsRes.result.value / LAMPORTS_PER_SOL : 0

  // Build a lookup map from GoldRush data keyed by mint address
  const grMap = new Map<string, import('./../../server/utils/goldrush').GoldRushToken>()
  for (const item of (grData?.items ?? [])) {
    grMap.set(item.contract_address, item)
  }

  const tokens: any[] = []
  const assets: any[] = assetsRes?.result?.items ?? []

  for (const asset of assets) {
    if (asset.interface !== 'FungibleToken' && asset.interface !== 'FungibleAsset') continue
    const info = asset.token_info
    const uiAmount = info?.balance ? info.balance / Math.pow(10, info.decimals ?? 0) : 0
    if (uiAmount <= 0) continue

    const price = info?.price_info?.price_per_token ?? 0
    const gr = grMap.get(asset.id)

    tokens.push({
      mint: asset.id,
      symbol: asset.content?.metadata?.symbol ?? gr?.contract_ticker_symbol ?? asset.id.slice(0, 6),
      name: asset.content?.metadata?.name ?? gr?.contract_name ?? asset.id.slice(0, 10),
      logoURI: asset.content?.links?.image ?? gr?.logo_urls?.token_logo_url ?? null,
      balance: uiAmount,
      price,
      usd: uiAmount * price,
      // GoldRush enrichments
      isSpam: gr?.is_spam ?? false,
      change24h: gr?.quote_rate !== null && gr?.quote_rate_24h !== null && gr?.quote_rate
        ? ((gr.quote_rate - gr.quote_rate_24h!) / gr.quote_rate_24h!) * 100
        : null,
      usd24h: gr?.quote_24h ?? null,
      lastTransferredAt: gr?.last_transferred_at ?? null,
    })
  }

  // Filter out spam tokens from the display
  const cleanTokens = tokens.filter(t => !t.isSpam)

  // SOL 24h change from GoldRush (native token item)
  const SOL_MINT = 'So11111111111111111111111111111111111111112'
  const grSol = grMap.get(SOL_MINT)
  const solChange24h = grSol?.quote_rate !== null && grSol?.quote_rate_24h !== null && grSol?.quote_rate
    ? ((grSol.quote_rate! - grSol.quote_rate_24h!) / grSol.quote_rate_24h!) * 100
    : null

  const usd = sol * solPrice + cleanTokens.reduce((s, t) => s + t.usd, 0)
  return {
    address,
    sol,
    usd,
    solPrice,
    tokens: cleanTokens,
    // Extra fields for dashboard
    ...(solChange24h !== null ? { solChange24h } : {}),
  } as any
})
