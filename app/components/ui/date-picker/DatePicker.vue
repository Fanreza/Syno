<script setup lang="ts">
import { ref, computed } from 'vue'
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { Calendar } from '~/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Button } from '~/components/ui/button'

const props = defineProps<{ modelValue?: string; placeholder?: string; min?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const minDate = computed(() => {
  if (!props.min) return today(getLocalTimeZone())
  const [y, m, d] = props.min.split('-').map(Number)
  return new CalendarDate(y, m, d)
})

const calValue = computed(() => {
  if (!props.modelValue) return undefined
  const [y, m, d] = props.modelValue.split('-').map(Number)
  return new CalendarDate(y, m, d)
})

function onSelect(val: any) {
  if (!val) return
  const iso = `${val.year}-${String(val.month).padStart(2, '0')}-${String(val.day).padStart(2, '0')}`
  emit('update:modelValue', iso)
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        class="w-full justify-start text-left font-normal"
        :class="!modelValue && 'text-muted-foreground'"
      >
        <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
        <span>{{ modelValue ? df.format(calValue!.toDate(getLocalTimeZone())) : (placeholder ?? 'Pick a date') }}</span>
        <span v-if="modelValue" class="ml-auto text-xs text-muted-foreground hover:text-foreground" @click.stop="clear">✕</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        :model-value="calValue"
        :min-value="minDate"
        initial-focus
        @update:model-value="onSelect"
      />
    </PopoverContent>
  </Popover>
</template>
