<script setup lang="ts">
import { Plus, Trash2, Edit2, Save, X, BookUser } from 'lucide-vue-next'

const { apiFetch } = useAuth()

type Contact = {
  id: string
  wallet_address: string
  label: string
  note: string | null
  created_at: string
}

const { data: contacts, pending, refresh } = useAsyncData<Contact[]>(
  'contacts',
  () => apiFetch('/api/contacts'),
  { lazy: true, server: false, default: () => [] }
)

// Add form
const showForm = ref(false)
const newAddress = ref('')
const newLabel = ref('')
const newNote = ref('')
const saving = ref(false)
const saveError = ref('')

const canSave = computed(() => newAddress.value.trim().length >= 32 && newLabel.value.trim().length > 0)

async function onSave() {
  saveError.value = ''
  saving.value = true
  try {
    await apiFetch('/api/contacts/save', {
      method: 'POST',
      body: {
        walletAddress: newAddress.value.trim(),
        label: newLabel.value.trim(),
        note: newNote.value.trim() || undefined,
      },
    })
    showForm.value = false
    newAddress.value = ''
    newLabel.value = ''
    newNote.value = ''
    refresh()
  } catch (e: any) {
    saveError.value = e?.data?.message ?? 'Could not save contact.'
  } finally {
    saving.value = false
  }
}

// Inline edit
const editingId = ref<string | null>(null)
const editLabel = ref('')
const editNote = ref('')
const editSaving = ref(false)

function startEdit(c: Contact) {
  editingId.value = c.id
  editLabel.value = c.label
  editNote.value = c.note ?? ''
}
function cancelEdit() {
  editingId.value = null
}
async function saveEdit(c: Contact) {
  editSaving.value = true
  try {
    await apiFetch('/api/contacts/save', {
      method: 'POST',
      body: {
        walletAddress: c.wallet_address,
        label: editLabel.value.trim(),
        note: editNote.value.trim() || undefined,
      },
    })
    editingId.value = null
    refresh()
  } finally {
    editSaving.value = false
  }
}

const deletingId = ref<string | null>(null)
async function onDelete(c: Contact) {
  if (!confirm(`Delete contact "${c.label}"?`)) return
  deletingId.value = c.id
  try {
    await apiFetch(`/api/contacts/${c.id}`, { method: 'DELETE' })
    refresh()
  } finally {
    deletingId.value = null
  }
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">

    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Contacts</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">Save wallet addresses with custom labels.</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        @click="showForm = !showForm"
      >
        <Plus class="h-4 w-4" /> Add
      </button>
    </div>

    <!-- Add form -->
    <Transition name="fade-slide">
      <div v-if="showForm" class="mb-5 rounded-2xl border border-border bg-card p-5 space-y-3">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm font-semibold">New contact</p>
          <button class="text-muted-foreground hover:text-foreground" @click="showForm = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div>
          <label class="mb-1 block text-xs text-muted-foreground">Wallet address</label>
          <input
            v-model="newAddress"
            placeholder="Solana wallet address"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-muted-foreground">Label</label>
          <input
            v-model="newLabel"
            placeholder="e.g. Alice, Office rent"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-muted-foreground">Note (optional)</label>
          <input
            v-model="newNote"
            placeholder="Any note…"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <p v-if="saveError" class="text-xs text-destructive">{{ saveError }}</p>

        <button
          class="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
          :disabled="!canSave || saving"
          @click="onSave"
        >
          {{ saving ? 'Saving…' : 'Save contact' }}
        </button>
      </div>
    </Transition>

    <!-- Skeleton -->
    <div v-if="pending" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-16 skeleton rounded-2xl" />
    </div>

    <!-- List -->
    <div v-else-if="contacts && contacts.length" class="space-y-3">
      <div
        v-for="c in contacts"
        :key="c.id"
        class="rounded-2xl border border-border bg-card p-4"
      >
        <!-- View mode -->
        <div v-if="editingId !== c.id" class="flex items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
            {{ c.label[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ c.label }}</p>
            <p class="font-mono text-xs text-muted-foreground">{{ shortAddr(c.wallet_address) }}</p>
            <p v-if="c.note" class="text-[11px] text-muted-foreground italic mt-0.5 truncate">{{ c.note }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              @click="startEdit(c)"
            >
              <Edit2 class="h-3.5 w-3.5" />
            </button>
            <button
              class="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              :disabled="deletingId === c.id"
              @click="onDelete(c)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Edit mode -->
        <div v-else class="space-y-2">
          <input
            v-model="editLabel"
            placeholder="Label"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            v-model="editNote"
            placeholder="Note (optional)"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div class="flex gap-2">
            <button
              class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
              :disabled="!editLabel.trim() || editSaving"
              @click="saveEdit(c)"
            >
              <Save class="h-3.5 w-3.5" /> {{ editSaving ? 'Saving…' : 'Save' }}
            </button>
            <button
              class="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
              @click="cancelEdit"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="flex flex-col items-center justify-center py-24 text-center">
      <BookUser class="mb-4 h-10 w-10 text-muted-foreground opacity-40" />
      <p class="font-semibold">No contacts yet</p>
      <p class="mt-1 text-sm text-muted-foreground">Save wallet addresses with labels you can remember.</p>
      <button
        class="mt-4 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        @click="showForm = true"
      >
        <Plus class="h-4 w-4" /> Add contact
      </button>
    </div>

  </div>
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
