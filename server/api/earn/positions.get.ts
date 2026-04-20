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
    const data = await $fetch<any>(`https://api.jup.ag/lend/v1/earn/positions?wallet=${me.wallet_address}`, {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
    })

    const positions: any[] = Array.isArray(data) ? data : (data?.positions ?? data?.data ?? [])
    return positions.map((p: any) => ({
      mint: p.mint ?? p.underlyingMint ?? '',
      jlMint: p.jlMint ?? p.tokenMint ?? '',
      decimals: p.decimals ?? 6,
      symbol: p.symbol ?? '',
      logoURI: p.logoURI ?? '',
      supplyApr: p.supplyApr ?? 0,
      balance: p.balance ?? p.depositedAmount ?? 0,
      jlShares: p.jlShares ?? p.shares ?? '0',
    }))
  } catch {
    return []
  }
})
