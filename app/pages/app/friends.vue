<script setup lang="ts">
import { UserPlus, Trash2, Search, AlertCircle, Users, UserCheck, Loader2 } from 'lucide-vue-next'
import { watchDebounced } from '@vueuse/core'

const { apiFetch, user } = useAuth()

type Friend = { id: string; created_at: string; friend: { id: string; username: string; wallet_address: string } }

const { data: friends, refresh } = await useAsyncData<Friend[]>('friends', () => apiFetch('/api/friends'))

const query = ref('')
const searchResults = ref<{ username: string; wallet_address: string }[]>([])
const searching = ref(false)
const addError = ref('')
const addLoading = ref(false)
const addSuccess = ref('')
const removingId = ref<string | null>(null)

watchDebounced(query, async (q) => {
  const val = q.trim().replace(/^@/, '')
  if (val.length < 2) { searchResults.value = []; return }
  searching.value = true
  try {
    const results = await $fetch<{ username: string; wallet_address: string }[]>('/api/users/search', { query: { q: val } })
    searchResults.value = results.filter(u => u.username !== user.value?.username)
  } catch { searchResults.value = [] }
  finally { searching.value = false }
}, { debounce: 350 })

async function addFriend(username: string) {
  addError.value = ''; addSuccess.value = ''
  addLoading.value = true
  try {
    await apiFetch('/api/friends/add', { method: 'POST', body: { username } })
    addSuccess.value = `@${username} added`
    query.value = ''; searchResults.value = []
    await refresh()
  } catch (e: any) {
    addError.value = e?.data?.statusMessage || 'Failed to add'
  } finally { addLoading.value = false }
}

async function removeFriend(friendId: string) {
  removingId.value = friendId
  try {
    await apiFetch('/api/friends/remove', { method: 'POST', body: { friendId } })
    await refresh()
  } finally { removingId.value = null }
}

const alreadyFriendIds = computed(() => new Set(friends.value?.map(f => f.friend.id) ?? []))

function avatarColor(username: string) {
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-pink-500', 'bg-orange-500', 'bg-green-500', 'bg-cyan-500', 'bg-rose-500', 'bg-amber-500']
  let hash = 0
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}
</script>

<template>
  <div class="min-h-screen p-8">

    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Friends</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Send payments faster with your contact list.</p>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <div class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
          <Search v-if="!searching" class="h-4 w-4 text-muted-foreground" />
          <span v-else class="block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
        <input
          v-model="query"
          placeholder="Search by @username to add a friend…"
          class="flex h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      <!-- Search results dropdown -->
      <div v-if="searchResults.length" class="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <button
          v-for="u in searchResults"
          :key="u.username"
          class="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-accent disabled:opacity-60"
          :disabled="alreadyFriendIds.has(u.username) || addLoading"
          @click="addFriend(u.username)"
        >
          <div :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarColor(u.username)]">
            {{ u.username[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">@{{ u.username }}</p>
            <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(u.wallet_address, 6) }}</p>
          </div>
          <div v-if="alreadyFriendIds.has(u.username)" class="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
            <UserCheck class="h-3 w-3" /> Added
          </div>
          <div v-else class="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <UserPlus class="h-3 w-3" /> Add
          </div>
        </button>
      </div>

      <p v-if="addSuccess" class="mt-2 text-sm font-medium text-green-600 dark:text-green-400">{{ addSuccess }}</p>
      <div v-if="addError" class="mt-2 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        <AlertCircle class="h-4 w-4 shrink-0" /> {{ addError }}
      </div>
    </div>

    <!-- Friends list -->
    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Your friends ({{ friends?.length ?? 0 }})
      </p>

      <div v-if="!friends?.length" class="flex flex-col items-center justify-center py-24 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          <Users class="h-7 w-7 text-muted-foreground" />
        </div>
        <p class="font-semibold">No friends yet</p>
        <p class="mt-1 text-sm text-muted-foreground">Search above to add someone.</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="f in friends"
          :key="f.id"
          class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition hover:bg-accent"
        >
          <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarColor(f.friend.username)]">
            {{ f.friend.username[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold">@{{ f.friend.username }}</p>
            <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(f.friend.wallet_address, 6) }}</p>
          </div>
          <button
            class="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            :disabled="removingId === f.friend.id"
            @click="removeFriend(f.friend.id)"
          >
            <Loader2 v-if="removingId === f.friend.id" class="h-3.5 w-3.5 animate-spin" />
            <Trash2 v-else class="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
