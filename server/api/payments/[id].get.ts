export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = adminDb()
  const { data } = await db
    .from('payments')
    .select('id, amount, token, status, receiver_address, memo, receiver_id, sender_id')
    .eq('id', id)
    .maybeSingle()
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  let receiver: any = null
  if (data.receiver_id) {
    const { data: r } = await db
      .from('users')
      .select('username, wallet_address')
      .eq('id', data.receiver_id)
      .maybeSingle()
    receiver = r
  }
  return { ...data, receiver }
})
