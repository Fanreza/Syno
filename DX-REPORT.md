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

## Swap integration

All payments in Syno auto-convert tokens. If you want to send USDC but only have SOL, we run a Jupiter swap server-side before the transfer. Same for the Earn deposit flow: pay with any token, auto-swap to the vault token, deposit the result. We run this server-side via Privy wallet signing. The browser never touches a key.

The quote API is fast. In production with real users, we never saw it fail or return garbage. `ExactOut` mode was specifically useful for private send flows where we need to guarantee the output amount covers a 1% protocol fee on top. `wrapAndUnwrapSol: true` and `dynamicComputeUnitLimit: true` in the swap body are sensible defaults that save real boilerplate.

Here is what actually hurt.

**Slippage failures caused by RPC lag, not actual slippage**

After a swap confirms, we immediately call `getTokenAccountBalance` to get the output amount for the next step (depositing into Lend, for example). The RPC returns the pre-swap balance because the state has not propagated yet. We then build the next transaction with that wrong amount, which either hits `OperateAmountsNearlyZero` on Lend or `SlippageToleranceExceeded` on a follow-up swap.

This took a while to isolate. The errors point at slippage or zero amounts, not at RPC lag. The fix was to read `meta.postTokenBalances` from the confirmed transaction instead of making a separate `getTokenAccountBalance` call. We had to apply this pattern in three places: after swap-then-send in private send, after swap-then-deposit in Earn, and after redeem-then-swap in Earn withdrawal.

If the swap response body just returned the actual output token amount and ATA, callers would not need to dig through transaction metadata. That single change would remove more defensive code from our codebase than anything else on this list.

**No clear error when `feeAccount` is missing**

We added referral fees with `platformFeeBps: 10`. When `JUPITER_REFERRAL_KEY` was not set, we passed `platformFeeBps` without a `feeAccount`. Jupiter returned a 400: `"feeAccount is required for swap with platformFee"`. Clear enough message, but we still shipped it to production by accident. The API could catch this earlier and be more explicit: "platformFeeBps set but feeAccount is missing."

---

## Lend integration

We built a yield-earning feature where users deposit stablecoins into Jupiter Earn vaults. They see live APY per market, their current balance, and can withdraw any time. Paying with any token works: we auto-swap to the vault token first, then deposit.

Stack: `@jup-ag/lend-read` for reading positions, `@jup-ag/lend` (`getDepositIxs`, `getWithdrawIxs`) for building transactions, REST API at `/lend/v1/earn/positions` and `/lend/v1/earn/redeem` for share-based redemptions.

`/lend/v1/earn/positions?users={wallet}` returns everything you need to render a holdings view in one call. `getDepositIxs` and `getWithdrawIxs` compose into VersionedTransactions without much fuss. That part of the SDK is genuinely good.

Here is what was not.

**`OperateAmountsNearlyZero` (error 6030) with no documented minimum**

This fired when we accidentally deposited 0 tokens (caused by the RPC lag problem above). The on-chain error is `USER_MODULE_OPERATE_AMOUNTS_ZERO`. There is no documentation on what the minimum deposit is per vault, and the error gives you nothing to show a user. The positions or markets endpoint should return a `minDepositAmount` field, and the program should return a message that is readable by a human.

**`@jup-ag/lend-read` requires `ANCHOR_WALLET` for read-only operations**

The SDK depends on `@coral-xyz/anchor`, which tries to load a keypair file from `ANCHOR_WALLET` at startup, even when you are only reading data. In a serverless environment like Vercel, there is no persistent filesystem. We write a dummy keypair to `/tmp` on every cold start just to keep the SDK happy.

Read-only operations should not need a signer. The `Client` constructor should take a connection and nothing else.

**`/lend/v1/earn/redeem` does not return the redeemed token amount**

After redeeming, we need the actual output to build a follow-up swap if the user wants to receive a different token. The API returns the transaction but not the amount. We parse `meta.postTokenBalances` from the confirmed transaction to get it. Same RPC lag risk again.

Adding `redeemedAmount` and `redeemedMint` to the redeem response would fix this.

**Partial withdrawal requires manual share math**

`getWithdrawIxs` takes a share amount. To support "withdraw 5 USDC," we compute the share proportion from position data. If the share price moves between the fetch and the transaction landing, the user gets a slightly different amount. There is no SDK helper for this. A `withdrawByTokenAmount` function would be the right call.

---

## Developer platform (developers.jup.ag)

The API key page needs a live "make your first call" example that runs in the browser with your real key pre-filled. Not a curl snippet. An actual request, returning actual data, the moment you get a key. Right now there is a gap between "I have a key" and "I see it working." That gap is where developers drop off.

The docs mix old and new API versions without clear hierarchy. Every v1 page should have a banner at the top pointing to the v2 equivalent and explaining the diff.

Rate limit info is buried. I found the limits by hitting them. They should be on the dashboard next to each key.

The dashboard shows that I have an API key. That is it. No request counts, no error rates, no indication that I am near a rate limit. I had no idea if my production integration was failing at a higher rate than expected until users told me. A usage view would change how developers build with Jupiter. This is the most glaring missing feature on the platform.

---

## Things I wish existed

A transaction status endpoint. Right now we poll `confirmTransaction` with a blockhash expiry and hope. For a payments app, we need reliable confirmation. Something like `GET /swap/v2/status/{signature}` that we can poll without worrying about the blockhash window, or a webhook on confirmation, would replace a lot of defensive code.

A batch quote endpoint. Our payroll feature sends to 10 recipients in one flow. We fire 10 sequential quote requests. A `POST /quote/batch` that takes an array of pairs would cut that to one call.

---

## AI stack

We built Syno using Claude Code. We did not use Jupiter's Agent Skills files directly. The Claude Code context plus our own codebase was enough for the integration work. But the skill concept is the right idea.

The gap was not "how do I call the API." The docs cover that. The gap was "what failure modes will I hit in production that are not in the docs." The Agent Skills files describe the happy path. What would actually help is a skills file that covers known failure modes per endpoint, the RPC lag problem and the `postTokenBalances` workaround, the `ANCHOR_WALLET` issue in serverless environments, and the difference between share amounts and token amounts in Lend.

A skills file that front-loads the non-obvious stuff is genuinely useful. One that just restates the docs is not.

We did not use the Jupiter CLI or Docs MCP. The CLI is designed for agent-driven workflows, not our architecture. We would try the Docs MCP on a future project.

---

## Summary

The APIs work. The quote API is fast, Lend composes reasonably well with Swap, and onboarding was quick. The real problem is the gap between "confirmed transaction" and "ready for the next step." The RPC lag issue hits multiple flows and the SDKs do not protect you from it. Return actual output amounts in response bodies and half the workaround code in this repo disappears.

The platform needs a usage dashboard. Flying blind on your own API usage means you only find out your integration is broken when users complain.
