export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ username: string }>(event)

  const username = (body?.username || '').trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid username (3-20 chars a-z 0-9 _)' })
  }

  const db = adminDb()

  // Return existing user if already registered
  const { data: already } = await db
    .from('users')
    .select('*')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (already) return already

  const { data: taken } = await db
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (taken) throw createError({ statusCode: 409, statusMessage: 'Username taken' })

  // Create a dedicated server wallet for this user regardless of how they logged in.
  // This wallet is used for all on-chain actions inside Payra (send, gift, split).
  // The user can deposit SOL into it and export the private key at any time.
  const privy = getPrivy()
  let walletAddress: string
  let privyWalletId: string

  try {
    const config = useRuntimeConfig()
    const appId = config.privyAppId
    const appSecret = config.privyAppSecret
    const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString('base64')
    const privyHeaders = {
      'Authorization': `Basic ${basicAuth}`,
      'privy-app-id': appId,
      'Content-Type': 'application/json',
    }

    // Create a key quorum per user: auth key (threshold 1) + user_id
    // This lets server export via auth key, and wallet appears in user's Privy dashboard
    let ownerParam: Record<string, any> = {}
    if (config.privyAuthorizationPublicKey) {
      const quorum = await $fetch<any>('https://api.privy.io/v1/key_quorums', {
        method: 'POST',
        headers: privyHeaders,
        body: {
          authorization_threshold: 1,
          public_keys: [config.privyAuthorizationPublicKey],
          user_ids: [auth.userId],
        },
      })
      ownerParam = { owner_id: quorum.id }
    }

    const wallet = await (privy.wallets() as any).create({ chain_type: 'solana', ...ownerParam })
    walletAddress = wallet.address
    privyWalletId = wallet.id
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: `Failed to create wallet: ${e.message}` })
  }

  const { data, error } = await db
    .from('users')
    .insert({
      privy_user_id: auth.userId,
      username,
      wallet_address: walletAddress,
      privy_wallet_id: privyWalletId,
    })
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
