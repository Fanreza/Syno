export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: sender } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .single()

  if (!sender) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data: transfers } = await db
    .from('private_transfers')
    .select('id, recipient_address, recipient_id, amount, mint, deposit_signature, withdraw_signature, status, memo, created_at')
    .eq('sender_id', sender.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return transfers ?? []
})
