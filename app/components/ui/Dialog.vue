<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle
} from 'reka-ui'

const props = defineProps<{ open: boolean; title?: string }>()
defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <DialogRoot :open="props.open" @update:open="$emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed inset-x-0 bottom-0 z-50 w-full rounded-t-3xl bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <DialogTitle v-if="props.title" class="mb-4 text-lg font-semibold">
          {{ props.title }}
        </DialogTitle>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
