<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import { X, Search, Loader2, User, Users, BookUser } from 'lucide-vue-next'
import { watchDebounced } from '@vueuse/core'
import { shortAddr } from '~/utils'

export interface Contact {
  username: string | null
  wallet_address: string
  label?: string
}

type SavedContact = { id: string; wallet_address: string; label: string; note: string | null }

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ select: [contact: Contact] }>()

const { apiFetch } = useAuth()
const { friends, load: loadFriends } = useFriends()
const savedContacts = ref<SavedContact[]>([])

watch(open, async (v) => {
  if (v) {
    loadFriends()
    query.value = ''
    results.value = []
    try { savedContacts.value = await apiFetch('/api/contacts') } catch { savedContacts.value = [] }
  }
})

const query = ref('')
const results = ref<Contact[]>([])
const searching = ref(false)
const isValidSolanaAddress = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)

const invalidAddress = computed(() => {
  const q = query.value.trim()
  if (!q || q.startsWith('@') || q.length < 32) return false
  return !isValidSolanaAddress(q)
})

watchDebounced(query, async (v) => {
  const q = v.trim()
  if (!q) { results.value = []; return }

  // Raw Solana address typed directly
  if (!q.startsWith('@') && q.length >= 32) {
    if (isValidSolanaAddress(q)) {
      searching.value = true
      try {
        const res = await $fetch<Contact[]>('/api/users/search', { query: { q } })
        results.value = res.length ? res : [{ username: null, wallet_address: q }]
      } catch { results.value = [{ username: null, wallet_address: q }] }
      finally { searching.value = false }
    } else {
      results.value = []
    }
    return
  }

  const search = q.replace(/^@/, '')
  if (search.length < 2) { results.value = []; return }
  searching.value = true
  try {
    results.value = await $fetch<Contact[]>('/api/users/search', { query: { q: search } })
  } catch { results.value = [] }
  finally { searching.value = false }
}, { debounce: 350 })

function pick(contact: Contact) {
  emit('select', contact)
  open.value = false
}

const displayList = computed<Contact[]>(() =>
  query.value.trim() ? results.value : friends.value.map(f => ({ username: f.username, wallet_address: f.wallet_address }))
)

// Saved contacts not already in friends list
const filteredSavedContacts = computed(() => {
  if (query.value.trim()) return []
  const friendAddrs = new Set(friends.value.map(f => f.wallet_address))
  return savedContacts.value.filter(c => !friendAddrs.has(c.wallet_address))
})
</script>

<template>
  <DialogRoot :open="open" @update:open="open = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-[60] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3.5">
          <DialogTitle class="text-sm font-bold">Select contact</DialogTitle>
          <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="open = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Search -->
        <div class="flex items-center gap-2 border-b border-border px-4 py-3">
          <Loader2 v-if="searching" class="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          <Search v-else class="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            v-model="query"
            autofocus
            placeholder="Search @username or paste address…"
            class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button v-if="query" class="text-muted-foreground hover:text-foreground" @click="query = ''">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- List -->
        <div class="max-h-72 overflow-y-auto">
          <!-- Section label -->
          <p v-if="!query.trim() && friends.length" class="px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Users class="mr-1 inline h-3 w-3" />Friends
          </p>
          <p v-else-if="invalidAddress" class="px-4 py-8 text-center text-sm text-destructive">
            Invalid Solana address
          </p>
          <p v-else-if="query.trim() && !searching && !results.length" class="px-4 py-8 text-center text-sm text-muted-foreground">
            No results
          </p>

          <button
            v-for="contact in displayList"
            :key="contact.wallet_address"
            class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent"
            @click="pick(contact)"
          >
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              <span v-if="contact.username">{{ contact.username[0]?.toUpperCase() }}</span>
              <User v-else class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold">{{ contact.username ? '@' + contact.username : 'Wallet address' }}</p>
                <span v-if="contact.username && query.trim() && !query.trim().startsWith('@')" class="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">Registered</span>
              </div>
              <p class="font-mono text-xs text-muted-foreground truncate">{{ shortAddr(contact.wallet_address, 8) }}</p>
            </div>
          </button>

          <!-- Saved contacts section -->
          <template v-if="filteredSavedContacts.length">
            <p class="px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <BookUser class="mr-1 inline h-3 w-3" />Contacts
            </p>
            <button
              v-for="c in filteredSavedContacts"
              :key="c.wallet_address"
              class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent"
              @click="pick({ username: null, wallet_address: c.wallet_address, label: c.label })"
            >
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                {{ c.label[0]?.toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold">{{ c.label }}</p>
                <p class="font-mono text-xs text-muted-foreground truncate">{{ shortAddr(c.wallet_address, 8) }}</p>
              </div>
            </button>
          </template>

          <!-- Empty friends state -->
          <div v-if="!query.trim() && !friends.length && !savedContacts.length" class="px-4 py-8 text-center text-sm text-muted-foreground">
            No contacts yet. Add friends or contacts first.
          </div>
        </div>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
