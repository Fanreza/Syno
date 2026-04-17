<script setup lang="ts">
definePageMeta({ layout: false })
</script>

<template>
  <div class="min-h-screen bg-white text-foreground">

    <!-- Navbar -->
    <header class="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-xl">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-10 py-4">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <img src="/icon.jpeg" alt="Payra" class="h-8 w-8 rounded-xl object-cover shadow-sm" />
          <span class="text-lg font-bold tracking-tight">Payra</span>
        </NuxtLink>
        <NuxtLink to="/login" class="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90">
          Get Started
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-10 py-20">

      <div class="mb-12">
        <p class="mb-2 text-sm font-semibold uppercase tracking-widest text-primary/60">Legal</p>
        <h1 class="text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p class="mt-4 text-muted-foreground">Last updated: April 17, 2025</p>
      </div>

      <div class="prose prose-neutral max-w-none space-y-10 text-[15px] leading-relaxed text-foreground">

        <section>
          <h2 class="mb-3 text-xl font-bold">1. What we collect</h2>
          <p class="mb-3 text-muted-foreground">When you use Payra, we collect:</p>
          <ul class="space-y-2 text-muted-foreground">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-foreground">Account info</strong> — email address, username, and Solana wallet address</span></li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-foreground">Transaction data</strong> — amounts, recipients, timestamps, and optional memos you add</span></li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-foreground">Usage data</strong> — which features you use, when, and from what browser/device</span></li>
          </ul>
          <p class="mt-3 text-muted-foreground">We do not collect your private keys. Your wallet is managed by Privy, a non-custodial wallet infrastructure provider, and we never have direct access to your funds.</p>
        </section>

        <div class="h-px bg-border" />

        <section>
          <h2 class="mb-3 text-xl font-bold">2. How we use it</h2>
          <ul class="space-y-2 text-muted-foreground">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />to operate and improve the Payra service</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />to send you transactional emails (payment confirmations, split reminders)</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />to detect and prevent fraud or abuse</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />to comply with applicable law</li>
          </ul>
          <p class="mt-3 text-muted-foreground">We do not sell your data. We do not use your data for advertising.</p>
        </section>

        <div class="h-px bg-border" />

        <section>
          <h2 class="mb-3 text-xl font-bold">3. Who we share it with</h2>
          <p class="mb-3 text-muted-foreground">We share data only with:</p>
          <ul class="space-y-2 text-muted-foreground">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-foreground">Supabase</strong> — our database and auth provider. Data is stored in the region you sign up from.</span></li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-foreground">Privy</strong> — manages your embedded wallet. Privy does not have access to your account data.</span></li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" /><span><strong class="text-foreground">Law enforcement</strong> — if required by a valid legal request.</span></li>
          </ul>
        </section>

        <div class="h-px bg-border" />

        <section>
          <h2 class="mb-3 text-xl font-bold">4. Blockchain data</h2>
          <p class="text-muted-foreground">Transactions on Solana are recorded on a public blockchain. While Payra's private transaction feature obscures details within the app, the underlying on-chain records may still be visible to anyone with technical knowledge. We cannot remove or alter blockchain data.</p>
        </section>

        <div class="h-px bg-border" />

        <section>
          <h2 class="mb-3 text-xl font-bold">5. Data retention</h2>
          <p class="text-muted-foreground">We keep your data for as long as your account is active. If you delete your account, we remove your personal information within 30 days, except where we are required to keep it for legal or fraud-prevention purposes.</p>
        </section>

        <div class="h-px bg-border" />

        <section>
          <h2 class="mb-3 text-xl font-bold">6. Your rights</h2>
          <p class="mb-3 text-muted-foreground">You can:</p>
          <ul class="space-y-2 text-muted-foreground">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />request a copy of your data</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />ask us to correct inaccurate data</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />delete your account and associated data</li>
          </ul>
          <p class="mt-3 text-muted-foreground">Email <a href="mailto:privacy@payra.app" class="font-medium text-primary hover:underline">privacy@payra.app</a> to make any of these requests.</p>
        </section>

        <div class="h-px bg-border" />

        <section>
          <h2 class="mb-3 text-xl font-bold">7. Cookies</h2>
          <p class="text-muted-foreground">We use a single session cookie to keep you logged in. We do not use tracking cookies or third-party advertising cookies.</p>
        </section>

        <div class="h-px bg-border" />

        <section>
          <h2 class="mb-3 text-xl font-bold">8. Contact</h2>
          <p class="text-muted-foreground">Questions about privacy? Email us at <a href="mailto:privacy@payra.app" class="font-medium text-primary hover:underline">privacy@payra.app</a>.</p>
        </section>

      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-border py-8">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-10">
        <div class="flex items-center gap-2">
          <img src="/icon.jpeg" alt="Payra" class="h-6 w-6 rounded-lg object-cover" />
          <span class="text-sm font-semibold">Payra</span>
        </div>
        <div class="flex items-center gap-6 text-xs text-muted-foreground">
          <NuxtLink to="/terms" class="hover:text-foreground transition">Terms</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-foreground transition">Privacy</NuxtLink>
          <span>Built on Solana · {{ new Date().getFullYear() }}</span>
        </div>
      </div>
    </footer>

  </div>
</template>
