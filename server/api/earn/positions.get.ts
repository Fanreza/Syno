// Only used as a fallback when Jupiter returns 429
const staleCache = new Map<string, any[]>()

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db.from('users').select('wallet_address').eq('privy_user_id', auth.userId).single()
  if (!me) throw createError({ statusCode: 400, statusMessage: 'User not onboarded' })

  try {
    const config = useRuntimeConfig()
    const apiKey = (config as any).jupiterApiKey || ''
    const positions = await $fetch<any[]>(`https://api.jup.ag/lend/v1/earn/positions?users=${me.wallet_address}`, {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
      retry: 0,
    })

    const result = (Array.isArray(positions) ? positions : [])
      .filter((pos: any) => pos.shares && Number(pos.shares) > 0)
      .map((pos: any) => {
        const { token } = pos
        const decimals = token.asset?.decimals ?? 6
        const balance = Number(pos.underlyingAssets ?? 0) / Math.pow(10, decimals)
        const supplyApr = token.supplyRate ? Number(token.supplyRate) / 10000 : 0
        return {
          mint: token.assetAddress,
          jlMint: token.address,
          decimals,
          symbol: token.asset?.symbol ?? '',
          logoURI: token.asset?.logoUrl ?? '',
          supplyApr,
          balance,
          jlShares: pos.shares,
        }
      })

    staleCache.set(me.wallet_address, result)
    return result
  } catch (error: any) {
    if (error?.status === 429) return staleCache.get(me.wallet_address) ?? []
    console.error('Error fetching positions:', error?.message)
    return staleCache.get(me.wallet_address) ?? []
  }
})
