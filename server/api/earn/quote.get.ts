const QUOTE_CACHE_TTL_MS = 5_000
const quoteCache = new Map<string, { at: number; value: { inAmount: string; outAmount: string; otherAmountThreshold: string; priceImpactPct: string | undefined } }>()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const inputMint = String(query.inputMint || '')
  const outputMint = String(query.outputMint || '')
  const amount = Number(query.amount || 0)
  const decimals = Number(query.decimals ?? 0)

  if (!inputMint || !outputMint || !amount || amount <= 0 || !Number.isFinite(amount)) {
    throw createError({ statusCode: 400, statusMessage: 'inputMint, outputMint, and amount required' })
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token decimals' })
  }

  const rawAmount = Math.round(amount * Math.pow(10, decimals))
  if (!rawAmount || rawAmount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Amount is too small' })
  }

  const cacheKey = `${inputMint}:${outputMint}:${rawAmount}`
  const cached = quoteCache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.at < QUOTE_CACHE_TTL_MS) {
    return cached.value
  }

  const quote = await getJupiterQuote({
    inputMint,
    outputMint,
    amount: rawAmount,
    swapMode: 'ExactIn',
  })

  const value = {
    inAmount: quote.inAmount,
    outAmount: quote.outAmount,
    otherAmountThreshold: quote.otherAmountThreshold,
    priceImpactPct: quote.priceImpactPct,
  }
  quoteCache.set(cacheKey, { at: now, value })
  return value
})
