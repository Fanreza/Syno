# Feedback — Jupiter Integration (Syno)

**Project:** Syno — crypto finance app on Solana  
**Website:** https://syno.aethereal.top  
**Integrations used:** Jupiter Swap, Jupiter Lend (Earn)

---

## What we built with Jupiter

### Swap
Used Jupiter Swap v6 for cross-token payments throughout the app. When a user pays with SOL but the recipient expects USDC, or deposits into an Earn vault using a different token, we run a Jupiter swap server-side before the main transaction. Implemented ExactIn and ExactOut modes depending on the flow.

### Jupiter Lend (Earn)
Integrated Jupiter Lend for a yield-earning feature. Users can deposit stablecoins (USDC, USDT) or other tokens into Jupiter Earn vaults and see live APY. We used `@jup-ag/lend-read` for reading positions and `@jup-ag/lend` (`getDepositIxs`, `getWithdrawIxs`) for building deposit/withdraw transactions. Also used the REST API (`/lend/v1/earn/positions`, `/lend/v1/earn/redeem`) for share-based redemptions.

---

## What worked well

- **Quote API is fast and reliable.** Debounced live quotes in the UI felt snappy.
- **ExactOut mode** was useful for the "private send" flow where we needed to guarantee the output amount covers a protocol fee on top.
- **`getDepositIxs` / `getWithdrawIxs`** compose cleanly into VersionedTransactions — easy to sign server-side with Privy.
- **`/lend/v1/earn/positions`** REST endpoint gave us everything we needed to display user positions without running our own indexer.

---

## Issues & friction

### 1. `OperateAmountsNearlyZero` (error 6030) with no clear minimum documented
When depositing into an Earn vault via a swap, we were calling `getTokenAccountBalance` after swap confirmation to get the actual deposited amount. Due to RPC lag, this returned 0 (stale data), and we built a deposit transaction with 0 tokens — resulting in `OperateAmountsNearlyZero` on-chain. The error message is opaque to end users.

**Fix on our side:** Read `postTokenBalances` from the confirmed swap transaction metadata instead of a separate `getTokenAccountBalance` call.

**Suggestion:** Document the minimum deposit amount per vault in the API response or SDK, and return a clearer error message (e.g. "Deposit below minimum vault threshold").

### 2. `SlippageToleranceExceeded` on withdraw swap-out — same RPC lag root cause
After a lend redeem, we built a Jupiter swap with the balance from `getTokenAccountBalance`. Same stale-data issue caused the quote amount to mismatch the actual balance, leading to `SlippageToleranceExceeded` at simulation.

**Fix on our side:** Read redeemed amount from `postTokenBalances` of the redeem transaction.

**Suggestion:** Consider returning the actual redeemed token amount in the `/lend/v1/earn/redeem` response body, so callers don't need to parse transaction metadata.

### 3. `@jup-ag/lend-read` requires `ANCHOR_WALLET` env var
The SDK internally depends on `@coral-xyz/anchor` which looks for `ANCHOR_WALLET` pointing to a keypair file, even for read-only operations. In a serverless environment (Vercel), we had to write a dummy keypair to `/tmp` on every cold start to satisfy this requirement.

**Suggestion:** Decouple the read client from Anchor's wallet requirement — read-only operations shouldn't need a signer.

### 4. No partial withdraw by token amount in SDK
The `getWithdrawIxs` takes a share amount, not a token amount. To support "withdraw 5 USDC", we had to manually calculate the share proportion from the position data. This is error-prone if the share price changes between the position fetch and the transaction.

**Suggestion:** Add a `withdrawByAmount` helper that accepts a token amount and handles share conversion internally, or document the recommended approach more clearly.

---

## Overall

Jupiter Swap and Lend are both solid. The RPC lag issues are a Solana-wide problem, not Jupiter-specific, but the SDK could be more resilient by returning actual output amounts in API responses. The Anchor wallet dependency in the read SDK was the most surprising friction point in a serverless context.
