const CACHE_TTL_MS = 5 * 60 * 1000

let cachedEarnTokens: any[] | null = null
let cachedAt = 0

export async function getCachedEarnTokens(): Promise<any[]> {
  const now = Date.now()
  if (cachedEarnTokens && now - cachedAt < CACHE_TTL_MS) {
    return cachedEarnTokens
  }

  const config = useRuntimeConfig()
  const apiKey = (config as any).jupiterApiKey || process.env.JUPITER_API_KEY || ''

  const data = await $fetch<any[]>('https://api.jup.ag/lend/v1/earn/tokens', {
    headers: apiKey ? { 'x-api-key': apiKey } : {},
    retry: 0,
  })

  cachedEarnTokens = Array.isArray(data) ? data : []
  cachedAt = now
  return cachedEarnTokens
}
