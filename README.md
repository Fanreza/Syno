# Payra

GoPay-style crypto payment app on Solana. Nuxt 4 + Tailwind + shadcn-vue + Supabase Auth + Privy (server wallets) + Jupiter + GoldRush.

## Architecture

After reviewing Privy's SDKs ([docs.privy.io/wallets/overview](https://docs.privy.io/wallets/overview)), this project uses the **server-wallet** pattern because Privy ships no browser SDK for non-React/non-mobile frameworks:

- **Auth**: [`@nuxtjs/supabase`](https://supabase.nuxtjs.org) handles email OTP + Google OAuth with SSR cookies and a Vue-native API.
- **Wallets**: [`@privy-io/node`](https://docs.privy.io/basics/nodeJS/quickstart) creates and controls a Solana wallet per user, fully server-side.
- **Signing**: all transactions are built and signed in Nitro routes via `privy.wallets().solana().signAndSendTransaction()`. The browser never touches a private key or a Privy SDK.

```
Browser ──cookie auth──▶ Nuxt /server/api ──PrivyClient──▶ Privy wallets ──▶ Solana RPC
                                     │
                                     └─ Supabase (users, payments, splits)
```

## Scope (Phase 1)

- ✅ Supabase email-OTP + Google OAuth
- ✅ Username system + search + resolve
- ✅ Per-user Privy Solana wallet (auto-created on onboarding)
- ✅ Send SOL by `@username` or address — server-signed via Privy
- ✅ Payment link `/pay/[id]` — pending payment row, receiver-signed confirmation flow
- ✅ Split bill creation + progress UI
- ✅ Balance dashboard (SOL + USD)

**Phase 2** (files stubbed, not wired): Jupiter auto-convert ([`server/utils/jupiter.ts`](server/utils/jupiter.ts)), gift/daget pool wallets, GoldRush history, SPL transfers.

## Setup

```bash
# 1. Install
npm install

# 2. Copy env and fill in secrets
cp .env.example .env

# 3. Run Supabase schema
# Open supabase/schema.sql in the Supabase SQL editor and run it.

# 4. Dev server
npm run dev
```

http://localhost:3000

## Env vars

| Var | Source |
|---|---|
| `SUPABASE_URL` | supabase project settings → API |
| `SUPABASE_KEY` | supabase project settings → API (anon) |
| `SUPABASE_SERVICE_KEY` | supabase project settings → API (service_role) |
| `PRIVY_APP_ID` | dashboard.privy.io → app settings |
| `PRIVY_APP_SECRET` | dashboard.privy.io → app settings |
| `SOLANA_RPC_URL` | devnet default; use Helius/Quicknode for prod |
| `SOLANA_CAIP2` | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` (devnet) or `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (mainnet-beta) |
| `GOLDRUSH_API_KEY` | goldrush.dev (phase 2) |

## Supabase config

In the Supabase dashboard:
1. **Auth → Providers → Email**: enable "Enable email OTP" (6-digit code).
2. **Auth → Providers → Google**: enable and paste Google OAuth client id/secret.
3. **Auth → URL Configuration → Redirect URLs**: add `http://localhost:3000/confirm`.
4. **SQL Editor**: run [`supabase/schema.sql`](supabase/schema.sql).

## Privy config

1. Create an app at [dashboard.privy.io](https://dashboard.privy.io).
2. Copy **App ID** and **App Secret** into `.env`.
3. No client-side Privy config needed — this app uses the Node SDK exclusively.

## Flow: signup + wallet creation

1. `/login` → Supabase sends OTP code → `signInWithOtp` + `verifyOtp`.
2. On first login, `GET /api/users/me` returns `null` → router pushes `/onboarding`.
3. User picks a username → `POST /api/users/register`:
   - Verifies Supabase JWT from cookie (`serverSupabaseUser`).
   - Calls `privy.wallets().create({ chain_type: 'solana' })`.
   - Stores `{ supabase_user_id, username, privy_wallet_id, wallet_address }` in `users`.

## Flow: send SOL

1. Client `POST /api/payments/send` with `{ toUsername | toAddress, amount, memo }`.
2. Server verifies Supabase user, loads sender's `privy_wallet_id`.
3. Server builds `SystemProgram.transfer` tx with recent blockhash, serializes to base64.
4. Server calls `privy.wallets().solana().signAndSendTransaction(walletId, { caip2, transaction })`.
5. Stores row in `payments` with signature, returns to client.

No private keys ever touch the browser or the backend code — Privy holds the keys in their TEE.

## Project layout (Nuxt 4)

Nuxt 4 uses `app/` as the default srcDir. Client code lives under `app/`, Nitro under `server/`, config at root.

```
app/                          # srcDir
  app.vue                     # root shell + BottomNav
  assets/css/main.css         # Tailwind + shadcn tokens
  components/
    ui/Button.vue             # shadcn-vue primitives
    ui/Card.vue
    ui/Input.vue
    ui/Dialog.vue
    BottomNav.vue
  composables/useAuth.ts      # Supabase-backed auth composable
  middleware/auth.global.ts   # route guard
  pages/
    index.vue                 # dashboard
    login.vue                 # email OTP
    confirm.vue               # OAuth callback
    onboarding.vue            # username + wallet creation
    send.vue
    pay/[id].vue
    split/index.vue
    split/[id].vue
    profile.vue
  utils/index.ts              # cn(), shortAddr(), formatUsd() — auto-imported

server/                       # Nitro (stays at root)
  utils/
    supabase.ts               # requireUser, adminDb
    privy.ts                  # PrivyClient, createSolanaWallet, signAndSendSolana
    solana.ts                 # buildTransferSolTx, getSolBalance
    jupiter.ts                # quote + swap (phase 2)
  api/
    users/{me,register,resolve,search}
    payments/{send,create-link,[id]}
    split/{create,[id]}
    balance.get.ts

supabase/schema.sql
nuxt.config.ts
package.json
tsconfig.json
tailwind.config.ts
.env.example
```

### Auto-imports

- `app/utils/**` → auto-imported into Vue components. Call `cn()`, `formatUsd()`, `shortAddr()` with no import.
- `server/utils/**` → auto-imported into Nitro handlers. `requireUser()`, `adminDb()`, `createSolanaWallet()`, `signAndSendSolana()`, `buildTransferSolTx()`, `getSolBalance()` are globals inside `server/api/**`.
- `~/` resolves to `app/` (srcDir). Use `~~/` for the rootDir.

## Notes / gotchas

- **Devnet by default.** Flip `SOLANA_CAIP2` and `SOLANA_RPC_URL` for mainnet.
- **Auto-import TS errors** in your IDE before `npm install` are expected — Nuxt generates `.nuxt/tsconfig.json` and the `#supabase/server` virtual module during `nuxt prepare` (runs automatically via `postinstall`).
- **SPL tokens:** extend [`server/utils/solana.ts`](server/utils/solana.ts) with `buildTransferSplTx` using `@solana/spl-token`'s `getOrCreateAssociatedTokenAccount` + `createTransferInstruction`. Then extend `/api/payments/send` to accept a `mint` field.
- **Jupiter auto-convert (phase 2):** the helper is in [`server/utils/jupiter.ts`](server/utils/jupiter.ts). Wire it into `/api/payments/send` by quoting sender's token → receiver's token, building the swap tx, then using `signAndSendSolana`.
- **Token verification performance:** `@privy-io/node` calls Privy's API on each op. For production, consider local JWT verification against Privy's public key.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run typecheck` — tsc check
