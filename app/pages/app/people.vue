<script setup lang="ts">
import { UserPlus, Trash2, Search, AlertCircle, Users, UserCheck, Loader2, Plus, Edit2, Save, X, BookUser } from 'lucide-vue-next'
import { watchDebounced } from '@vueuse/core'
import { toast } from 'vue-sonner'

const { apiFetch, user } = useAuth()
const { confirm } = useConfirm()
const { startTourIfNew } = useOnboarding()
onMounted(() => setTimeout(() => startTourIfNew('people'), 1200))

const tab = ref<'friends' | 'contacts'>('friends')

// ── Friends ──────────────────────────────────────────────────────────────────

type Friend = { id: string; created_at: string; friend: { id: string; username: string; wallet_address: string } }

const { data: friends, refresh: refreshFriends, pending: pendingFriends } = useAsyncData<Friend[]>(
  'friends', () => apiFetch('/api/friends'), { lazy: true }
)

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
    toast.success(`@${username} added as a friend`)
    query.value = ''; searchResults.value = []
    await refreshFriends()
  } catch (e: any) {
    addError.value = e?.data?.statusMessage || 'Failed to add'
    toast.error(addError.value)
  } finally { addLoading.value = false }
}

async function removeFriend(friendId: string) {
  const ok = await confirm({ title: 'Remove friend', message: 'They will be removed from your friends list.', confirmLabel: 'Remove', destructive: true })
  if (!ok) return
  removingId.value = friendId
  try {
    await apiFetch('/api/friends/remove', { method: 'POST', body: { friendId } })
    toast.success('Friend removed')
    await refreshFriends()
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Failed to remove friend')
  } finally { removingId.value = null }
}

const alreadyFriendIds = computed(() => new Set(friends.value?.map(f => f.friend.id) ?? []))

function avatarColor(username: string) {
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-pink-500', 'bg-orange-500', 'bg-green-500', 'bg-cyan-500', 'bg-rose-500', 'bg-amber-500']
  let hash = 0
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

// ── Contacts ─────────────────────────────────────────────────────────────────

type Contact = { id: string; wallet_address: string; label: string; note: string | null }

const { data: contacts, pending: pendingContacts, refresh: refreshContacts } = useAsyncData<Contact[]>(
  'contacts', () => apiFetch('/api/contacts'), { lazy: true, default: () => [] }
)

const showContactForm = ref(false)
const newAddress = ref('')
const newLabel = ref('')
const newNote = ref('')
const contactSaving = ref(false)
const contactSaveError = ref('')

const canSaveContact = computed(() => newAddress.value.trim().length >= 32 && newLabel.value.trim().length > 0)

async function onSaveContact() {
  contactSaveError.value = ''
  contactSaving.value = true
  try {
    await apiFetch('/api/contacts/save', {
      method: 'POST',
      body: { walletAddress: newAddress.value.trim(), label: newLabel.value.trim(), note: newNote.value.trim() || undefined },
    })
    showContactForm.value = false
    newAddress.value = ''; newLabel.value = ''; newNote.value = ''
    toast.success('Contact saved')
    refreshContacts()
  } catch (e: any) {
    contactSaveError.value = e?.data?.message ?? 'Could not save contact.'
    toast.error(contactSaveError.value)
  } finally { contactSaving.value = false }
}

const editingContactId = ref<string | null>(null)
const editLabel = ref('')
const editNote = ref('')
const editSaving = ref(false)

function startEditContact(c: Contact) { editingContactId.value = c.id; editLabel.value = c.label; editNote.value = c.note ?? '' }
function cancelEditContact() { editingContactId.value = null }

async function saveEditContact(c: Contact) {
  editSaving.value = true
  try {
    await apiFetch('/api/contacts/save', {
      method: 'POST',
      body: { walletAddress: c.wallet_address, label: editLabel.value.trim(), note: editNote.value.trim() || undefined },
    })
    editingContactId.value = null
    toast.success('Contact updated')
    refreshContacts()
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not update contact.')
  } finally { editSaving.value = false }
}

const deletingContactId = ref<string | null>(null)
async function onDeleteContact(c: Contact) {
  const ok = await confirm({ title: `Delete "${c.label}"?`, message: 'This contact will be removed permanently.', confirmLabel: 'Delete', destructive: true })
  if (!ok) return
  deletingContactId.value = c.id
  try {
    await apiFetch(`/api/contacts/${c.id}`, { method: 'DELETE' })
    toast.success('Contact deleted')
    refreshContacts()
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Could not delete contact.')
  } finally { deletingContactId.value = null }
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">

    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">People</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Friends and saved contacts.</p>
      </div>
      <button
        v-if="tab === 'contacts'"
        class="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        @click="showContactForm = !showContactForm"
      >
        <Plus class="h-4 w-4" /> Add
      </button>
    </div>

    <!-- Tabs -->
    <div class="mb-5 flex gap-1 rounded-xl border border-border bg-secondary p-1">
      <button
        data-tour="people-friends"
        class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition"
        :class="tab === 'friends' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = 'friends'"
      >
        <Users class="h-4 w-4" /> Friends
        <span v-if="friends?.length" class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{{ friends.length }}</span>
      </button>
      <button
        data-tour="people-contacts"
        class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition"
        :class="tab === 'contacts' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="tab = 'contacts'"
      >
        <BookUser class="h-4 w-4" /> Contacts
        <span v-if="contacts?.length" class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{{ contacts.length }}</span>
      </button>
    </div>

    <!-- ── FRIENDS TAB ── -->
    <template v-if="tab === 'friends'">
      <!-- Search -->
      <div class="mb-5">
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

        <div v-if="searchResults.length" class="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <button
            v-for="u in searchResults"
            :key="u.username"
            class="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-accent disabled:opacity-60"
            :disabled="alreadyFriendIds.has(u.username) || addLoading"
            @click="addFriend(u.username)"
          >
            <div :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarColor(u.username)]">
              {{ (u.username[0] ?? '?').toUpperCase() }}
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
      <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Your friends ({{ friends?.length ?? 0 }})
      </p>

      <div v-if="pendingFriends" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-16 skeleton rounded-2xl" />
      </div>

      <div v-else-if="!friends?.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <Users class="h-6 w-6 text-muted-foreground" />
        </div>
        <p class="font-semibold">No friends yet</p>
        <p class="mt-1 text-sm text-muted-foreground">Search above to add someone.</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="(f, i) in friends"
          :key="f.id"
          class="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition hover:bg-accent animate-item-in"
          :style="`animation-delay: ${i * 40}ms`"
        >
          <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarColor(f.friend.username)]">
            {{ (f.friend.username[0] ?? '?').toUpperCase() }}
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
    </template>

    <!-- ── CONTACTS TAB ── -->
    <template v-else>
      <!-- Add form -->
      <Transition name="fade-slide">
        <div v-if="showContactForm" class="mb-5 rounded-2xl border border-border bg-card p-5 space-y-3">
          <div class="flex items-center justify-between mb-1">
            <p class="text-sm font-semibold">New contact</p>
            <button class="text-muted-foreground hover:text-foreground" @click="showContactForm = false"><X class="h-4 w-4" /></button>
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Wallet address</label>
            <input v-model="newAddress" placeholder="Solana wallet address" class="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Label</label>
            <input v-model="newLabel" placeholder="e.g. Alice, Office rent" class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted-foreground">Note (optional)</label>
            <input v-model="newNote" placeholder="Any note…" class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <p v-if="contactSaveError" class="text-xs text-destructive">{{ contactSaveError }}</p>
          <button
            class="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
            :disabled="!canSaveContact || contactSaving"
            @click="onSaveContact"
          >{{ contactSaving ? 'Saving…' : 'Save contact' }}</button>
        </div>
      </Transition>

      <!-- Contacts list -->
      <div v-if="pendingContacts" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-16 skeleton rounded-2xl" />
      </div>

      <div v-else-if="!contacts?.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <BookUser class="h-6 w-6 text-muted-foreground" />
        </div>
        <p class="font-semibold">No contacts yet</p>
        <p class="mt-1 text-sm text-muted-foreground">Save wallet addresses with labels you can remember.</p>
        <button
          class="mt-4 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          @click="showContactForm = true"
        >
          <Plus class="h-4 w-4" /> Add contact
        </button>
      </div>

      <div v-else class="space-y-2">
        <div v-for="c in contacts" :key="c.id" class="rounded-2xl border border-border bg-card p-4">
          <div v-if="editingContactId !== c.id" class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {{ c.label[0]?.toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold">{{ c.label }}</p>
              <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(c.wallet_address, 8) }}</p>
              <p v-if="c.note" class="text-[11px] text-muted-foreground italic mt-0.5 truncate">{{ c.note }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground" @click="startEditContact(c)">
                <Edit2 class="h-3.5 w-3.5" />
              </button>
              <button
                class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                :disabled="deletingContactId === c.id"
                @click="onDeleteContact(c)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div v-else class="space-y-2">
            <input v-model="editLabel" placeholder="Label" class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <input v-model="editNote" placeholder="Note (optional)" class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <div class="flex gap-2">
              <button
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
                :disabled="!editLabel.trim() || editSaving"
                @click="saveEditContact(c)"
              >
                <Save class="h-3.5 w-3.5" /> {{ editSaving ? 'Saving…' : 'Save' }}
              </button>
              <button class="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent" @click="cancelEditContact">
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
