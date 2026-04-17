# CLAUDE.md

Guidance for Claude Code when working in this repo. Keep this file short and load-bearing — update it when architecture changes, not when features are added.

## What this is

**Payra** — GoPay-style crypto payment app on Solana devnet. Send by `@username`, payment links, split bills.

## Stack (all latest majors)

- **Nuxt 4** (srcDir = `app/`)
- **Tailwind v4** via `@tailwindcss/vite` (CSS-first, no `tailwind.config.ts`, no PostCSS)
- **shadcn-vue** primitives backed by **reka-ui** (`components.json` configured for `npx shadcn-vue@latest add ...`)
- **Supabase** for auth (email OTP + Google OAuth) and Postgres, via `@nuxtjs/supabase`
- **Privy** for Solana wallets, **server-side only** via `@privy-io/node`
- `@solana/web3.js`, `@solana/spl-token`, Jupiter v6 (phase 2), GoldRush (phase 2)

## The architecture rule that matters most

**Privy has no browser SDK for Vue/Nuxt.** This app uses the **server-wallet** pattern:

1. User authenticates with Supabase (cookie session, `useSupabaseUser`).
2. On onboarding, [server/api/users/register.post.ts](server/api/users/register.post.ts) calls `privy.wallets().create({ chain_type: 'solana' })` and stores `{ privy_wallet_id, wallet_address }` in the `users` row keyed by `supabase_user_id`.
3. All signing happens in Nitro via `privy.wallets().solana().signAndSendTransaction(walletId, { caip2, transaction })`. **The browser never imports Privy and never touches a key.**

Do not introduce a client-side Privy SDK. If you need to change how transactions are built, change [server/utils/solana.ts](server/utils/solana.ts) and [server/api/payments/send.post.ts](server/api/payments/send.post.ts), not the pages.

## Directory layout (Nuxt 4)

```
app/                    # srcDir — ~/ resolves here
  app.vue, assets/, components/{ui,BottomNav.vue},
  composables/, middleware/, pages/, utils/
server/                 # Nitro (rootDir, not under app/)
  utils/{supabase,privy,solana,jupiter}.ts
  api/{users,payments,split,balance.get.ts}
supabase/schema.sql
components.json         # shadcn-vue CLI config
nuxt.config.ts, package.json, tsconfig.json, .env.example
```

## Auto-imports — don't import these, just use them

- **`app/utils/**`** → auto-imported into Vue components. `cn()`, `shortAddr()`, `formatUsd()`, `formatAmount()` are globals in `.vue` files.
- **`server/utils/**`** → auto-imported into Nitro handlers. Inside `server/api/**/*.ts`, these are globals: `requireUser`, `adminDb` (from `supabase.ts`); `getPrivy`, `createSolanaWallet`, `signAndSendSolana` (from `privy.ts`); `buildTransferSolTx`, `getSolBalance`, `getConnection` (from `solana.ts`); `getJupiterQuote`, `buildJupiterSwapTx` (from `jupiter.ts`).
- **Supabase server helpers** come from `#supabase/server`: `serverSupabaseUser`, `serverSupabaseServiceRole`. These are wrapped in [server/utils/supabase.ts](server/utils/supabase.ts) — use `requireUser(event)` and `adminDb(event)` instead of the raw helpers.
- **Client Supabase**: `useSupabaseClient()`, `useSupabaseUser()` auto-imported by `@nuxtjs/supabase`.

If an IDE shows "cannot find name" for any of the above, that's stale `.nuxt/` types — run `npm install` (triggers `nuxt prepare`) or `npx nuxt prepare`.

## Auth flow

- Supabase session lives in a cookie. Middleware is [app/middleware/auth.global.ts](app/middleware/auth.global.ts) — skips `/login`, `/confirm`, `/pay/*`; pushes to `/onboarding` if Supabase user exists but `users` row doesn't.
- [app/composables/useAuth.ts](app/composables/useAuth.ts) wraps Supabase auth methods + `/api/users/me` + `/api/users/register`. It is the **only** place pages should touch auth state. Don't call `supabase.auth.*` directly from pages.
- `/confirm` handles OAuth + magic-link redirects.

## Payment flow (the critical path)

Send SOL:

1. Page: [app/pages/send.vue](app/pages/send.vue) posts to `/api/payments/send` with `{ toUsername | toAddress, amount, memo }`. No auth header — cookie carries the Supabase session.
2. [server/api/payments/send.post.ts](server/api/payments/send.post.ts): `requireUser` → lookup sender's `privy_wallet_id` → `buildTransferSolTx(from, to, sol)` → `signAndSendSolana(walletId, txBase64)` → insert `payments` row → return `{ signature }`.
3. If `splitParticipantId` is present, the row in `split_participants` is flipped to `paid`.

Payment link: [server/api/payments/create-link.post.ts](server/api/payments/create-link.post.ts) inserts a pending row; [app/pages/pay/[id].vue](app/pages/pay/%5Bid%5D.vue) loads it and re-uses `/api/payments/send` for the actual transfer.

## Conventions

- **TypeScript strict.** No `any` in new code unless it's a `$fetch` response that can't be typed.
- **No `useFetch` caching foot-guns**: payment/send routes use `$fetch` directly. Only use `useFetch`/`useAsyncData` for SSR-cacheable reads (e.g., `/api/payments/[id]` on the pay page).
- **Env vars**: public ones live under `runtimeConfig.public` in [nuxt.config.ts](nuxt.config.ts). Server secrets (`privyAppSecret`, `solanaCaip2`, `goldrushApiKey`) are top-level `runtimeConfig`. Never read `process.env` from pages/composables.
- **Solana cluster** is controlled by two env vars that must agree: `SOLANA_RPC_URL` (for the Nitro Connection) and `SOLANA_CAIP2` (passed to Privy). Devnet default is set in `nuxt.config.ts`.
- **shadcn-vue components**: to add new ones, run `npx shadcn-vue@latest add <name>` — [components.json](components.json) is already configured with the `~/components/ui` alias.
- **Icons**: `lucide-vue-next`, imported per-component.

## Supabase schema

In [supabase/schema.sql](supabase/schema.sql). Notable: `users.supabase_user_id` is a FK to `auth.users(id) on delete cascade` — this is how we tie Privy-wallet rows to Supabase auth identities. Username is unique, lowercased, indexed.

RLS is **not** enabled. All DB access goes through Nitro with the service role key. Do not add client-side `supabase.from(...)` calls for data tables — go through `/api/*`.

## Phase 2 (stubbed, not wired)

- **Jupiter auto-convert** — helpers in [server/utils/jupiter.ts](server/utils/jupiter.ts) (`getJupiterQuote`, `buildJupiterSwapTx`). Wire into `/api/payments/send` by adding an `inputMint` field: quote → build swap tx → `signAndSendSolana`.
- **SPL transfers** — extend [server/utils/solana.ts](server/utils/solana.ts) with `buildTransferSplTx` using `@solana/spl-token`'s `getOrCreateAssociatedTokenAccount` + `createTransferInstruction`.
- **Gift/Daget** — tables `gifts`, `gift_claims` exist. Needs a pool Privy wallet per gift, deposit tx, and claim API that signs from the pool.
- **GoldRush history** — not wired. Use `GOLDRUSH_API_KEY` in a new `/api/history.get.ts` to populate the dashboard.
- **Friends** — `friends` table exists, no API/UI.

## Things NOT to do

- Don't add `@privy-io/react-auth`, `@privy-io/js-sdk-core`, or any client-side Privy package. They don't fit this architecture and the first attempt at this app failed because of it.
- Don't re-enable `@nuxtjs/tailwindcss` or `postcss.config.js`. Tailwind v4 is wired via `@tailwindcss/vite` in [nuxt.config.ts](nuxt.config.ts). A second pipeline will silently break `@theme` and CSS vars.
- Don't add `@vueuse/nuxt` — it currently peer-conflicts with Nuxt 4. Import from `@vueuse/core` directly where needed.
- Don't put API auth in headers. The Supabase cookie is the source of truth; `$fetch` from the client inherits it automatically.
- Don't write to `app/utils/**` from server code, or import `#supabase/server` from client code — the build will break at different stages with unhelpful errors.

## Copy and tone rules

All user-facing text in this app must follow these rules. No exceptions.

- **No em dashes.** Never use `—`. Use a comma, period, or restructure the sentence.
- **No AI-sounding phrases.** Banned: "seamlessly", "effortlessly", "unlock", "leverage", "cutting-edge", "next-generation", "revolutionize", "powerful", "robust", "streamline", "harness", "game-changing", "intuitive", "comprehensive", "dive into".
- **No stiff or formal language.** Write like a person talking to a friend, not a press release. Short sentences. Active voice.
- **No filler.** Cut anything that doesn't add meaning. "Join thousands of users" → delete it. "The smarter way" → say what's smart about it.

If you are writing any UI copy, button labels, section headers, descriptions, or onboarding text, apply these rules before committing.

## Running locally

```bash
cp .env.example .env   # fill Supabase + Privy creds
# paste supabase/schema.sql into Supabase SQL editor, run it
npm install
npm run dev
```

The `Missing supabase url` warning from `nuxt prepare` during a fresh install is normal before `.env` exists.
