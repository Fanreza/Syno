import { createNotification } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    title: string
    totalAmount: number
    token?: string
    participants: { username: string; amount: number }[]
  }>(event)
  if (!body?.totalAmount || !body.participants?.length) {
    throw createError({ statusCode: 400, statusMessage: 'missing fields' })
  }

  const db = adminDb()
  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .single()

  const { data: bill, error } = await db
    .from('split_bills')
    .insert({
      creator_id: me?.id,
      title: body.title || 'Split Bill',
      total_amount: body.totalAmount,
      token: body.token ?? 'So11111111111111111111111111111111111111112',
      status: 'open'
    })
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { data: creator } = await db.from('users').select('username').eq('id', me?.id).maybeSingle()
  const creatorUsername = creator?.username ?? 'someone'

  const rows = await Promise.all(
    body.participants.map(async (p) => {
      const clean = p.username.replace(/^@/, '').toLowerCase()
      const { data: u } = await db.from('users').select('id').eq('username', clean).maybeSingle()
      return {
        bill_id: bill.id,
        user_id: u?.id || null,
        username: clean,
        amount: p.amount,
        status: 'pending',
        _userId: u?.id,
      }
    })
  )

  const insertRows = rows.map(({ _userId: _, ...r }) => r)
  await db.from('split_participants').insert(insertRows)

  // Notify participants
  const toNotify = rows.filter(r => r._userId && r._userId !== me?.id)
  for (const r of toNotify) {
    try {
      await createNotification({
        userId: r._userId!,
        type: 'split_created',
        title: 'You were added to a split',
        body: `@${creatorUsername} added you to "${body.title || 'a split bill'}" — ${r.amount} due`,
        data: { bill_id: bill.id },
      })
    } catch (err) {
      console.error('[split/create] notification failed for', r.username, err)
    }
  }

  // Log participants without a matched user account
  const unmatched = rows.filter(r => !r._userId)
  if (unmatched.length) {
    console.warn('[split/create] participants not found in DB:', unmatched.map(r => r.username))
  }

  return { id: bill.id }
})
