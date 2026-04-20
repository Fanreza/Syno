export default defineEventHandler(async (event) => {
  const { q } = getQuery(event) as { q?: string }

  // If query looks like a mint address (base58, 32-44 chars), fetch directly
  if (q && q.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(q)) {
    try {
      const token = await $fetch<any>(`https://tokens.jup.ag/token/${q}`)
      if (token?.address) return [token]
    } catch {}
    return []
  }

  // Search by name/symbol
  if (q && q.length >= 1) {
    try {
      const results = await $fetch<any[]>(`https://tokens.jup.ag/tokens/search?query=${encodeURIComponent(q)}&limit=20`)
      return Array.isArray(results) ? results : []
    } catch {}
  }

  // Default: return popular tokens
  try {
    const tokens = await $fetch<any[]>('https://tokens.jup.ag/tokens?tags=verified&limit=20')
    return Array.isArray(tokens) ? tokens.slice(0, 20) : []
  } catch {}

  return []
})
