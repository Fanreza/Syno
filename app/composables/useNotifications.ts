export function useNotifications() {
  const { apiFetch } = useAuth()
  const unread = useState<number>('notif-unread', () => 0)

  async function fetchUnread() {
    try {
      const res = await apiFetch<{ unread: number }>('/api/notifications')
      unread.value = res.unread
    } catch {}
  }

  return { unread, fetchUnread }
}
