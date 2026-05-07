function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // 'YYYY-MM'
}

async function fetchPrices(mints: string[]): Promise<Record<string, number>> {
  const real = mints.filter(m => m !== 'PRIVATE' && m !== 'unknown')
  if (!real.length) return {}
  try {
    const url = `https://api.jup.ag/price/v2?ids=${real.join(',')}`
    const res = await fetch(url).then(r => r.json())
    const out: Record<string, number> = {}
    for (const mint of real) {
      const price = parseFloat(res?.data?.[mint]?.price ?? '0')
      if (price > 0) out[mint] = price
    }
    return out
  } catch {
    return {}
  }
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
      .neq('token', 'PRIVATE')
      .gte('created_at', since),
    db
      .from('payments')
      .select('created_at, amount, token, sender_id, users!payments_sender_id_fkey(username)')
      .eq('receiver_id', me.id)
      .is('split_participant_id', null)
      .neq('token', 'PRIVATE')
      .gte('created_at', since),
  ])

  const sent: any[] = sentResult.data ?? []
  const received: any[] = receivedResult.data ?? []

  // Fetch USD prices for all unique tokens
  const uniqueMints = [...new Set([...sent, ...received].map(tx => tx.token).filter(Boolean))]
  const prices = await fetchPrices(uniqueMints)

  function toUsd(amount: number, token: string): number {
    const price = prices[token] ?? 0
    return amount * price
  }

  // Build last 6 months keys
  const monthKeys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Monthly aggregation in USD
  const monthlySentMap: Record<string, number> = {}
  const monthlyReceivedMap: Record<string, number> = {}
  for (const mk of monthKeys) {
    monthlySentMap[mk] = 0
    monthlyReceivedMap[mk] = 0
  }

  for (const tx of sent) {
    const mk = monthKey(tx.created_at)
    if (mk in monthlySentMap) monthlySentMap[mk] += toUsd(Number(tx.amount), tx.token)
  }
  for (const tx of received) {
    const mk = monthKey(tx.created_at)
    if (mk in monthlyReceivedMap) monthlyReceivedMap[mk] += toUsd(Number(tx.amount), tx.token)
  }

  const monthly = monthKeys.map(mk => ({
    month: mk,
    sent: monthlySentMap[mk],
    received: monthlyReceivedMap[mk],
  }))

  // Top recipients (by USD sent)
  const recipientMap: Record<string, { username: string | null; address: string; totalSent: number; count: number }> = {}
  for (const tx of sent) {
    const addr: string = tx.receiver_address ?? ''
    const username: string | null = (tx.users as any)?.username ?? null
    if (!recipientMap[addr]) {
      recipientMap[addr] = { username, address: addr, totalSent: 0, count: 0 }
    }
    recipientMap[addr].totalSent += toUsd(Number(tx.amount), tx.token)
    recipientMap[addr].count += 1
  }
  const topRecipients = Object.values(recipientMap)
    .sort((a, b) => b.totalSent - a.totalSent)
    .slice(0, 5)

  // Token breakdown (raw amounts per token, not USD — useful as-is for donut)
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

  // Summary in USD
  const totalSent = sent.reduce((s, tx) => s + toUsd(Number(tx.amount), tx.token), 0)
  const totalReceived = received.reduce((s, tx) => s + toUsd(Number(tx.amount), tx.token), 0)
  const txCount = sent.length + received.length

  return {
    monthly,
    topRecipients,
    tokenBreakdown,
    summary: { totalSent, totalReceived, txCount },
  }
})
