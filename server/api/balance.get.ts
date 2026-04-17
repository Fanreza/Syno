
export default defineEventHandler(async (event) => {
  const { address } = getQuery(event) as { address?: string }
  if (!address) throw createError({ statusCode: 400, statusMessage: 'address required' })

  const sol = await getSolBalance(address).catch(() => 0)

  let solPrice = 0
  try {
    const p = await $fetch<any>('https://price.jup.ag/v6/price?ids=SOL')
    solPrice = p?.data?.SOL?.price || 0
  } catch {}

  return { address, sol, usd: sol * solPrice, solPrice }
})
