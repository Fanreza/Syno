# Payra

Send crypto on Solana like sending a DM. Pay by `@username`, split bills, send gift envelopes, earn yield — no seed phrase required.

## Stack

- **Nuxt 4** (`srcDir = app/`), SSR disabled (SPA)
- **Tailwind v4** via `@tailwindcss/vite` — CSS-first, no config file
- **shadcn-vue** + **reka-ui** for UI primitives
- **Privy** (`@privy-io/js-sdk-core`) — client-side auth (email, Google OAuth, Solana wallet SIWS)
- **Privy** (`@privy-io/node`) — server-side wallet creation and signing (TEE)
- **Supabase** — Postgres database via service role key (no RLS)
- **Jupiter** — token swap and earn (lending)
- **GoldRush** — on-chain transaction history
- **@vite-pwa/nuxt** — installable PWA

## Architecture

Privy has no browser SDK for Vue/Nuxt. This app uses the **server-wallet** pattern:

1. User authenticates via Privy's `js-sdk-core` in the browser (email OTP, Google OAuth, or Solana wallet SIWS).
2. Browser gets a Privy access token, sends it as `Authorization: Bearer` on every API call.
3. Nitro verifies the token with `@privy-io/node`, looks up the user's `privy_wallet_id`, builds and signs transactions server-side.
4. The browser never imports a signing SDK and never touches a private key.

```
Browser (Privy js-sdk-core) ──Bearer token──▶ Nitro /server/api ──PrivyClient──▶ Privy TEE ──▶ Solana RPC
                                                        │
                                                        └─ Supabase Postgres
```

## Features

- **Send** — SOL or any SPL token by `@username` or address. Jupiter auto-converts if needed.
- **Request** — payment link with QR code. Payer can pay in any token.
- **Split bill** — create a split, share per-person links, track who paid.
- **Gift** — send a gift envelope with a claim link. Dedicated pool wallet per gift.
- **Earn** — deposit tokens into Jupiter Lend markets, withdraw anytime.
- **Friends** — add friends, use them as quick-pick in Send and Split modals.
- **Activity** — in-app history + on-chain history via GoldRush.
- **Profile** — balance, export private key.
- **Dark mode** — neutral gray palette, toggled via `useTheme()`.
- **PWA** — installable, works offline shell.

## Setup

```bash
cp .env.example .env   # fill in all secrets
# run supabase/schema.sql in the Supabase SQL editor
npm install
npm run dev
```

Open `http://localhost:3000`.

## Env vars

| Var | Where to get it |
|---|---|
| `PRIVY_APP_ID` | [dashboard.privy.io](https://dashboard.privy.io) → App Settings |
| `PRIVY_APP_SECRET` | dashboard.privy.io → App Settings |
| `PRIVY_AUTHORIZATION_KEY_ID` | dashboard.privy.io → Authorization Keys |
| `PRIVY_AUTHORIZATION_PUBLIC_KEY` | dashboard.privy.io → Authorization Keys |
| `PRIVY_AUTHORIZATION_KEY` | dashboard.privy.io → Authorization Keys |
| `NUXT_PUBLIC_PRIVY_APP_ID` | same as `PRIVY_APP_ID` |
| `NUXT_PUBLIC_PRIVY_CLIENT_ID` | dashboard.privy.io → App Settings → Client ID |
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase project → Settings → API → service_role |
| `SOLANA_RPC_URL` | Helius/Quicknode RPC URL (server-side) |
| `NUXT_PUBLIC_SOLANA_RPC_URL` | Helius/Quicknode RPC URL (client-side) |
| `SOLANA_CAIP2` | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (mainnet) |
| `NUXT_PUBLIC_SOLANA_CLUSTER` | `mainnet-beta` |
| `JUPITER_API_KEY` | [jup.ag](https://jup.ag) developer portal |
| `GOLDRUSH_API_KEY` | [goldrush.dev](https://goldrush.dev) |
| `NUXT_PUBLIC_APP_URL` | deployed URL, e.g. `https://payra.app` |

## Supabase setup

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. No RLS — all DB access goes through Nitro with the service role key.

## Privy setup

1. Create an app at [dashboard.privy.io](https://dashboard.privy.io).
2. Enable login methods: **Email**, **Google**, **Solana wallets** (for SIWS).
3. Under **Embedded Wallets**, enable Solana wallet creation.
4. Copy App ID, App Secret, Client ID, and authorization keys into `.env`.

## Project layout

```
app/                          # srcDir (~/  resolves here)
  app.vue                     # layout root: SideNav + NuxtPage
  assets/css/main.css         # Tailwind v4 CSS vars, dark mode under .dark
  components/
    ui/                       # shadcn-vue primitives
    SideNav.vue               # desktop sidebar + mobile bottom bar
    SendModal.vue
    RequestModal.vue
    SplitModal.vue
    GiftModal.vue
    TokenPicker.vue
  composables/
    useAuth.ts                # auth state — Privy js-sdk-core + apiFetch
    useFriends.ts             # cached friend list
    useTheme.ts               # dark mode toggle
  middleware/auth.global.ts
  pages/
    index.vue                 # landing page
    login.vue
    onboarding.vue
    app/index.vue             # dashboard
    app/activity/index.vue
    app/earn.vue
    app/friends.vue
    app/profile.vue
    app/split/
    pay/[id].vue              # public payment link
    gift/[id].vue             # public gift claim
  utils/
    tokens.ts                 # JupToken, SOL_TOKEN, POPULAR_TOKENS
    index.ts                  # cn(), shortAddr(), formatUsd(), formatAmount()

server/
  utils/
    supabase.ts               # requireUser(), adminDb()
    privy.ts                  # getPrivy(), requireUser(), signAndBroadcast()
    solana.ts                 # buildTransferSolTx(), buildTransferSplTx()
    jupiter.ts                # getJupiterQuote(), buildJupiterSwapTx()
  api/
    users/                    # register, me, search
    payments/                 # send, create-link, [id], private-send
    split/                    # create, index, [id]
    gifts/                    # create, claim, [id]
    friends/                  # index, add, remove
    earn/                     # positions, markets, deposit, withdraw
    tokens/search.get.ts
    activity.get.ts
    history.get.ts
    stats.get.ts
    balance.get.ts
    wallet/export.get.ts

supabase/schema.sql
nuxt.config.ts
```

## Auth flow

1. User opens `/login`, clicks "Get Started".
2. `ConnectModal` shows email, Google, and wallet options.
3. After login, Privy issues an access token stored in `useAuth` state.
4. `GET /api/users/me` checks if a `users` row exists for this Privy user ID.
5. If not, router pushes to `/onboarding` to pick a username.
6. `POST /api/users/register` creates a Privy Solana wallet and inserts the `users` row.

## Send flow

1. `SendModal` → `POST /api/payments/send` with `{ toUsername | toAddress, amount, inputToken }`.
2. Server resolves recipient address, fetches decimals, builds transaction.
3. If `inputToken` differs from the output token, Jupiter swap is used instead of a direct transfer.
4. Server signs via Privy (`signTransaction`) and broadcasts via the configured RPC.
5. Payment row inserted in Supabase, signature returned to client.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc
```
