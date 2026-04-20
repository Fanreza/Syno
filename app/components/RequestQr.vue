<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{ url: string }>()
const canvas = ref<HTMLCanvasElement | null>(null)

async function render() {
  if (!canvas.value || !props.url) return
  await QRCode.toCanvas(canvas.value, props.url, {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  })
}

onMounted(render)
watch(() => props.url, render)
</script>

<template>
  <div class="flex justify-center">
    <div class="rounded-2xl border border-border bg-white p-3 shadow-sm">
      <canvas ref="canvas" class="block rounded-xl" />
    </div>
  </div>
</template>
