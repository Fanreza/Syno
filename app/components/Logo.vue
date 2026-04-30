<script setup lang="ts">
import { cn } from '~/utils'

const props = defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'md' | 'lg' | 'xl' | 'full'
  class?: string
}>()

const sizeClass = computed(() => {
  switch (props.size || 'md') {
    case 'sm': return 'h-8 w-8'
    case 'lg': return 'h-16 w-16'
    case 'xl': return 'h-20 w-20'
    default: return 'h-10 w-10'
  }
})

const roundedClass = computed(() => {
  switch (props.rounded || 'xl') {
    case 'md': return 'rounded-md'
    case 'lg': return 'rounded-lg'
    case 'full': return 'rounded-full'
    default: return 'rounded-2xl'
  }
})
</script>

<template>
  <img
    src="/syno-logo.jpeg"
    alt="Syno"
    :class="cn(sizeClass, roundedClass, 'object-cover ring-1 ring-border shadow-sm', props.class)"
  />
</template>
