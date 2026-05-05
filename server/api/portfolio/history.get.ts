// Returns portfolio history (snapshots) and saves today's snapshot.
// Uses GoldRush for current balances with USD values.

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id, wallet_address')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me) throw createError({ statusCode: 400, statusMessage: 'User not found' })

  // Fetch current balance from GoldRush
  let currentUsd = 0
  let solBalance = 0
  let solPrice = 0
  let tokenSnapshot: any[] = []

  try {
    const [balData, grData] = await Promise.all([
      $fetch<any>(`/api/balance?address=${me.wallet_address}`).catch(() => null),
      getWalletBalances(me.wallet_address, { noSpam: true }).catch(() => null),
    ])

    if (balData) {
      currentUsd = balData.usd ?? 0
      solBalance = balData.sol ?? 0
      solPrice = balData.solPrice ?? 0
    }

    if (grData?.items) {
      tokenSnapshot = grData.items.map((t: any) => ({
        mint: t.contract_address,
        symbol: t.contract_ticker_symbol,
        balance: Number(t.balance) / Math.pow(10, t.contract_decimals || 0),
        usd: t.quote ?? 0,
        change24h: t.quote_rate && t.quote_rate_24h
          ? ((t.quote_rate - t.quote_rate_24h) / t.quote_rate_24h) * 100
          : null,
      }))
    }
  } catch { /* non-fatal */ }

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

  // Compute P&L metrics
  const history = snapshots ?? []
  const first = history[0]
  const latest = history[history.length - 1]
  const yesterday = history.length >= 2 ? history[history.length - 2] : null

  const pnl24h = yesterday ? currentUsd - (yesterday.total_usd ?? 0) : null
  const pnl24hPct = yesterday && yesterday.total_usd > 0
    ? ((currentUsd - yesterday.total_usd) / yesterday.total_usd) * 100
    : null
  const pnlTotal = first ? currentUsd - (first.total_usd ?? 0) : null
  const pnlTotalPct = first && first.total_usd > 0
    ? ((currentUsd - first.total_usd) / first.total_usd) * 100
    : null

  // Token P&L from GoldRush 24h data
  const tokenPnl = tokenSnapshot
    .filter(t => t.change24h !== null && t.usd > 0)
    .map(t => ({
      symbol: t.symbol,
      mint: t.mint,
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
    history: history.map(s => ({ date: s.snapshot_date, usd: s.total_usd })),
    tokenPnl,
  }
})
