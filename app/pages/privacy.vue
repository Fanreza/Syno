<script setup lang="ts">
definePageMeta({ layout: false })
</script>

<template>
  <div class="min-h-screen bg-white text-gray-900">

    <!-- Navbar -->
    <header class="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-10 py-4">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <img src="/syno-logo.jpeg" alt="Syno" class="h-8 w-8 rounded-xl object-cover shadow-sm" />
          <span class="text-lg font-bold tracking-tight text-gray-900">Syno</span>
        </NuxtLink>
        <NuxtLink to="/login" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90">
          Get Started
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-10 py-20">

      <div class="mb-12">
        <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-primary/60">Legal</p>
        <h1 class="text-5xl font-extrabold tracking-tight text-gray-900">Privacy Policy</h1>
        <p class="mt-4 text-gray-500">Last updated: April 17, 2025</p>
      </div>

      <div class="prose prose-neutral max-w-none space-y-10 text-[15px] leading-relaxed text-gray-900">

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">1. What we collect</h2>
          <p class="mb-3 text-gray-500">When you use Syno, we collect:</p>
          <ul class="space-y-2 text-gray-500">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-gray-900">Account info</strong> — email address, username, and Solana wallet address</span></li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-gray-900">Transaction data</strong> — amounts, recipients, timestamps, and optional memos you add</span></li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-gray-900">Usage data</strong> — which features you use, when, and from what browser/device</span></li>
          </ul>
          <p class="mt-3 text-gray-500">We do not collect your private keys. Your wallet is managed by Privy, a non-custodial wallet infrastructure provider, and we never have direct access to your funds.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">2. How we use it</h2>
          <ul class="space-y-2 text-gray-500">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />to operate and improve the Syno service</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />to send you transactional emails (payment confirmations, split reminders)</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />to detect and prevent fraud or abuse</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />to comply with applicable law</li>
          </ul>
          <p class="mt-3 text-gray-500">We do not sell your data. We do not use your data for advertising.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">3. Who we share it with</h2>
          <p class="mb-3 text-gray-500">We share data only with:</p>
          <ul class="space-y-2 text-gray-500">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-gray-900">Supabase</strong> — our database and auth provider. Data is stored in the region you sign up from.</span></li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-gray-900">Privy</strong> — manages your embedded wallet. Privy does not have access to your account data.</span></li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-gray-900">Law enforcement</strong> — if required by a valid legal request.</span></li>
          </ul>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">4. Blockchain data</h2>
          <p class="text-gray-500">Transactions on Solana are recorded on a public blockchain. While Syno's private transaction feature obscures details within the app, the underlying on-chain records may still be visible to anyone with technical knowledge. We cannot remove or alter blockchain data.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">5. Data retention</h2>
          <p class="text-gray-500">We keep your data for as long as your account is active. If you delete your account, we remove your personal information within 30 days, except where we are required to keep it for legal or fraud-prevention purposes.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">6. Your rights</h2>
          <p class="mb-3 text-gray-500">You can:</p>
          <ul class="space-y-2 text-gray-500">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />request a copy of your data</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />ask us to correct inaccurate data</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />delete your account and associated data</li>
          </ul>
          <p class="mt-3 text-gray-500">Email <a href="mailto:privacy@syno.app" class="font-medium text-primary hover:underline">privacy@syno.app</a> to make any of these requests.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">7. Cookies</h2>
          <p class="text-gray-500">We use a single session cookie to keep you logged in. We do not use tracking cookies or third-party advertising cookies.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">8. Contact</h2>
          <p class="text-gray-500">Questions about privacy? Email us at <a href="mailto:privacy@syno.app" class="font-medium text-primary hover:underline">privacy@syno.app</a>.</p>
        </section>

      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-200 py-8">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-10">
        <div class="flex items-center gap-2">
          <img src="/syno-logo.jpeg" alt="Syno" class="h-6 w-6 rounded-lg object-cover" />
          <span class="text-sm font-semibold text-gray-900">Syno</span>
        </div>
        <div class="flex items-center gap-6 text-xs text-gray-400">
          <NuxtLink to="/terms" class="hover:text-gray-700 transition">Terms</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-gray-700 transition">Privacy</NuxtLink>
          <span>Built on Solana · {{ new Date().getFullYear() }}</span>
        </div>
      </div>
    </footer>

  </div>
</template>
