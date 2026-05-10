# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Guidance for Claude Code when working in this repo. Keep this file short and load-bearing — update it when architecture changes, not when features are added.

## What this is

**Syno** — GoPay-style crypto payment app on Solana. Send by `@username`, payment links, split bills, gift envelopes, payroll, token swap, friends list, notifications.

## Stack (all latest majors)

- **Nuxt 4** (srcDir = `app/`)
- **Tailwind v4** via `@tailwindcss/vite` (CSS-first, no `tailwind.config.ts`, no PostCSS)
- **shadcn-vue** primitives backed by **reka-ui** (`components.json` configured for `npx shadcn-vue@latest add ...`)
- **Supabase** for auth (email OTP + Google OAuth + Solana SIWS) and Postgres, via `@nuxtjs/supabase`
- **Privy** for Solana wallets, **server-side only** via `@privy-io/node`
- `@solana/web3.js`, `@solana/spl-token`, Jupiter Swap v2 (wired), GoldRush (wired)

## The architecture rule that matters most

**Privy has no browser SDK for Vue/Nuxt.** This app uses the **server-wallet** pattern:

1. User authenticates with Supabase (cookie session, `useSupabaseUser`).
2. On onboarding, [server/api/users/register.post.ts](server/api/users/register.post.ts) calls `privy.wallets().create({ chain_type: 'solana' })` and stores `{ privy_wallet_id, wallet_address }` in the `users` row keyed by `supabase_user_id`.
3. All signing happens in Nitro via `privy.wallets().solana().signAndSendTransaction(walletId, { caip2, transaction })`. **The browser never imports Privy and never touches a key.**

Do not introduce a client-side Privy SDK. If you need to change how transactions are built, change [server/utils/solana.ts](server/utils/solana.ts) and [server/api/payments/send.post.ts](server/api/payments/send.post.ts), not the pages.

## Directory layout (Nuxt 4)

```
app/                    # srcDir — ~/ resolves here
  app.vue               # layout root: SideNav + <NuxtPage>
  assets/css/main.css   # Tailwind v4 CSS vars, dark mode under .dark class
  components/
    ui/                 # shadcn-vue primitives
    SideNav.vue         # desktop sidebar + mobile bottom bar, bell badge for notifications
    SendModal.vue       # send token to @username or address
    RequestModal.vue    # create payment link + QR, WhatsApp/Telegram share
    SplitModal.vue      # create split bill, WhatsApp/Telegram share
    GiftModal.vue       # create gift envelope, WhatsApp/Telegram share
    SwapModal.vue       # swap any token via Jupiter (live quote, slippage picker)
    PayrollModal.vue    # bulk send to multiple recipients in one flow
    TokenPicker.vue     # reusable token selector (JupToken, POPULAR_TOKENS)
    RequestQr.vue       # QR code renderer
    ContactPicker.vue   # friend/contact dropdown used in SendModal + SplitModal
  composables/
    useAuth.ts          # ONLY place for auth state — wraps Supabase + Privy SIWS
    useBalance.ts       # wallet balance + token prices, shared across components
    useFriends.ts       # cached friend list (useState), used in SendModal + SplitModal
    useTheme.ts         # dark mode toggle, applies .dark to <html>
    useNotifications.ts # unread count (useState), fetchUnread(), used in SideNav badge
    useOnboarding.ts    # driver.js tour, fires once on first login (localStorage flag)
  middleware/auth.global.ts
  pages/
    index.vue           # landing page (hardcoded light colors, not affected by dark mode)
    app/index.vue       # dashboard — balance card, 6 action buttons, holdings, activity
    app/notifications.vue  # notification list, mark read / mark all read
    app/gifts.vue       # sent + received gift history
    app/friends.vue     # friends list + add/remove
    app/split/          # split index + detail
    app/activity/       # on-chain + in-app activity tabs
    app/earn.vue        # Jupiter lending positions
    app/profile.vue
    pay/[id].vue        # public payment link page
    gift/[id].vue       # public gift claim page
  utils/
    tokens.ts           # JupToken interface, SOL_TOKEN, POPULAR_TOKENS (auto-imported)
    index.ts            # cn(), shortAddr(), formatUsd(), formatAmount() (auto-imported)
server/
  utils/
    supabase.ts         # requireUser(event), adminDb()
    privy.ts            # getPrivy(), createSolanaWallet(), signAndSendSolana()
    solana.ts           # buildTransferSolTx(), buildTransferSplTx(), getSolBalance()
    jupiter.ts          # getJupiterQuote(), buildJupiterSwapTx()
    notifications.ts    # createNotification() — called by payment/split/gift/payroll APIs
  api/
    users/              # register, me, search
    payments/           # send.post, create-link.post, [id].get
    split/              # create.post, index.get, [id].get
    gifts/              # create.post, claim.post, index.get, [id].get
    swap/               # quote.get, execute.post
    payroll/            # send.post (bulk sequential transfers)
    notifications/      # index.get (list + unread count), read.post (single or all)
    friends/            # index.get, add.post, remove.post
    tokens/search.get   # Jupiter token search proxy
    activity.get, history.get, stats.get, balance.get, wallet/export.get
supabase/schema.sql         # core tables
supabase/notifications.sql  # notifications table (run after schema.sql)
```

## Auto-imports — don't import these, just use them

- **`app/utils/**`** → auto-imported into Vue components. `cn()`, `shortAddr()`, `formatUsd()`, `formatAmount()`, `JupToken`, `SOL_TOKEN`, `POPULAR_TOKENS` are globals in `.vue` files.
- **`server/utils/**`** → auto-imported into Nitro handlers. Inside `server/api/**/*.ts`, these are globals: `requireUser`, `adminDb`; `getPrivy`, `createSolanaWallet`, `signAndSendSolana`; `buildTransferSolTx`, `getSolBalance`, `getConnection`; `getJupiterQuote`, `buildJupiterSwapTx`.
- **Client Supabase**: `useSupabaseClient()`, `useSupabaseUser()` auto-imported by `@nuxtjs/supabase`.

If an IDE shows "cannot find name" for any of the above, that's stale `.nuxt/` types — run `npx nuxt prepare`.

## Auth flow

- Supabase session lives in a cookie. Middleware is [app/middleware/auth.global.ts](app/middleware/auth.global.ts) — skips `/login`, `/confirm`, `/pay/*`, `/gift/*`; pushes to `/onboarding` if Supabase user exists but `users` row doesn't.
- [app/composables/useAuth.ts](app/composables/useAuth.ts) wraps Supabase auth methods + Privy SIWS wallet login + `/api/users/me` + `/api/users/register`. It is the **only** place pages should touch auth state.
- SIWS flow: `fetchNonce` → `createSiwsMessage` (from `@privy-io/js-sdk-core`) → wallet signs → signature encoded as **base64** (not base58) → `siws.login({ mode: 'login-or-sign-up', ... })`.
- Wallet objects from browser providers (Phantom, OKX, etc.) must **never** be stored in Vue `ref([])` — ES private class fields (`#t`) break under Vue's Proxy. Store raw providers in a plain `Map` outside reactivity.

## Payment flow (the critical path)

Send any token:

1. `SendModal` → `POST /api/payments/send` with `{ toUsername | toAddress, amount, memo, inputToken? }`.
2. [server/api/payments/send.post.ts](server/api/payments/send.post.ts): `requireUser` → lookup sender's `privy_wallet_id` → if `inputToken` differs from output, run Jupiter swap via `getJupiterQuote` + `buildJupiterSwapTx` → else `buildTransferSolTx` → `signAndSendSolana` → insert `payments` row → return `{ signature }`.

Payment link: `RequestModal` → `POST /api/payments/create-link` (stores mint address as `token`) → `/pay/[id]` public page with token picker for payer.

Gift: `GiftModal` → `POST /api/gifts/create` (validates balance, saves to DB) → `/gift/[id]` claim page → `POST /api/gifts/claim` (partial signing: creator signs token transfer, claimer signs as fee payer).

Swap: `SwapModal` → `GET /api/swap/quote` (Jupiter ExactIn quote, debounced) → `POST /api/swap/execute` (build + sign + broadcast).

Payroll: `PayrollModal` → `POST /api/payroll/send` (sequential transfers to multiple recipients, one tx per person, sends notification to each receiver).

## Token handling

All token references use **mint addresses** (not symbols like `'SOL'`). The SOL mint is `So11111111111111111111111111111111111111112`.

- `app/utils/tokens.ts` exports `JupToken` interface, `SOL_TOKEN`, and `POPULAR_TOKENS` — auto-imported everywhere, do not re-declare locally.
- `TokenPicker.vue` is the shared component for all token selection UI. Use `<TokenPicker v-model="token" label="..." />`.
- Token price fetching: CoinGecko for SOL (`api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`), Jupiter Price API for others (`api.jup.ag/price/v2?ids={mint}`). Never use `lite.jup.ag`.
- Jupiter token search: proxied via `GET /api/tokens/search?q=...` (hits `tokens.jup.ag`).

## Friends

- `useFriends()` composable caches the friend list in `useState` — call `load()` once on modal open, reuse across components.
- In `SendModal`: icon button (Users icon) in the "To" input toggles a friend dropdown.
- In `SplitModal`: each participant row has a Users icon button that shows a friend dropdown below that row.
- Friends are excluded from search results in `app/pages/app/friends.vue` by filtering out the current user's username.

## Dark mode

- Toggled by `useTheme()` composable — applies/removes `.dark` class on `<html>`.
- CSS vars for dark mode live in `app/assets/css/main.css` under `.dark { ... }` — neutral gray palette (not navy).
- `SideNav.vue` has the toggle button. Initialize with `useTheme().init()` in `app.vue` `onMounted`.

## Conventions

- **TypeScript strict.** No `any` in new code unless it's a `$fetch` response that can't be typed.
- **No `useFetch` caching foot-guns**: mutation routes use `$fetch` directly. Only use `useFetch`/`useAsyncData` for SSR-cacheable reads.
- **Env vars**: public ones under `runtimeConfig.public` in [nuxt.config.ts](nuxt.config.ts). Server secrets top-level `runtimeConfig`. Never read `process.env` from pages/composables.
- **Solana cluster** controlled by `SOLANA_RPC_URL` and `SOLANA_CAIP2` — both must agree. Devnet default in `nuxt.config.ts`.
- **`<script setup>` cannot contain `export`** — shared types/constants go in `app/utils/` (auto-imported), not exported from `.vue` files.

## Supabase schema

Run [supabase/schema.sql](supabase/schema.sql) first, then [supabase/notifications.sql](supabase/notifications.sql).

Key tables:
- `users` — privy_wallet_id, wallet_address, username
- `payments` — sender_id, receiver_id, amount, token (mint address), tx_signature, memo
- `split_bills` + `split_participants` — bill per split, one participant row per person
- `gifts` + `gift_claims` — gift has total_slots/claimed_count; claim is one row per claimer
- `friends` — user_id, friend_id (bidirectional, both rows inserted)
- `notifications` — user_id, type, title, body, data (jsonb), read (bool)
- `private_transfers` — for MagicBlock private send

RLS is **not** enabled. All DB access goes through Nitro with the service role key. Do not add client-side `supabase.from(...)` calls for data tables.

## Things NOT to do

- Don't add `@privy-io/react-auth`, `@privy-io/js-sdk-core`, or any client-side Privy package.
- Don't re-enable `@nuxtjs/tailwindcss` or `postcss.config.js` — Tailwind v4 is wired via `@tailwindcss/vite`.
- Don't add `@vueuse/nuxt` — peer-conflicts with Nuxt 4. Import from `@vueuse/core` directly.
- Don't put API auth in headers. The Supabase cookie is the source of truth.
- Don't export types/constants from `<script setup>` blocks — use `app/utils/` instead.
- Don't use `lite.jup.ag` — use `api.jup.ag`.
- Don't store wallet provider objects in Vue reactive state (ref/reactive) — use a plain `Map`.

## Copy and tone rules

All user-facing text must follow these rules:

- **No em dashes.** Never use `—`.
- **No AI-sounding phrases.** Banned: "seamlessly", "effortlessly", "unlock", "leverage", "cutting-edge", "next-generation", "revolutionize", "powerful", "robust", "streamline", "harness", "game-changing", "intuitive", "comprehensive", "dive into".
- **No stiff or formal language.** Short sentences. Active voice.
- **No filler.** Cut anything that doesn't add meaning.

## Running locally

```bash
cp .env.example .env   # fill Supabase + Privy creds
# In Supabase SQL editor: run supabase/schema.sql, then supabase/notifications.sql
npm install
npm run dev
```

## Feature Status (last reviewed 2026-05-03)

### Complete
- **Auth** — email OTP, Google OAuth, Solana wallet SIWS (Phantom, OKX, Jupiter)
- **Dashboard** — balance card, stats, 6 action buttons (Send/Request/Swap/Split/Gift/Payroll), holdings, recent activity
- **Send** — `SendModal` with `TokenPicker`, Jupiter auto-convert if input token differs from output
- **Swap** — `SwapModal`, live Jupiter quote (debounced), slippage picker, `GET /api/swap/quote` + `POST /api/swap/execute`
- **Private send** — `POST /api/payments/private-send` via MagicBlock ephemeral rollup. USDC/USDT only.
- **Payment Link / QR** — `RequestModal` → `/pay/[id]` public page, WhatsApp/Telegram share
- **Split Bill** — `SplitModal`, friends picker per row, index + detail pages, WhatsApp/Telegram share
- **Gift** — `GiftModal` → `/gift/[id]` claim page. Direct creator→claimer transfer (no pool wallet). Partial signing for SPL: creator signs token transfer, claimer signs as fee payer. WhatsApp/Telegram share.
- **Gift history** — `/app/gifts` page with Sent/Received tabs, progress bar, copy link
- **Payroll** — `PayrollModal`, bulk send to multiple `@username`s, `POST /api/payroll/send`
- **Notifications** — `notifications` table, `createNotification()` called on payment/split/gift/payroll events. `/app/notifications` page, bell badge in SideNav with unread count.
- **Friends** — `GET/POST /api/friends/{index,add,remove}` + `/app/friends` page
- **Profile** — balance, export private key (`GET /api/wallet/export`)
- **On-chain history** — `GET /api/history` via Helius + `/app/activity` on-chain tab
- **Earn** — Jupiter lending positions, deposit/withdraw
- **Dark mode** — neutral gray palette, toggled via `useTheme()`
- **Onboarding tour** — driver.js, fires once on first login, covers all 6 dashboard actions
- **Landing page** — hardcoded light colors, not affected by dark/light mode toggle
