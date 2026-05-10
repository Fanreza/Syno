# Jupiter developer experience report

**Project:** Syno, a crypto finance app on Solana  
**App:** https://syno.aethereal.top  
**Repo:** https://github.com/Fanreza/Syno  
**APIs used:** Swap V1 (migrated to V2 during this build), Jupiter Lend

---

## Onboarding

API key generation was instant. That part worked fine.

The confusion came from figuring out which swap API to actually use. There are currently three things that look like "the swap API":

- `api.jup.ag/swap/v1` (old, still works, still referenced in most community code)
- `api.jup.ag/swap/v2` (newer, but docs are sparse)
- The Developer Platform endpoints at `developers.jup.ag`

I started with v1 because every Stack Overflow answer, every GitHub repo, every tutorial pointed there. I only found out v2 existed because of this bounty description. There is no banner on the v1 docs page saying "hey, v2 exists, here is why you want it." That is a real onboarding gap.

Time from landing on developers.jup.ag to first successful API call: about 8 minutes. Time spent figuring out whether I was on the right API version: longer than it needed to be.

---

## What we built

We used Jupiter Swap for cross-token payments throughout the app. When a user pays with SOL but the recipient expects USDC, or deposits into an Earn vault using a different token, we run a Jupiter swap server-side before the transfer. We needed both ExactIn and ExactOut modes depending on the flow. All of this runs server-side via Privy wallet signing. The browser never touches a key.

For yield, we integrated Jupiter Lend. Users can deposit stablecoins or other tokens into Earn vaults and see live APY. We used `@jup-ag/lend-read` for reading positions, `@jup-ag/lend` (`getDepositIxs`, `getWithdrawIxs`) for building deposit and withdraw transactions, and the REST API at `/lend/v1/earn/positions` and `/lend/v1/earn/redeem` for share-based redemptions.

---

## What worked

The quote API is fast. Debounced live quotes in the UI felt responsive with real users. ExactOut mode was useful for private send flows where we needed to guarantee the output amount covers a 1% protocol fee on top. `wrapAndUnwrapSol: true` and `dynamicComputeUnitLimit: true` in the swap body are sensible defaults that save real boilerplate.

`getDepositIxs` and `getWithdrawIxs` compose into VersionedTransactions without much ceremony, which made server-side signing straightforward. `/lend/v1/earn/positions` returns everything needed to render a holdings view in one call, no extra requests needed.

---

## What bit us

**Slippage failures caused by RPC lag, not actual slippage**

After a swap confirms, we immediately call `getTokenAccountBalance` to get the output amount for the next step (depositing into Lend, for example). The RPC returns the pre-swap balance because the state has not propagated yet. We then build the next transaction with that wrong amount, which either hits `OperateAmountsNearlyZero` on Lend or `SlippageToleranceExceeded` on a follow-up swap.

This took a while to isolate. The errors point at slippage or zero amounts, not at RPC lag. The fix was to read `meta.postTokenBalances` from the confirmed transaction instead of a separate `getTokenAccountBalance` call. We had to apply this in three places: after swap-then-send in private send, after swap-then-deposit in Earn, and after redeem-then-swap in Earn withdrawal.

If the swap response body returned the actual output token amount and ATA, callers would not need to dig through transaction metadata. That single change would remove more defensive code from this codebase than anything else on this list.

**`OperateAmountsNearlyZero` (error 6030) with no documented minimum**

This fired when we accidentally deposited 0 tokens into the vault (caused by the RPC lag above). The on-chain message is `USER_MODULE_OPERATE_AMOUNTS_ZERO`. There is no documentation on what the minimum deposit is per vault, and the error gives you nothing you can show a user.

Suggestion: return a `minDepositAmount` field in the positions or markets endpoint, and return a human-readable error from the program.

**`@jup-ag/lend-read` requires `ANCHOR_WALLET` for read-only operations**

The SDK depends on `@coral-xyz/anchor`, which tries to load a keypair file from `ANCHOR_WALLET` at startup, even when you are only reading data. In a serverless environment like Vercel, there is no persistent filesystem. We write a dummy keypair to `/tmp` on every cold start just to keep the SDK happy.

Read-only operations should not need a signer. The `Client` constructor should take a connection and nothing else.

**`/lend/v1/earn/redeem` does not return the redeemed token amount**

After redeeming, we need the actual output to build a follow-up swap if the user wants to receive a different token. The API returns the transaction but not the amount. We parse `meta.postTokenBalances` from the confirmed transaction to get it. Same RPC lag risk again.

Adding `redeemedAmount` and `redeemedMint` to the redeem response would fix this.

**Partial withdrawal requires manual share math**

`getWithdrawIxs` takes a share amount. To support "withdraw 5 USDC," we compute the share proportion from position data. If the share price moves between the fetch and the transaction landing, the user gets a slightly different amount. A `withdrawByTokenAmount` helper would be the right call.

**Quote API rate limits with no headers**

We hit rate limits on the quote endpoint during peak usage, specifically when multiple users triggered debounced quote fetches around the same time. The API returns a 429 with no `Retry-After` header and no indication of the rate limit window. You find out you are throttled by seeing errors in production, not by reading the docs.

The dashboard does not show current usage against limits either, so there is no way to know you are approaching the ceiling until you hit it.

Suggestion: return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` on every response, and show live usage on the API key dashboard.

**No clear error when `feeAccount` is missing**

We added referral fees with `platformFeeBps: 10`. When `JUPITER_REFERRAL_KEY` was not set, we passed `platformFeeBps` without a `feeAccount`. Jupiter returned a 400: `"feeAccount is required for swap with platformFee"`. Clear enough, but we still shipped it to production by accident. The API could be more explicit: "platformFeeBps set but feeAccount is missing."

---

## Developer platform (developers.jup.ag)

The API key page needs a live "make your first call" example that runs in the browser with your real key pre-filled. Not a curl snippet. An actual request, returning actual data, right after you get a key. There is a gap between "I have a key" and "I see it working." That gap is where developers drop off.

The docs mix old and new API versions without clear hierarchy. Every v1 page should have a banner at the top pointing to the v2 equivalent.

Rate limit info is buried. I found the limits by hitting them. They should be on the dashboard next to each key.

The dashboard shows that I have an API key and nothing else. No request counts, no error rates, no indication that I am near a rate limit. I had no idea if my production integration was failing silently until users told me. A usage analytics view would change how developers build on Jupiter. This is the most obvious missing feature on the platform.

---

## Things I wish existed

A transaction status endpoint. Right now we poll `confirmTransaction` with a blockhash expiry and hope. For a payments app, reliable confirmation matters. Something like `GET /swap/v2/status/{signature}` that we can poll without worrying about the blockhash window, or a webhook on confirmation, would replace a lot of defensive code.

A batch quote endpoint. Our payroll feature sends to 10 recipients. We fire 10 sequential quote requests. A `POST /quote/batch` that accepts an array of pairs would cut that to one call.

---

## AI stack

We built Syno using Claude Code. We did not use Jupiter's Agent Skills files directly. The gap was not "how do I call the API," the docs cover that. The gap was "what failure modes will I hit in production." The Agent Skills files describe the happy path. What would actually help is a file that covers known failure modes per endpoint, the RPC lag problem and the `postTokenBalances` workaround, the `ANCHOR_WALLET` issue in serverless environments, and the difference between share amounts and token amounts in Lend.

A skills file that front-loads the non-obvious stuff saves hours of debugging. One that restates the docs does not.

We did not use the Jupiter CLI or Docs MCP. The CLI is designed for agent-driven workflows, which does not fit our architecture (server-side signing via Privy). We would try the Docs MCP on a future project.

---

## Summary

The APIs work. The quote API is fast, Lend composes reasonably well with Swap, and onboarding was quick. The real problem is the gap between "confirmed transaction" and "ready for the next step." The RPC lag issue hits multiple flows and the SDKs do not protect you from it. Return actual output amounts in response bodies and half the workaround code in this repo disappears.

The platform needs a usage dashboard. Flying blind on your own API usage means you only find out your integration is broken when users complain.
