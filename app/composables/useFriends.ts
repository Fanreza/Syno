export interface FriendUser {
  id: string
  username: string
  wallet_address: string
}

export function useFriends() {
  const { apiFetch } = useAuth()
  const friends = useState<FriendUser[]>('friends:list', () => [])
  const loaded = useState<boolean>('friends:loaded', () => false)

  async function load() {
    if (loaded.value) return
    try {
      type Row = { friend: FriendUser }
      const data = await apiFetch<Row[]>('/api/friends')
      friends.value = data.map(r => r.friend)
      loaded.value = true
    } catch {}
  }

  return { friends, load }
}
