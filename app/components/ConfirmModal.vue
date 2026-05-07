<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

const { confirmState, onConfirm, onCancel } = useConfirm()
</script>

<template>
  <Dialog :open="confirmState.open" @update:open="(v) => { if (!v) onCancel() }">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ confirmState.title }}</DialogTitle>
        <DialogDescription v-if="confirmState.message">{{ confirmState.message }}</DialogDescription>
      </DialogHeader>
      <DialogFooter class="mt-2 flex gap-2">
        <Button variant="outline" class="flex-1" @click="onCancel">Cancel</Button>
        <Button
          class="flex-1"
          :variant="confirmState.destructive ? 'destructive' : 'default'"
          @click="onConfirm"
        >{{ confirmState.confirmLabel }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
