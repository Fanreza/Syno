export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ username: string; wallet_address: string }>(event)

  const username = (body?.username || '').trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid username (3-20 chars a-z 0-9 _)' })
  }
  if (!body?.wallet_address) {
    throw createError({ statusCode: 400, statusMessage: 'wallet_address required' })
  }

  const db = adminDb()

  const { data: existing } = await db
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Username taken' })

  const { data: already } = await db
    .from('users')
    .select('*')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()
  if (already) return already

  const { data, error } = await db
    .from('users')
    .insert({
      privy_user_id: auth.userId,
      username,
      wallet_address: body.wallet_address
    })
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
