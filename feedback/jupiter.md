# Feedback: Jupiter integration (Syno)

**Project:** Syno, a crypto finance app on Solana  
**Website:** https://syno.aethereal.top  
**Integrations used:** Jupiter Swap, Jupiter Lend (Earn)

---

## What we built

We used Jupiter Swap for cross-token payments throughout the app. When a user pays with SOL but the recipient expects USDC, or deposits into an Earn vault using a different token, we run a Jupiter swap server-side before the main transaction. We needed both ExactIn and ExactOut modes depending on the flow.

For yield, we integrated Jupiter Lend. Users can deposit stablecoins or other tokens into Earn vaults and see live APY. We used `@jup-ag/lend-read` for reading positions, `@jup-ag/lend` (`getDepositIxs`, `getWithdrawIxs`) for building deposit and withdraw transactions, and the REST API at `/lend/v1/earn/positions` and `/lend/v1/earn/redeem` for share-based redemptions.

---

## What worked

The quote API is fast. Debounced live quotes in the UI felt responsive with real users. ExactOut mode was useful for private send flows where we needed to guarantee the output amount covers a protocol fee on top. `getDepositIxs` and `getWithdrawIxs` compose into VersionedTransactions without much ceremony, which made server-side signing via Privy straightforward. `/lend/v1/earn/positions` returns everything needed to render a holdings view in one call.

---

## Issues

**1. `OperateAmountsNearlyZero` (error 6030) with no documented minimum**

When depositing into an Earn vault via a swap, we called `getTokenAccountBalance` after swap confirmation to get the deposited amount. Due to RPC lag, this returned 0 (stale data). We then built a deposit transaction with 0 tokens, which hit `OperateAmountsNearlyZero` on-chain.

Fix on our side: read `postTokenBalances` from the confirmed swap transaction metadata instead of calling `getTokenAccountBalance` separately.

Suggestion: return the minimum deposit amount per vault in the API response or SDK, and return a human-readable error message instead of an opaque error code.

**2. `SlippageToleranceExceeded` on withdraw swap-out, same root cause**

After a lend redeem, we built a Jupiter swap using the balance from `getTokenAccountBalance`. Same stale-data problem caused the quote amount to mismatch the actual balance, which hit `SlippageToleranceExceeded` at simulation.

Fix on our side: read the redeemed amount from `postTokenBalances` of the redeem transaction.

Suggestion: return the actual redeemed token amount in the `/lend/v1/earn/redeem` response body so callers do not need to parse transaction metadata.

**3. `@jup-ag/lend-read` requires `ANCHOR_WALLET` for read-only operations**

The SDK depends on `@coral-xyz/anchor`, which looks for `ANCHOR_WALLET` pointing to a keypair file at initialization, even for read-only calls. In a serverless environment like Vercel, there is no persistent filesystem. We had to write a dummy keypair to `/tmp` on every cold start just to satisfy the requirement.

Suggestion: decouple the read client from Anchor's wallet requirement. Read-only operations should not need a signer.

**4. No partial withdraw by token amount**

`getWithdrawIxs` takes a share amount, not a token amount. To support "withdraw 5 USDC," we manually computed the share proportion from position data. This is fragile if the share price changes between the position fetch and the transaction. A `withdrawByTokenAmount` helper would be the right abstraction.

---

## Overall

The swap API and Lend compose well together. The RPC lag issue is a Solana-wide problem, not Jupiter's fault, but the SDKs could protect callers from it by returning actual output amounts in response bodies. The Anchor wallet dependency in the read SDK was the most surprising friction point in a serverless deployment.
