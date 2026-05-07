export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{ wallet_address: string; label: string; note?: string }>(event)

  if (!body?.wallet_address?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'wallet_address is required' })
  }
  if (!body?.label?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'label is required' })
  }

  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data, error } = await db
    .from('contacts')
    .upsert(
      {
        user_id: me.id,
        wallet_address: body.wallet_address.trim(),
        label: body.label.trim(),
        note: body.note?.trim() ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,wallet_address' }
    )
    .select()
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
