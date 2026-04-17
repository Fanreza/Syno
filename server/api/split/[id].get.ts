export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = adminDb()
  const { data: bill } = await db.from('split_bills').select('*').eq('id', id).maybeSingle()
  if (!bill) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const { data: participants } = await db
    .from('split_participants')
    .select('*')
    .eq('bill_id', id)
  let creator: any = null
  if (bill.creator_id) {
    const { data: c } = await db
      .from('users')
      .select('username, wallet_address')
      .eq('id', bill.creator_id)
      .maybeSingle()
    creator = c
  }
  return { ...bill, participants: participants || [], creator }
})
