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
    const wallet = await (privy.wallets() as any).create({ chain_type: 'solana' })
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
