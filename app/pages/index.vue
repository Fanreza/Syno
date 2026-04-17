<script setup lang="ts">
import { Shield, Users, RefreshCw, ArrowRight, ChevronDown, Plus, Minus } from 'lucide-vue-next'

definePageMeta({ layout: false })

const tickerItems = [
  { from: '@budi', to: '@rina', amount: '0.05 SOL', note: 'Dinner split' },
  { from: '@alex', to: '@mia', amount: '0.12 SOL', note: 'Coffee ☕' },
  { from: '@joko', to: '@sari', amount: '0.30 SOL', note: 'Rent share' },
  { from: '@devi', to: '@hana', amount: '0.08 SOL', note: 'Grab split' },
  { from: '@rafi', to: '@nina', amount: '0.20 SOL', note: 'Movie night' },
  { from: '@tama', to: '@lena', amount: '0.15 SOL', note: 'Birthday gift 🎂' },
]

const faqItems = [
  {
    q: 'Is Payra really free?',
    a: 'Yes. Creating an account and sending payments costs nothing. Solana network fees are tiny (usually under $0.001). Auto-convert transactions have a small routing fee from Jupiter, shown before you confirm.',
  },
  {
    q: 'Do I need a crypto wallet to sign up?',
    a: 'No. Sign up with your email or Google account and Payra creates a Solana wallet for you automatically. You can also connect an existing wallet like Phantom or Solflare if you prefer.',
  },
  {
    q: 'How does the private transaction feature work?',
    a: 'Payra routes your payment through a privacy layer that hides the amount and recipient from public blockchain explorers. Only the sender and receiver can see the full details inside the app.',
  },
  {
    q: 'What tokens can I send?',
    a: 'Any SPL token on Solana. SOL, USDC, USDT, BONK, and more. The auto-convert feature lets you send one token and have the recipient receive a different one, using the best available rate on Jupiter.',
  },
  {
    q: 'Can I split a bill unevenly?',
    a: 'Yes. When creating a split you can set a custom amount for each participant. The default is an even split, but you can adjust per person before sending the payment links.',
  },
  {
    q: 'What happens if someone never pays their split?',
    a: "The split stays open until everyone pays or you manually close it. You can send a reminder from the split detail page. There's no automatic time-out.",
  },
  {
    q: 'Is my wallet self-custodial?',
    a: "Your embedded wallet is managed by Privy. The private key is never exposed to Payra's servers or your browser. You retain full ownership. You can also connect your own Phantom or Solflare wallet instead.",
  },
  {
    q: 'Which network is this on?',
    a: 'Currently on Solana devnet for testing. Mainnet launch is coming once the beta period is complete.',
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
  }, { threshold: 0.2 })

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
      <div class="mx-auto flex max-w-6xl items-center justify-between px-10 py-4">
        <div class="flex items-center gap-2.5">
          <img src="/icon.jpeg" alt="Payra" class="h-8 w-8 rounded-xl object-cover shadow-sm" />
          <span class="text-lg font-bold tracking-tight">Payra</span>
        </div>
        <div class="flex items-center gap-6">
          <a href="#features" class="text-sm text-muted-foreground transition hover:text-foreground">Features</a>
          <a href="#how" class="text-sm text-muted-foreground transition hover:text-foreground">How it works</a>
          <a href="#faq" class="text-sm text-muted-foreground transition hover:text-foreground">FAQ</a>
          <NuxtLink to="/login" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90">
            Get Started
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative flex min-h-screen items-center overflow-hidden pt-20">

      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full opacity-20"
          style="background: radial-gradient(circle, hsl(222 55% 35%) 0%, transparent 70%)" />
        <div class="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full opacity-10"
          style="background: radial-gradient(circle, hsl(222 55% 45%) 0%, transparent 70%)" />
      </div>

      <div class="pointer-events-none absolute inset-0 opacity-[0.03]"
        style="background-image: radial-gradient(circle, hsl(222 55% 12%) 1px, transparent 1px); background-size: 32px 32px" />

      <div class="relative mx-auto max-w-6xl px-10 py-20">
        <div class="flex items-center gap-20">

          <!-- Left -->
          <div class="flex-1" :class="heroVisible ? 'animate-slide-up' : 'opacity-0'">
            <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5">
              <span class="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
              <span class="text-xs font-medium text-green-700">Live on Solana. Sub-second finality.</span>
            </div>

            <h1 class="text-7xl font-extrabold leading-[1.05] tracking-tight">
              Crypto<br />payments,<br />
              <span class="text-shimmer">reimagined.</span>
            </h1>

            <p class="mt-6 max-w-md text-xl leading-relaxed text-muted-foreground">
              Private transactions. Instant split bills. Auto-convert any token.
              Send to <span class="font-semibold text-foreground">@username</span>, not a 44-character address.
            </p>

            <div class="mt-10 flex items-center gap-4">
              <NuxtLink to="/login"
                class="group flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl"
                style="background: linear-gradient(135deg, hsl(222 55% 12%) 0%, hsl(222 40% 28%) 100%)">
                Start for free
                <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </NuxtLink>
              <a href="#features" class="flex items-center gap-2 rounded-2xl border border-border px-8 py-4 text-base font-semibold transition hover:bg-secondary">
                See features <ChevronDown class="h-4 w-4" />
              </a>
            </div>

            <div class="mt-12 flex items-center gap-8">
              <div v-for="s in [{ v: '<1s', l: 'settlement' }, { v: '~$0', l: 'gas fees' }, { v: 'SOL', l: 'powered by' }]" :key="s.l">
                <p class="text-2xl font-extrabold text-primary">{{ s.v }}</p>
                <p class="text-xs text-muted-foreground">{{ s.l }}</p>
              </div>
            </div>
          </div>

          <!-- Right: Floating UI cards -->
          <div class="relative w-96 shrink-0" :class="heroVisible ? 'animate-fade-in delay-300' : 'opacity-0'">

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
    <section id="features" class="py-32">
      <div class="mx-auto max-w-6xl px-10">
        <div class="mb-20 text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-primary/70">Why Payra</p>
          <h2 class="text-5xl font-extrabold tracking-tight">Three things we do<br />better than anyone.</h2>
        </div>

        <!-- Feature 1: Private Transaction -->
        <div id="feat1" class="mb-24 flex items-center gap-20 transition-all duration-700"
          :class="feat1Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'">
          <div class="relative w-96 shrink-0">
            <div class="relative overflow-hidden rounded-3xl p-8 shadow-2xl noise"
              style="background: linear-gradient(135deg, hsl(222 55% 10%) 0%, hsl(240 40% 18%) 100%)">
              <div class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
                style="background: radial-gradient(circle, hsl(260 80% 70%) 0%, transparent 70%)" />
              <div class="relative z-10 space-y-3">
                <div class="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <Shield class="h-5 w-5 text-purple-300 shrink-0" />
                  <div>
                    <p class="text-sm font-semibold text-white">Transaction hidden</p>
                    <p class="text-xs text-white/50">Only sender and receiver can see</p>
                  </div>
                  <span class="ml-auto rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">PRIVATE</span>
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
            <div class="absolute -right-6 -top-4 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
              🔒 Private
            </div>
          </div>
          <div class="flex-1">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5">
              <Shield class="h-4 w-4 text-purple-600" />
              <span class="text-sm font-semibold text-purple-700">Private Transactions</span>
            </div>
            <h3 class="mb-4 text-4xl font-extrabold tracking-tight leading-tight">Your money,<br />your business.</h3>
            <p class="mb-6 text-lg leading-relaxed text-muted-foreground">
              Traditional crypto is public. Every transaction, every amount, every wallet is visible to anyone. Payra keeps your payment details between you and the recipient.
            </p>
            <ul class="space-y-3">
              <li v-for="t in ['Amount hidden from public blockchain explorers', 'Recipient address obfuscated on-chain', 'Full audit trail only for the parties involved']" :key="t"
                class="flex items-start gap-3 text-sm">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs font-bold">✓</span>
                <span class="text-muted-foreground">{{ t }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Feature 2: Split Bill -->
        <div id="feat2" class="mb-24 flex items-center gap-20 transition-all duration-700"
          :class="feat2Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'">
          <div class="flex-1">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5">
              <Users class="h-4 w-4 text-blue-600" />
              <span class="text-sm font-semibold text-blue-700">Split Bills</span>
            </div>
            <h3 class="mb-4 text-4xl font-extrabold tracking-tight leading-tight">No more awkward<br />"you owe me" texts.</h3>
            <p class="mb-6 text-lg leading-relaxed text-muted-foreground">
              Create a split in seconds, share a payment link to each person, and watch the status update as everyone pays. Dinners, trips, rent — anything works.
            </p>
            <ul class="space-y-3">
              <li v-for="t in ['Split evenly or set custom amounts per person', 'One-tap payment link per participant', 'Live status so you know exactly who has paid']" :key="t"
                class="flex items-start gap-3 text-sm">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">✓</span>
                <span class="text-muted-foreground">{{ t }}</span>
              </li>
            </ul>
          </div>
          <div class="relative w-96 shrink-0">
            <div class="overflow-hidden rounded-3xl bg-white p-6 shadow-2xl" style="border: 1px solid hsl(220 15% 88%)">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <p class="font-bold">🍣 Sushi Tei Dinner</p>
                  <p class="text-xs text-muted-foreground">0.45 SOL total · 4 people</p>
                </div>
                <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Open</span>
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
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted-foreground">{{ p.amt }}</span>
                    <span :class="p.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                      class="rounded-full px-2 py-0.5 text-[10px] font-bold">
                      {{ p.paid ? 'Paid ✓' : 'Pending' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="absolute -left-6 -top-4 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
              👥 Split
            </div>
          </div>
        </div>

        <!-- Feature 3: Auto Convert -->
        <div id="feat3" class="flex items-center gap-20 transition-all duration-700"
          :class="feat3Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'">
          <div class="relative w-96 shrink-0">
            <div class="overflow-hidden rounded-3xl p-8 shadow-2xl noise"
              style="background: linear-gradient(135deg, hsl(160 60% 10%) 0%, hsl(180 50% 14%) 100%)">
              <div class="space-y-4">
                <div class="rounded-2xl bg-white/10 px-5 py-4">
                  <p class="mb-2 text-xs text-white/50">You pay with</p>
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400 font-bold text-white text-sm">$</div>
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
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 font-bold text-white text-sm">◎</div>
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
            <div class="absolute -right-6 -top-4 rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
              ⚡ Auto-Convert
            </div>
          </div>
          <div class="flex-1">
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5">
              <RefreshCw class="h-4 w-4 text-green-600" />
              <span class="text-sm font-semibold text-green-700">Auto-Convert</span>
            </div>
            <h3 class="mb-4 text-4xl font-extrabold tracking-tight leading-tight">Pay in any token.<br />Receive any token.</h3>
            <p class="mb-6 text-lg leading-relaxed text-muted-foreground">
              Powered by Jupiter, the top DEX aggregator on Solana. Send USDC, BONK, or any SPL token and the recipient gets exactly what they want. No manual swaps, no extra steps.
            </p>
            <ul class="space-y-3">
              <li v-for="t in ['Best rate across all Solana DEXes automatically', 'Send any SPL token, receive any SPL token', 'Slippage protection built in']" :key="t"
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
    <section id="how" class="py-28" style="background: hsl(220 20% 97%)">
      <div class="mx-auto max-w-6xl px-10">
        <div class="mb-16 text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-primary/70">Simple by design</p>
          <h2 class="text-5xl font-extrabold tracking-tight">Up and running<br />in 60 seconds.</h2>
        </div>
        <div class="grid grid-cols-3 gap-10">
          <div v-for="(s, i) in [
            { num: '01', title: 'Sign up instantly', desc: 'Email or Google. No seed phrase, no browser extension. Your Solana wallet is created automatically.' },
            { num: '02', title: 'Claim your @handle', desc: 'Pick a username once. That is your payment address forever. Share it like a social handle.' },
            { num: '03', title: 'Send, split and swap', desc: 'Everything in one place. Direct payments, split bills with live tracking, auto token conversion.' },
          ]" :key="i" class="relative">
            <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold text-white shadow-lg"
              style="background: linear-gradient(135deg, hsl(222 55% 12%) 0%, hsl(222 40% 28%) 100%)">
              {{ s.num }}
            </div>
            <div v-if="i < 2" class="absolute top-8 h-0.5 bg-border" style="left: 4.5rem; right: -1rem" />
            <h3 class="mb-3 text-xl font-bold">{{ s.title }}</h3>
            <p class="leading-relaxed text-muted-foreground">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="py-28">
      <div class="mx-auto max-w-3xl px-10">
        <div class="mb-16 text-center">
          <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-primary/70">FAQ</p>
          <h2 class="text-5xl font-extrabold tracking-tight">Questions people<br />actually ask.</h2>
        </div>
        <div class="space-y-3">
          <div
            v-for="(item, i) in faqItems"
            :key="i"
            class="overflow-hidden rounded-2xl border border-border transition-all"
            :class="openFaq === i ? 'bg-secondary/60' : 'bg-white hover:bg-secondary/30'"
          >
            <button
              class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              @click="toggleFaq(i)"
            >
              <span class="text-base font-semibold">{{ item.q }}</span>
              <span class="shrink-0 text-muted-foreground transition-transform" :class="openFaq === i ? 'rotate-0' : ''">
                <Minus v-if="openFaq === i" class="h-4 w-4" />
                <Plus v-else class="h-4 w-4" />
              </span>
            </button>
            <div v-if="openFaq === i" class="px-6 pb-5">
              <p class="text-[15px] leading-relaxed text-muted-foreground">{{ item.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="relative overflow-hidden py-32 noise"
      style="background: linear-gradient(135deg, hsl(222 55% 10%) 0%, hsl(240 45% 15%) 100%)">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute left-1/4 top-0 h-64 w-64 rounded-full opacity-20"
          style="background: radial-gradient(circle, hsl(260 80% 60%) 0%, transparent 70%)" />
        <div class="absolute bottom-0 right-1/4 h-64 w-64 rounded-full opacity-15"
          style="background: radial-gradient(circle, hsl(180 80% 50%) 0%, transparent 70%)" />
      </div>
      <div class="relative mx-auto max-w-3xl px-10 text-center">
        <p class="mb-4 text-sm font-semibold uppercase tracking-widest text-white/50">Get started today</p>
        <h2 class="mb-6 text-5xl font-extrabold tracking-tight text-white">The future of<br />payments is private.</h2>
        <p class="mb-10 text-xl text-white/60">Send crypto the smarter way. Free forever.</p>
        <NuxtLink to="/login"
          class="group inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-5 text-lg font-bold text-primary shadow-2xl transition-all hover:scale-105">
          Create your account
          <ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-border py-10">
      <div class="mx-auto max-w-6xl px-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <img src="/icon.jpeg" alt="Payra" class="h-6 w-6 rounded-lg object-cover" />
            <span class="text-sm font-semibold">Payra</span>
          </div>
          <div class="flex items-center gap-6 text-sm text-muted-foreground">
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
