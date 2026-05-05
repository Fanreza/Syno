export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
]

const STORAGE_KEY = 'syno_display_currency'
const RATE_CACHE_MS = 10 * 60 * 1000

export function useDisplayCurrency() {
  const selectedCurrency = useState<string>('display-currency', () => {
    if (import.meta.server) return 'USD'
    return localStorage.getItem(STORAGE_KEY) ?? 'USD'
  })

  const rates = useState<Record<string, number>>('display-currency-rates', () => ({ USD: 1 }))
  const ratesLoadedAt = useState<number>('display-currency-rates-ts', () => 0)
  const ratesFetching = useState<boolean>('display-currency-rates-fetching', () => false)

  async function fetchRates() {
    if (import.meta.server) return
    if (ratesFetching.value) return
    const now = Date.now()
    if (now - ratesLoadedAt.value < RATE_CACHE_MS && rates.value.USD) return

    ratesFetching.value = true
    try {
      const res = await $fetch<{ rates: Record<string, number> }>(
        'https://open.er-api.com/v6/latest/USD'
      )
      if (res?.rates) {
        rates.value = res.rates
        ratesLoadedAt.value = Date.now()
      }
    } catch {
      // keep stale rates on failure
    } finally {
      ratesFetching.value = false
    }
  }

  function setCurrency(code: string) {
    selectedCurrency.value = code
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, code)
  }

  function formatDisplay(usdAmount: number): string {
    const code = selectedCurrency.value
    const rate = rates.value[code] ?? 1
    const converted = usdAmount * rate

    const noDecimalCurrencies = ['IDR', 'JPY', 'KRW', 'VND']
    const decimals = noDecimalCurrencies.includes(code) ? 0 : 2

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(converted)
  }

  return {
    selectedCurrency,
    SUPPORTED_CURRENCIES,
    fetchRates,
    setCurrency,
    formatDisplay,
  }
}
