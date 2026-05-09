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

  // Clear stale balance when user changes, then fetch for new address.
  // Only fetch on initial mount if balance isn't cached yet — prevents
  // multiple components calling useBalance() from each triggering a refresh.
  watch(() => user.value?.wallet_address, (addr, prev) => {
    if (addr !== prev) { balance.value = null; refresh() }
    else if (addr && !balance.value) refresh()
  }, { immediate: true })

  return { balance, pending, refresh }
}
