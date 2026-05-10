export interface FriendUser {
  id: string
  username: string
  wallet_address: string
  label?: string | null
}

export function useFriends() {
  const { apiFetch } = useAuth()
  const friends = useState<FriendUser[]>('friends:list', () => [])
  const loaded = useState<boolean>('friends:loaded', () => false)

  async function load() {
    if (loaded.value) return
    try {
      type Row = { label: string | null; friend: FriendUser }
      const data = await apiFetch<Row[]>('/api/friends')
      friends.value = data.map(r => ({ ...r.friend, label: r.label }))
      loaded.value = true
    } catch {}
  }

  async function reload() {
    loaded.value = false
    await load()
  }

  return { friends, load, reload }
}
