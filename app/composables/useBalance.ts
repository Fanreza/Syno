export function useBalance() {
  const { user } = useAuth()
  const balance = useState<{ sol: number; usd: number; solPrice: number; tokens: any[] } | null>('wallet:balance', () => null)
  const pending = useState<boolean>('wallet:balance:pending', () => false)

  async function refresh() {
    const addr = user.value?.wallet_address
    if (!addr) return
    pending.value = true
    try {
      const res = await $fetch<{ sol: number; usd: number; solPrice: number; tokens: any[] }>(`/api/balance?address=${addr}`)
      balance.value = res
    } catch {}
    finally { pending.value = false }
  }

  // Auto-fetch when wallet address becomes available
  watch(() => user.value?.wallet_address, (addr) => {
    if (addr && !balance.value) refresh()
  }, { immediate: true })

  return { balance, pending, refresh }
}
