export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: user } = await db
    .from('users')
    .select('privy_wallet_id, wallet_address')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!user?.privy_wallet_id) {
    throw createError({ statusCode: 404, statusMessage: 'Wallet not found' })
  }

  const config = useRuntimeConfig()
  if (!config.privyAuthorizationKey) {
    throw createError({ statusCode: 500, statusMessage: 'Authorization key not configured' })
  }

  try {
    const privy = getPrivy()
    const { private_key } = await (privy.wallets() as any).exportPrivateKey(user.privy_wallet_id, {
      authorization_context: {
        authorization_private_keys: [config.privyAuthorizationKey],
      },
    })
    return {
      wallet_address: user.wallet_address,
      private_key,
    }
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: `Export failed: ${e.message}` })
  }
})
