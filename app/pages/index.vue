<script setup lang="ts">
import { Shield, Users, RefreshCw, ArrowRight, ChevronDown, Plus, Minus } from 'lucide-vue-next'

definePageMeta({ layout: false, ssr: false })

const tickerItems = [
  { from: '@budi', to: '@rina', amount: '0.05 SOL', note: 'dinner split' },
  { from: '@alex', to: '@mia', amount: '0.12 SOL', note: 'coffee run' },
  { from: '@joko', to: '@sari', amount: '0.30 SOL', note: 'rent share' },
  { from: '@devi', to: '@hana', amount: '0.08 SOL', note: 'grab split' },
  { from: '@rafi', to: '@nina', amount: '0.20 SOL', note: 'movie night' },
  { from: '@tama', to: '@lena', amount: '0.15 SOL', note: 'birthday gift' },
]

const faqItems = [
  {
    q: 'Is Payra free?',
    a: 'Sending and receiving costs nothing. Solana network fees are usually under $0.001. If you use auto-convert, Jupiter charges a small routing fee that you see before confirming.',
  },
  {
    q: 'Do I need a crypto wallet to sign up?',
    a: 'No. Sign up with email or Google and Payra creates a Solana wallet for you. You can also connect Phantom or Solflare if you already have one.',
  },
  {
    q: 'How do private transactions work?',
    a: 'Your payment goes through a privacy layer that hides the amount and recipient from public blockchain explorers. Only the sender and receiver can see the details.',
  },
  {
    q: 'Which tokens can I send?',
    a: 'Any SPL token on Solana — SOL, USDC, USDT, BONK, and more. Auto-convert lets you pay with one token while the recipient gets a different one, routed through Jupiter.',
  },
  {
    q: 'Can I split a bill unevenly?',
    a: 'Yes. The default is an even split, but you can set a custom amount per person before sending.',
  },
  {
    q: 'What if someone never pays their share?',
    a: 'The split stays open until everyone pays or you close it manually. You can nudge people from the split detail page.',
  },
  {
    q: 'Who controls the wallet keys?',
    a: "Privy manages the embedded wallet. The private key never touches Payra's servers or your browser. You can also export it anytime from your profile.",
  },
  {
    q: 'Which network is this on?',
    a: 'Solana devnet right now. Mainnet when the beta wraps up.',
  },
]

const openFaq = ref<number | null>(null)
function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

const heroVisible = ref(false)
const feat1Visible = ref(false)
const feat2Visible = ref(false)
const feat3Visible = ref(false)

onMounted(() => {
  heroVisible.value = true

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (e.target.id === 'feat1') feat1Visible.value = true
        if (e.target.id === 'feat2') feat2Visible.value = true
        if (e.target.id === 'feat3') feat3Visible.value = true
      }
    })
  }, { threshold: 0.15 })

  ;['feat1', 'feat2', 'feat3'].forEach(id => {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  })
})
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-white text-foreground">

    <!-- Navbar -->
    <header class="fixed top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-xl">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-5 md:px-10 py-4">
        <div class="flex items-center gap-2.5">
          <img src="/icon.jpeg" alt="Payra" class="h-8 w-8 rounded-xl object-cover shadow-sm" />
          <span class="text-lg font-bold tracking-tight">Payra</span>
        </div>
        <div class="flex items-center gap-3 md:gap-6">
          <a href="#features" class="hidden md:block text-sm text-muted-foreground transition hover:text-foreground">Features</a>
          <a href="#how" class="hidden md:block text-sm text-muted-foreground transition hover:text-foreground">How it works</a>
          <a href="#faq" class="hidden md:block text-sm text-muted-foreground transition hover:text-foreground">FAQ</a>
          <NuxtLink to="/login" class="rounded-xl bg-primary px-4 md:px-6 py-2 md:py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90">
            Get Started
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative flex min-h-screen items-center overflow-hidden pt-20">

      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -top-40 left-1/2 h-[500px] w-[500px] md:h-[700px] md:w-[700px] -translate-x-1/2 rounded-full opacity-20"
          style="background: radial-gradient(circle, hsl(222 55% 35%) 0%, transparent 70%)" />
        <div class="absolute bottom-0 right-0 h-[300px] w-[300px] md:h-[400px] md:w-[400px] rounded-full opacity-10"
          style="background: radial-gradient(circle, hsl(222 55% 45%) 0%, transparent 70%)" />
      </div>

      <div class="pointer-events-none absolute inset-0 opacity-[0.03]"
        style="background-image: radial-gradient(circle, hsl(222 55% 12%) 1px, transparent 1px); background-size: 32px 32px" />

      <div class="relative mx-auto w-full max-w-6xl px-5 md:px-10 py-16 md:py-20">
        <div class="flex flex-col md:flex-row items-center gap-12 md:gap-20">

          <!-- Left -->
          <div class="flex-1 text-center md:text-left" :class="heroVisible ? 'animate-slide-up' : 'opacity-0'">
            <h1 class="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
              Crypto<br />payments,<br />
              <span class="text-shimmer">done right.</span>
            </h1>

            <p class="mt-6 mx-auto md:mx-0 max-w-md text-lg md:text-xl leading-relaxed text-muted-foreground">
              Send to <span class="font-semibold text-foreground">@username</span> instead of a 44-character address. Split bills, go private, auto-convert any token.
            </p>

            <div class="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 md:gap-4">
              <NuxtLink to="/login"
                class="group w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl"
                style="background: linear-gradient(135deg, hsl(222 55% 12%) 0%, hsl(222 40% 28%) 100%)">
                Start for free
                <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </NuxtLink>
              <a href="#features" class="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-border px-8 py-4 text-base font-semibold transition hover:bg-secondary">
                See features <ChevronDown class="h-4 w-4" />
              </a>
            </div>

            <div class="mt-10 flex items-center justify-center md:justify-start gap-8">
              <div v-for="s in [{ v: '<1s', l: 'settlement' }, { v: '~$0', l: 'gas fees' }, { v: 'SOL', l: 'powered by' }]" :key="s.l">
                <p class="text-2xl font-extrabold text-primary">{{ s.v }}</p>
                <p class="text-xs text-muted-foreground">{{ s.l }}</p>
              </div>
            </div>
          </div>

          <!-- Right: Floating UI cards — hidden on small screens -->
          <div class="relative w-80 md:w-96 shrink-0 hidden sm:block" :class="heroVisible ? 'animate-fade-in delay-300' : 'opacity-0'">

            <div class="animate-float relative z-10 overflow-hidden rounded-3xl shadow-2xl animate-pulse-glow"
              style="background: linear-gradient(135deg, hsl(222 55% 12%) 0%, hsl(222 40% 22%) 100%)">
              <div class="p-6">
                <div class="mb-1 text-xs font-medium text-white/50">Total Balance</div>
                <div class="text-4xl font-bold text-white">$142.80</div>
                <div class="mt-0.5 text-sm text-white/60">1.2450 SOL</div>
                <div class="mt-4 text-xs font-mono text-white/30">8xKp…3qRf</div>
              </div>
              <div class="border-t border-white/10 px-6 py-4">
                <div class="grid grid-cols-4 gap-2">
                  <div v-for="l in ['Send', 'Receive', 'Split', 'Swap']" :key="l"
                    class="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 p-2.5">
                    <div class="h-4 w-4 rounded bg-white/30" />
                    <span class="text-[9px] font-medium text-white/70">{{ l }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="animate-float-slow absolute -right-8 top-4 z-20 rounded-2xl px-4 py-3 shadow-xl"
              style="background: white; border: 1px solid hsl(220 15% 90%); animation-delay: 0.5s">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style="background: linear-gradient(135deg, hsl(222 55% 12%), hsl(222 40% 28%))">A</div>
                <div>
                  <p class="text-xs font-semibold">Sent to @rina</p>
                  <p class="text-[11px] text-muted-foreground">0.05 SOL · just now</p>
                </div>
                <div class="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">✓</div>
              </div>
            </div>

            <div class="animate-float-slow absolute -left-10 bottom-16 z-20 rounded-2xl px-4 py-3 shadow-xl"
              style="background: white; border: 1px solid hsl(220 15% 90%); animation-delay: 1.2s">
              <p class="mb-2 text-xs font-semibold">🍜 Dinner Split</p>
              <div class="space-y-1">
                <div v-for="(p, i) in [{ n: '@budi', paid: true }, { n: '@rafi', paid: true }, { n: '@sari', paid: false }]" :key="i"
                  class="flex items-center justify-between gap-4 text-[11px]">
                  <span class="text-muted-foreground">{{ p.n }}</span>
                  <span :class="p.paid ? 'text-green-600 font-semibold' : 'text-orange-500'">
                    {{ p.paid ? 'Paid ✓' : 'Pending' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="animate-float absolute -right-4 bottom-4 z-20 rounded-2xl px-4 py-3 shadow-xl"
              style="background: white; border: 1px solid hsl(220 15% 90%); animation-delay: 2s">
              <div class="flex items-center gap-2">
                <RefreshCw class="h-4 w-4 text-primary" />
                <div>
                  <p class="text-xs font-semibold">Auto-converted</p>
                  <p class="text-[10px] text-muted-foreground">USDC → SOL instantly</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <!-- Live ticker -->
    <div class="overflow-hidden border-y border-border bg-secondary/60 py-3">
      <div class="flex animate-ticker whitespace-nowrap">
        <div v-for="(tx, i) in [...tickerItems, ...tickerItems]" :key="i"
          class="mx-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span class="font-semibold text-foreground">{{ tx.from }}</span>
          <span>→</span>
          <span class="font-semibold text-foreground">{{ tx.to }}</span>
          <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{{ tx.amount }}</span>
          <span class="text-muted-foreground/60">{{ tx.note }}</span>
          <span class="mx-4 text-border">·</span>
        </div>
      </div>
    </div>

    <!-- Features -->
    <section id="features" class="py-20 md:py-32">
      <div class="mx-auto max-w-6xl px-5 md:px-10">
        <div class="mb-12 md:mb-20 text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-primary/70">Why Payra</p>
          <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight">What makes it<br />different.</h2>
        </div>

        <!-- Feature 1: Private Transaction -->
        <div id="feat1" class="mb-16 md:mb-24 flex flex-col md:flex-row items-center gap-10 md:gap-20 transition-all duration-700"
          :class="feat1Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'">
          <div class="relative w-full md:w-96 md:shrink-0">
            <div class="relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-2xl noise"
              style="background: linear-gradient(135deg, hsl(222 55% 10%) 0%, hsl(240 40% 18%) 100%)">
              <div class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
                style="background: radial-gradient(circle, hsl(260 80% 70%) 0%, transparent 70%)" />
              <div class="relative z-10 space-y-3">
                <div class="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <Shield class="h-5 w-5 text-purple-300 shrink-0" />
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-white">Transaction hidden</p>
                    <p class="text-xs text-white/50">Only sender and receiver can see</p>
                  </div>
                  <span class="ml-auto shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">PRIVATE</span>
                </div>
                <div class="rounded-2xl bg-white/5 px-4 py-3">
                  <p class="text-xs text-white/40">Transaction hash</p>
                  <p class="mt-1 font-mono text-xs text-white/20">●●●●●●●●●●●●●●●●●●●●●●●●</p>
                </div>
                <div class="rounded-2xl bg-white/5 px-4 py-3">
                  <p class="text-xs text-white/40">Amount</p>
                  <p class="mt-1 font-mono text-sm font-bold text-white/30">● ● ●  S O L</p>
                </div>
                <div class="flex items-center justify-center gap-2 pt-2">
                  <div v-for="i in 3" :key="i" class="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" :style="`animation-delay:${i*0.2}s`" />
                  <p class="text-xs text-purple-300/70">Zero-knowledge proof active</p>
                </div>
              </div>
            </div>
            <div class="absolute -right-3 md:-right-6 -top-4 rounded-2xl bg-purple-600 px-3 md:px-4 py-2 text-sm font-bold text-white shadow-lg">
              🔒 Private
            </div>
          </div>
          <div class="flex-1 text-center md:text-left">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5">
              <Shield class="h-4 w-4 text-purple-600" />
              <span class="text-sm font-semibold text-purple-700">Private Transactions</span>
            </div>
            <h3 class="mb-4 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">Your money,<br />your business.</h3>
            <p class="mb-6 text-base md:text-lg leading-relaxed text-muted-foreground">
              On-chain transactions are public by default. Anyone can look up your wallet and see exactly what you sent, to whom, and when. Payra routes payments through a privacy layer so that doesn't happen.
            </p>
            <ul class="space-y-3 text-left">
              <li v-for="t in ['Amount hidden from public explorers', 'Recipient address not exposed on-chain', 'Only the two parties can see the details']" :key="t"
                class="flex items-start gap-3 text-sm">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs font-bold">✓</span>
                <span class="text-muted-foreground">{{ t }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Feature 2: Split Bill -->
        <div id="feat2" class="mb-16 md:mb-24 flex flex-col-reverse md:flex-row items-center gap-10 md:gap-20 transition-all duration-700"
          :class="feat2Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'">
          <div class="flex-1 text-center md:text-left">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5">
              <Users class="h-4 w-4 text-blue-600" />
              <span class="text-sm font-semibold text-blue-700">Split Bills</span>
            </div>
            <h3 class="mb-4 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">No more awkward<br />"you owe me" texts.</h3>
            <p class="mb-6 text-base md:text-lg leading-relaxed text-muted-foreground">
              Create a split, share a link to each person, and watch who pays. No more chasing people down or doing mental math on who owes what.
            </p>
            <ul class="space-y-3 text-left">
              <li v-for="t in ['Even split or custom amount per person', 'Each participant gets their own payment link', 'Live status updates as people pay']" :key="t"
                class="flex items-start gap-3 text-sm">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">✓</span>
                <span class="text-muted-foreground">{{ t }}</span>
              </li>
            </ul>
          </div>
          <div class="relative w-full md:w-96 md:shrink-0">
            <div class="overflow-hidden rounded-3xl bg-white p-5 md:p-6 shadow-2xl" style="border: 1px solid hsl(220 15% 88%)">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-bold">🍣 Sushi Tei Dinner</p>
                  <p class="text-xs text-muted-foreground">0.45 SOL total · 4 people</p>
                </div>
                <span class="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Open</span>
              </div>
              <div class="mb-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div class="h-full w-3/4 rounded-full transition-all" style="background: linear-gradient(90deg, hsl(222 55% 12%), hsl(222 40% 35%))" />
              </div>
              <p class="mb-3 text-xs text-muted-foreground">3 of 4 paid</p>
              <div class="space-y-2">
                <div v-for="(p, i) in [
                  { n: '@budi', amt: '0.11 SOL', paid: true },
                  { n: '@rina', amt: '0.11 SOL', paid: true },
                  { n: '@alex', amt: '0.11 SOL', paid: true },
                  { n: '@sari', amt: '0.12 SOL', paid: false },
                ]" :key="i" class="flex items-center justify-between rounded-xl px-3 py-2.5"
                  :class="p.paid ? 'bg-green-50' : 'bg-orange-50'">
                  <span class="text-sm font-medium">{{ p.n }}</span>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs text-muted-foreground">{{ p.amt }}</span>
                    <span :class="p.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                      class="rounded-full px-2 py-0.5 text-[10px] font-bold">
                      {{ p.paid ? 'Paid ✓' : 'Pending' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="absolute -left-3 md:-left-6 -top-4 rounded-2xl bg-blue-600 px-3 md:px-4 py-2 text-sm font-bold text-white shadow-lg">
              👥 Split
            </div>
          </div>
        </div>

        <!-- Feature 3: Auto Convert -->
        <div id="feat3" class="flex flex-col md:flex-row items-center gap-10 md:gap-20 transition-all duration-700"
          :class="feat3Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'">
          <div class="relative w-full md:w-96 md:shrink-0">
            <div class="overflow-hidden rounded-3xl p-6 md:p-8 shadow-2xl noise"
              style="background: linear-gradient(135deg, hsl(160 60% 10%) 0%, hsl(180 50% 14%) 100%)">
              <div class="space-y-4">
                <div class="rounded-2xl bg-white/10 px-5 py-4">
                  <p class="mb-2 text-xs text-white/50">You pay with</p>
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-400 font-bold text-white text-sm">$</div>
                    <div>
                      <p class="font-bold text-white">USDC</p>
                      <p class="text-sm text-white/60">100.00 USDC</p>
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-center">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <RefreshCw class="h-5 w-5 animate-spin text-green-300" style="animation-duration:3s" />
                  </div>
                </div>
                <div class="rounded-2xl bg-white/10 px-5 py-4">
                  <p class="mb-2 text-xs text-white/50">Recipient gets</p>
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-purple-400 to-pink-400 font-bold text-white text-sm">◎</div>
                    <div>
                      <p class="font-bold text-white">SOL</p>
                      <p class="text-sm text-white/60">0.8712 SOL</p>
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2">
                  <span class="text-xs text-white/40">Best rate via Jupiter</span>
                  <span class="text-xs font-semibold text-green-400">0.3% fee</span>
                </div>
              </div>
            </div>
            <div class="absolute -right-3 md:-right-6 -top-4 rounded-2xl bg-green-600 px-3 md:px-4 py-2 text-sm font-bold text-white shadow-lg">
              ⚡ Auto-Convert
            </div>
          </div>
          <div class="flex-1 text-center md:text-left">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5">
              <RefreshCw class="h-4 w-4 text-green-600" />
              <span class="text-sm font-semibold text-green-700">Auto-Convert</span>
            </div>
            <h3 class="mb-4 text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">Pay in any token.<br />Receive any token.</h3>
            <p class="mb-6 text-base md:text-lg leading-relaxed text-muted-foreground">
              You pay with whatever token you have. The recipient gets whatever token they want. Jupiter finds the best rate automatically — you just hit send.
            </p>
            <ul class="space-y-3 text-left">
              <li v-for="t in ['Best rate across Solana DEXes, automatically', 'Works with any SPL token on both ends', 'Slippage protection built in']" :key="t"
                class="flex items-start gap-3 text-sm">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs font-bold">✓</span>
                <span class="text-muted-foreground">{{ t }}</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="py-20 md:py-28" style="background: hsl(220 20% 97%)">
      <div class="mx-auto max-w-6xl px-5 md:px-10">
        <div class="mb-12 md:mb-16 text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-primary/70">How it works</p>
          <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight">Up and running<br />in 60 seconds.</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          <div v-for="(s, i) in [
            { num: '01', title: 'Sign up', desc: 'Email or Google. No seed phrase, no browser extension. Payra creates a Solana wallet for you.' },
            { num: '02', title: 'Grab your @handle', desc: 'Pick a username once. That\'s your payment address. Share it like you\'d share a phone number.' },
            { num: '03', title: 'Start sending', desc: 'Pay by username, split a bill, or send a gift envelope. Everything is in one place.' },
          ]" :key="i" class="relative">
            <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-lg"
              style="background: linear-gradient(135deg, hsl(222 55% 12%) 0%, hsl(222 40% 28%) 100%)">
              {{ s.num }}
            </div>
            <div v-if="i < 2" class="absolute top-7 hidden md:block h-0.5 bg-border" style="left: 3.8rem; right: -1rem" />
            <h3 class="mb-3 text-lg md:text-xl font-bold">{{ s.title }}</h3>
            <p class="leading-relaxed text-muted-foreground text-sm md:text-base">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="py-20 md:py-28">
      <div class="mx-auto max-w-3xl px-5 md:px-10">
        <div class="mb-12 md:mb-16 text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-primary/70">FAQ</p>
          <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight">Common<br />questions.</h2>
        </div>
        <div class="space-y-3">
          <div
            v-for="(item, i) in faqItems"
            :key="i"
            class="overflow-hidden rounded-2xl border border-border transition-all"
            :class="openFaq === i ? 'bg-secondary/60' : 'bg-white hover:bg-secondary/30'"
          >
            <button
              class="flex w-full items-center justify-between gap-4 px-5 md:px-6 py-4 md:py-5 text-left"
              @click="toggleFaq(i)"
            >
              <span class="text-sm md:text-base font-semibold">{{ item.q }}</span>
              <span class="shrink-0 text-muted-foreground">
                <Minus v-if="openFaq === i" class="h-4 w-4" />
                <Plus v-else class="h-4 w-4" />
              </span>
            </button>
            <div v-if="openFaq === i" class="px-5 md:px-6 pb-4 md:pb-5">
              <p class="text-sm md:text-[15px] leading-relaxed text-muted-foreground">{{ item.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="relative overflow-hidden py-24 md:py-32 noise"
      style="background: linear-gradient(135deg, hsl(222 55% 10%) 0%, hsl(240 45% 15%) 100%)">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute left-1/4 top-0 h-64 w-64 rounded-full opacity-20"
          style="background: radial-gradient(circle, hsl(260 80% 60%) 0%, transparent 70%)" />
        <div class="absolute bottom-0 right-1/4 h-64 w-64 rounded-full opacity-15"
          style="background: radial-gradient(circle, hsl(180 80% 50%) 0%, transparent 70%)" />
      </div>
      <div class="relative mx-auto max-w-3xl px-5 md:px-10 text-center">
        <p class="mb-4 text-sm font-semibold uppercase tracking-widest text-white/50">Ready?</p>
        <h2 class="mb-6 text-3xl md:text-5xl font-extrabold tracking-tight text-white">Crypto payments<br />without the friction.</h2>
        <p class="mb-8 md:mb-10 text-lg md:text-xl text-white/60">Free to use. Takes about a minute to set up.</p>
        <NuxtLink to="/login"
          class="group inline-flex items-center gap-3 rounded-2xl bg-white px-8 md:px-10 py-4 md:py-5 text-base md:text-lg font-bold text-primary shadow-2xl transition-all hover:scale-105">
          Create an account
          <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-border py-8 md:py-10">
      <div class="mx-auto max-w-6xl px-5 md:px-10">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <img src="/icon.jpeg" alt="Payra" class="h-6 w-6 rounded-lg object-cover" />
            <span class="text-sm font-semibold">Payra</span>
          </div>
          <div class="flex items-center gap-4 md:gap-6 text-sm text-muted-foreground">
            <a href="#features" class="transition hover:text-foreground">Features</a>
            <a href="#faq" class="transition hover:text-foreground">FAQ</a>
            <NuxtLink to="/terms" class="transition hover:text-foreground">Terms</NuxtLink>
            <NuxtLink to="/privacy" class="transition hover:text-foreground">Privacy</NuxtLink>
          </div>
        </div>
        <div class="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Built on Solana · {{ new Date().getFullYear() }} Payra. Not financial advice.
        </div>
      </div>
    </footer>

  </div>
</template>
