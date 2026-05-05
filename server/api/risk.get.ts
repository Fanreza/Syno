export default defineEventHandler(async (event) => {
  await requireUser(event)
  const { address } = getQuery(event) as { address?: string }
  if (!address) throw createError({ statusCode: 400, statusMessage: 'address required' })

  const risk = await getWalletRiskScore(address)
  return risk
})
