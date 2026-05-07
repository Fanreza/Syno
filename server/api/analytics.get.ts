function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // 'YYYY-MM'
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const db = adminDb()

  const { data: me } = await db
    .from('users')
    .select('id')
    .eq('privy_user_id', auth.userId)
    .maybeSingle()

  if (!me) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const since = sixMonthsAgo.toISOString()

  const [sentResult, receivedResult] = await Promise.all([
    db
      .from('payments')
      .select('created_at, amount, token, receiver_id, receiver_address, users!payments_receiver_id_fkey(username)')
      .eq('sender_id', me.id)
      .is('split_participant_id', null)
      .gte('created_at', since),
    db
      .from('payments')
      .select('created_at, amount, token, sender_id, users!payments_sender_id_fkey(username)')
      .eq('receiver_id', me.id)
      .is('split_participant_id', null)
      .gte('created_at', since),
  ])

  const sent: any[] = sentResult.data ?? []
  const received: any[] = receivedResult.data ?? []

  // Build last 6 months keys
  const monthKeys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Monthly aggregation
  const monthlySentMap: Record<string, number> = {}
  const monthlyReceivedMap: Record<string, number> = {}
  for (const mk of monthKeys) {
    monthlySentMap[mk] = 0
    monthlyReceivedMap[mk] = 0
  }

  for (const tx of sent) {
    const mk = monthKey(tx.created_at)
    if (mk in monthlySentMap) monthlySentMap[mk] += Number(tx.amount)
  }
  for (const tx of received) {
    const mk = monthKey(tx.created_at)
    if (mk in monthlyReceivedMap) monthlyReceivedMap[mk] += Number(tx.amount)
  }

  const monthly = monthKeys.map(mk => ({
    month: mk,
    sent: monthlySentMap[mk],
    received: monthlyReceivedMap[mk],
  }))

  // Top recipients (by total amount sent)
  const recipientMap: Record<string, { username: string | null; address: string; totalSent: number; count: number }> = {}
  for (const tx of sent) {
    const addr: string = tx.receiver_address ?? ''
    const username: string | null = (tx.users as any)?.username ?? null
    if (!recipientMap[addr]) {
      recipientMap[addr] = { username, address: addr, totalSent: 0, count: 0 }
    }
    recipientMap[addr].totalSent += Number(tx.amount)
    recipientMap[addr].count += 1
  }
  const topRecipients = Object.values(recipientMap)
    .sort((a, b) => b.totalSent - a.totalSent)
    .slice(0, 5)

  // Token breakdown
  const tokenMap: Record<string, { sent: number; received: number }> = {}
  for (const tx of sent) {
    const t: string = tx.token ?? 'unknown'
    if (!tokenMap[t]) tokenMap[t] = { sent: 0, received: 0 }
    tokenMap[t].sent += Number(tx.amount)
  }
  for (const tx of received) {
    const t: string = tx.token ?? 'unknown'
    if (!tokenMap[t]) tokenMap[t] = { sent: 0, received: 0 }
    tokenMap[t].received += Number(tx.amount)
  }
  const tokenBreakdown = Object.entries(tokenMap).map(([token, v]) => ({ token, ...v }))

  // Summary
  const totalSent = sent.reduce((s, tx) => s + Number(tx.amount), 0)
  const totalReceived = received.reduce((s, tx) => s + Number(tx.amount), 0)
  const txCount = sent.length + received.length

  return {
    monthly,
    topRecipients,
    tokenBreakdown,
    summary: { totalSent, totalReceived, txCount },
  }
})
