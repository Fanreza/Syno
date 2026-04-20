<script setup lang="ts">
import { UserPlus, Trash2, Search, AlertCircle, Users } from 'lucide-vue-next'
import { watchDebounced } from '@vueuse/core'

const { apiFetch, user } = useAuth()

type Friend = { id: string; created_at: string; friend: { id: string; username: string; wallet_address: string } }

const { data: friends, refresh } = await useAsyncData<Friend[]>('friends', () => apiFetch('/api/friends'))

// ── Add friend ──────────────────────────────────────────────────────────────
const query = ref('')
const searchResults = ref<{ username: string; wallet_address: string }[]>([])
const searching = ref(false)
const addError = ref('')
const addLoading = ref(false)
const addSuccess = ref('')

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
  await apiFetch('/api/friends/remove', { method: 'POST', body: { friendId } })
  await refresh()
}

const alreadyFriendIds = computed(() => new Set(friends.value?.map(f => f.friend.id) ?? []))
</script>

<template>
  <div class="p-6 max-w-xl">
    <h1 class="text-xl font-bold mb-6">Friends</h1>

    <!-- Add friend -->
    <div class="mb-6">
      <label class="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Add friend</label>
      <div class="relative">
        <div class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
          <Search v-if="!searching" class="h-4 w-4 text-muted-foreground" />
          <span v-else class="block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
        <input
          v-model="query"
          placeholder="Search @username…"
          class="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      <!-- Search results -->
      <div v-if="searchResults.length" class="mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <button
          v-for="u in searchResults"
          :key="u.username"
          class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent"
          :disabled="alreadyFriendIds.has(u.username) || addLoading"
          @click="addFriend(u.username)"
        >
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {{ u.username[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">@{{ u.username }}</p>
            <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(u.wallet_address, 6) }}</p>
          </div>
          <span v-if="alreadyFriendIds.has(u.username)" class="text-xs text-muted-foreground">Added</span>
          <UserPlus v-else class="h-4 w-4 shrink-0 text-primary" />
        </button>
      </div>

      <p v-if="addSuccess" class="mt-2 text-sm text-green-600 dark:text-green-400">{{ addSuccess }}</p>
      <div v-if="addError" class="mt-2 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        <AlertCircle class="h-4 w-4 shrink-0" />{{ addError }}
      </div>
    </div>

    <!-- Friends list -->
    <div>
      <label class="mb-3 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Your friends ({{ friends?.length ?? 0 }})
      </label>

      <div v-if="!friends?.length" class="flex flex-col items-center rounded-2xl border border-border bg-card py-12 text-center">
        <Users class="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p class="text-sm font-medium">No friends yet</p>
        <p class="mt-1 text-xs text-muted-foreground">Search above to add someone.</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="f in friends"
          :key="f.id"
          class="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {{ f.friend.username[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">@{{ f.friend.username }}</p>
            <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(f.friend.wallet_address, 6) }}</p>
          </div>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            @click="removeFriend(f.friend.id)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
