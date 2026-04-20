export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('wallet_address')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!me) throw createError({ statusCode: 400, statusMessage: 'User not onboarded' })

  const config = useRuntimeConfig()
  const apiKey = (config as any).jupiterApiKey || process.env.JUPITER_API_KEY || ''

  try {
    const data = await $fetch<any[]>(`https://api.jup.ag/lend/v1/earn/positions?users=${me.wallet_address}`, {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
    })

    const positions: any[] = Array.isArray(data) ? data : []
    return positions
      .filter((p: any) => Number(p.shares ?? 0) > 0)
      .map((p: any) => ({
        mint: p.token?.assetAddress ?? '',
        jlMint: p.token?.address ?? '',
        decimals: p.token?.decimals ?? 6,
        symbol: p.token?.asset?.symbol ?? p.token?.symbol ?? '',
        logoURI: p.token?.asset?.logoUrl ?? '',
        supplyApr: p.token?.totalRate ? Number(p.token.totalRate) / 100 : 0,
        balance: (() => {
          const decimals = p.token?.decimals ?? 6
          const underlyingAssets = Number(p.underlyingAssets ?? 0)
          if (underlyingAssets > 0) return underlyingAssets / Math.pow(10, decimals)
          // fallback: compute from shares * convertToAssets rate
          const shares = Number(p.shares ?? 0)
          const rate = Number(p.token?.convertToAssets ?? 0)
          if (shares > 0 && rate > 0) return (shares * rate / 1e6) / Math.pow(10, decimals)
          return 0
        })(),
        jlShares: p.shares ?? '0',
      }))
  } catch {
    return []
  }
})
