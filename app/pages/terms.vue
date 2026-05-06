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
        <h1 class="text-5xl font-extrabold tracking-tight text-gray-900">Terms of Service</h1>
        <p class="mt-4 text-gray-500">Last updated: April 17, 2025</p>
      </div>

      <div class="prose prose-neutral max-w-none space-y-10 text-[15px] leading-relaxed text-gray-900">

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">1. Acceptance of terms</h2>
          <p class="text-gray-500">By creating an account or using Syno, you agree to these terms. If you do not agree, do not use the service. These terms apply to all users, regardless of how you sign up.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">2. What Syno is</h2>
          <p class="text-gray-500">Syno is a non-custodial payment tool built on the Solana blockchain. We help you send, receive, and split crypto payments using a simple username system. Syno does not hold your funds. All transactions are executed directly on-chain.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">3. Your account</h2>
          <p class="mb-3 text-gray-500">You are responsible for:</p>
          <ul class="space-y-2 text-gray-500">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />keeping your login credentials secure</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />all activity that happens under your account</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />providing accurate information during sign-up</li>
          </ul>
          <p class="mt-3 text-gray-500">Usernames are unique and permanent once claimed. We reserve the right to reclaim usernames that violate these terms.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">4. Prohibited use</h2>
          <p class="mb-3 text-gray-500">You may not use Syno to:</p>
          <ul class="space-y-2 text-gray-500">
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/60" />launder money or finance illegal activity</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/60" />impersonate another person or entity</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/60" />circumvent any security or rate-limiting measures</li>
            <li class="flex items-start gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/60" />automate account creation or transactions without our consent</li>
          </ul>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">5. Blockchain transactions</h2>
          <p class="text-gray-500">All transactions on Syno are executed on the Solana blockchain. Blockchain transactions are irreversible once confirmed. Syno cannot reverse, cancel, or recover funds from completed transactions. You are solely responsible for verifying recipient details before sending.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">6. Fees</h2>
          <p class="text-gray-500">Syno does not charge fees for basic transfers. Solana network fees (gas) are minimal and paid automatically. Auto-convert transactions via Jupiter may include a small routing fee. We will always show you the estimated cost before you confirm.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">7. Limitation of liability</h2>
          <p class="text-gray-500">Syno is provided as-is. We are not liable for losses resulting from blockchain congestion, bugs in third-party protocols, your own error in sending to a wrong address, or any force majeure event. Our total liability to you will not exceed the fees you have paid us in the 30 days prior to the claim.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">8. Changes to these terms</h2>
          <p class="text-gray-500">We may update these terms at any time. We will notify you via email or in-app notice at least 7 days before changes take effect. Continued use after that date means you accept the new terms.</p>
        </section>

        <div class="h-px bg-gray-200" />

        <section>
          <h2 class="mb-3 text-xl font-bold text-gray-900">9. Contact</h2>
          <p class="text-gray-500">Questions? Email us at <a href="mailto:legal@syno.app" class="font-medium text-primary hover:underline">legal@syno.app</a>.</p>
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
