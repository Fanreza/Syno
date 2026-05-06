export default defineEventHandler(async (event) => {
  const { address } = getQuery(event) as { address?: string }
  if (!address) throw createError({ statusCode: 400, statusMessage: 'address required' })

  const risk = await getWalletRiskScore(address)
  return risk
})
