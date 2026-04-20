<script setup lang="ts">
const router = useRouter()
const progress = ref(0)
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let interval: ReturnType<typeof setInterval> | null = null

function start() {
  progress.value = 0
  visible.value = true
  if (interval) clearInterval(interval)
  // Trickle up to 85% then stall
  interval = setInterval(() => {
    if (progress.value < 85) {
      progress.value += Math.random() * 8
      if (progress.value > 85) progress.value = 85
    }
  }, 120)
}

function finish() {
  if (interval) clearInterval(interval)
  progress.value = 100
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    visible.value = false
    progress.value = 0
  }, 300)
}

router.beforeEach(() => { start() })
router.afterEach(() => { finish() })
</script>

<template>
  <Transition name="progress-fade">
    <div
      v-if="visible"
      class="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
    >
      <div
        class="h-full rounded-full transition-all ease-out"
        style="background: linear-gradient(90deg, hsl(252 85% 65%), hsl(280 80% 65%));"
        :style="{ width: `${progress}%`, transitionDuration: progress === 100 ? '200ms' : '120ms' }"
      />
    </div>
  </Transition>
</template>

<style scoped>
.progress-fade-leave-active { transition: opacity 0.3s ease; }
.progress-fade-leave-to { opacity: 0; }
</style>
