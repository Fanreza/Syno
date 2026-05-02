export default defineEventHandler(async (event) => {
  await requireUser(event)
  const q = getQuery(event)

  if (!q.inputMint || !q.outputMint || !q.amount) {
    throw createError({ statusCode: 400, statusMessage: 'inputMint, outputMint, amount required' })
  }

  const decimals = Number(q.inputDecimals ?? 9)
  const amount = Math.round(Number(q.amount) * Math.pow(10, decimals))

  const quote = await getJupiterQuote({
    inputMint: String(q.inputMint),
    outputMint: String(q.outputMint),
    amount,
    slippageBps: Number(q.slippageBps ?? 50),
    swapMode: 'ExactIn',
  })

  return quote
})
