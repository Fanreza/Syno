export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id, wallet_address')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me) throw createError({ statusCode: 400, statusMessage: 'User not found' })

  // Fetch current balance directly (no HTTP self-fetch)
  let currentUsd = 0
  let solBalance = 0
  let solPrice = 0
  let tokenSnapshot: any[] = []

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — useRuntimeConfig is a Nitro global, IDE types may lag
    const cfg = useRuntimeConfig()
    const rpcUrl = (cfg.solanaRpcUrl as string) || 'https://api.mainnet-beta.solana.com'
    const jupiterApiKey = (cfg.jupiterApiKey as string) || ''
    const { LAMPORTS_PER_SOL } = await import('@solana/web3.js')

    // SOL price via Jupiter
    const SOL_MINT = 'So11111111111111111111111111111111111111112'
    const headers: Record<string, string> = {}
    if (jupiterApiKey) headers['x-api-key'] = jupiterApiKey

    const [lamportsRes, priceRes, grData] = await Promise.all([
      $fetch<any>(rpcUrl, {
        method: 'POST', retry: 0,
        body: { jsonrpc: '2.0', id: 1, method: 'getBalance', params: [me.wallet_address, { commitment: 'processed' }] },
      }).catch(() => null),
      $fetch<Record<string, { usdPrice: number }>>(`https://api.jup.ag/price/v3?ids=${SOL_MINT}`, {
        headers, retry: 0,
      }).catch(() => null),
      getWalletBalances(me.wallet_address, { noSpam: true }).catch(() => null),
    ])

    solBalance = lamportsRes?.result?.value ? lamportsRes.result.value / LAMPORTS_PER_SOL : 0
    solPrice = priceRes?.[SOL_MINT]?.usdPrice ?? 0

    if (grData?.items) {
      const solGr = grData.items.find((t: any) => t.is_native_token)
      const tokensGr = grData.items.filter((t: any) => !t.is_native_token && !t.is_spam && (t.quote ?? 0) > 0)

      tokenSnapshot = [
        ...(solGr ? [{
          mint: SOL_MINT,
          symbol: 'SOL',
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          balance: solBalance,
          usd: solGr.quote ?? solBalance * solPrice,
          change24h: solGr.quote_rate && solGr.quote_rate_24h
            ? ((solGr.quote_rate - solGr.quote_rate_24h) / solGr.quote_rate_24h) * 100
            : null,
        }] : []),
        ...tokensGr.map((t: any) => ({
          mint: t.contract_address,
          symbol: t.contract_ticker_symbol,
          logoURI: t.logo_urls?.token_logo_url ?? null,
          balance: Number(t.balance) / Math.pow(10, t.contract_decimals || 0),
          usd: t.quote ?? 0,
          change24h: t.quote_rate && t.quote_rate_24h
            ? ((t.quote_rate - t.quote_rate_24h) / t.quote_rate_24h) * 100
            : null,
        })),
      ]

      currentUsd = grData.items.reduce((s: number, t: any) => s + (t.quote ?? 0), 0)
      // fallback to RPC-based SOL value if GoldRush quote is 0
      if (currentUsd === 0 && solBalance > 0) currentUsd = solBalance * solPrice
    } else {
      currentUsd = solBalance * solPrice
    }
  } catch { /* non-fatal — currentUsd stays 0 */ }

  // Save today's snapshot (upsert)
  const today = new Date().toISOString().slice(0, 10)
  if (currentUsd > 0) {
    await db.from('portfolio_snapshots').upsert({
      user_id: me.id,
      snapshot_date: today,
      total_usd: currentUsd,
      sol_balance: solBalance,
      sol_price: solPrice,
      tokens: tokenSnapshot,
    }, { onConflict: 'user_id,snapshot_date' })
  }

  // Fetch last 90 days of snapshots
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)
  const { data: snapshots } = await db
    .from('portfolio_snapshots')
    .select('snapshot_date, total_usd, sol_balance, sol_price, tokens')
    .eq('user_id', me.id)
    .gte('snapshot_date', ninetyDaysAgo)
    .order('snapshot_date', { ascending: true })

  // Build history — always include today's live value so the chart has at least 1 point
  let history: { date: string; usd: number }[] = (snapshots ?? []).map(s => ({
    date: s.snapshot_date,
    usd: s.total_usd,
  }))

  // If today's snapshot isn't in the list yet (upsert may have failed), inject live value
  if (currentUsd > 0 && !history.find(h => h.date === today)) {
    history = [...history, { date: today, usd: currentUsd }]
  }

  // Chart needs at least 2 points — inject a synthetic yesterday point so it renders immediately
  if (history.length === 1 && currentUsd > 0) {
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
    history = [{ date: yesterday, usd: currentUsd }, ...history]
  }

  // Compute P&L metrics
  const first = history[0]
  const yesterday = history.length >= 2 ? history[history.length - 2] : null

  const pnl24h = yesterday ? currentUsd - yesterday.usd : null
  const pnl24hPct = yesterday && yesterday.usd > 0
    ? ((currentUsd - yesterday.usd) / yesterday.usd) * 100
    : null
  const pnlTotal = first ? currentUsd - first.usd : null
  const pnlTotalPct = first && first.usd > 0
    ? ((currentUsd - first.usd) / first.usd) * 100
    : null

  // Token P&L from GoldRush 24h data
  const tokenPnl = tokenSnapshot
    .filter(t => t.change24h !== null && t.usd > 0)
    .map(t => ({
      symbol: t.symbol,
      mint: t.mint,
      logoURI: t.logoURI ?? null,
      usd: t.usd,
      change24h: t.change24h,
      pnl24h: t.usd - (t.usd / (1 + t.change24h / 100)),
    }))
    .sort((a, b) => Math.abs(b.pnl24h) - Math.abs(a.pnl24h))
    .slice(0, 5)

  return {
    currentUsd,
    solBalance,
    solPrice,
    pnl24h,
    pnl24hPct,
    pnlTotal,
    pnlTotalPct,
    history,
    tokenPnl,
  }
})
