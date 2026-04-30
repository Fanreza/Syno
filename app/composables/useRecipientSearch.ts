import { watchDebounced } from '@vueuse/core'

export type RecipientStatus = 'idle' | 'searching' | 'found' | 'not-found' | 'address' | 'invalid-address'
export type RecipientUser = { username: string; wallet_address: string }

export function useRecipientSearch() {
  const raw = ref('')
  const user = ref<RecipientUser | null>(null)
  const status = ref<RecipientStatus>('idle')

  const isRawAddress = (v: string) => !v.startsWith('@') && isValidSolanaAddress(v)
  const looksLikeAddress = (v: string) => !v.startsWith('@') && v.length >= 32

  watchDebounced(raw, async (v) => {
    const val = v.trim()
    if (!val) { status.value = 'idle'; user.value = null; return }

    if (looksLikeAddress(val)) {
      if (!isRawAddress(val)) { status.value = 'invalid-address'; user.value = null; return }
      status.value = 'searching'; user.value = null
      try {
        const results = await $fetch<RecipientUser[]>('/api/users/search', { query: { q: val } })
        if (results[0]) { user.value = results[0]; status.value = 'found' }
        else status.value = 'address'
      } catch { status.value = 'address' }
      return
    }

    const q = val.replace(/^@/, '')
    if (q.length < 2) { status.value = 'idle'; user.value = null; return }
    status.value = 'searching'; user.value = null
    try {
      const results = await $fetch<RecipientUser[]>('/api/users/search', { query: { q } })
      const exact = results.find(u => u.username.toLowerCase() === q.toLowerCase())
      const match = exact ?? results[0]
      if (match) { user.value = match; status.value = 'found' }
      else status.value = 'not-found'
    } catch { status.value = 'not-found' }
  }, { debounce: 400 })

  function select(u: RecipientUser) {
    raw.value = '@' + u.username
    user.value = u
    status.value = 'found'
  }

  function reset() {
    raw.value = ''; user.value = null; status.value = 'idle'
  }

  return { raw, user, status, select, reset }
}
