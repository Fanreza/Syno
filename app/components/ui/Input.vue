<script setup lang="ts">
import { cn } from '~/utils'
const props = defineProps<{
  modelValue?: string | number
  type?: string
  placeholder?: string
  disabled?: boolean
  class?: string
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <input
    :type="props.type || 'text'"
    :value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :class="cn('flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', props.class)"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
