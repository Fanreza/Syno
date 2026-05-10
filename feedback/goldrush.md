# Feedback: GoldRush (Covalent) integration (Syno)

**Project:** Syno, a crypto finance app on Solana  
**Website:** https://syno.aethereal.top  
**Integration used:** GoldRush API (Covalent) for Solana

---

## What we built

We used GoldRush across three features:

- Token balance enrichment: augmenting raw RPC balance data with token logos, USD quotes, 24h price change, and spam flags via `/v1/{chain}/address/{wallet}/balances_v2/`
- Portfolio P&L: tracking historical portfolio value and per-token P&L using 24h quote data
- Wallet risk scoring: surfacing a risk score on the send modal before a user transfers funds

---

## What worked

The `balances_v2` endpoint returns logos, quotes, and 24h change in one call. Without it, you are making separate requests to CoinGecko, IPFS, and your own token registry. The `is_spam` flag is genuinely useful. Filtering spam tokens out of the holdings view cleaned things up immediately. The risk score gave us a meaningful signal to show before sending without us having to build our own heuristics. Response structure is consistent, which made it easy to map into our own types.

---

## Issues

**1. `last_transferred_at` not populated on Solana**

For every Solana token, `last_transferred_at` comes back as `null`. We planned to sort holdings by recency of activity. We fell back to using balance as a proxy. Not a blocker, but it limits what you can build.

Suggestion: populate `last_transferred_at` from Solana transaction history, even approximately.

**2. Risk score endpoint is not well documented for Solana**

Finding the right endpoint and understanding what the score actually represents took trial and error. The score range and what counts as "high risk" are not defined anywhere in the docs.

Suggestion: add a legend to the response. Something like `{ score: 72, label: "medium", factors: ["new wallet", "few transactions"] }` would let apps show context, not just a number.

**3. Rate limit headers missing**

We hit rate limits during testing without any `Retry-After` or rate limit headers in the response. You cannot implement proper backoff if you do not know the window.

Suggestion: return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` on every response.

**4. USD quote returns 0 for some valid tokens**

Some mid-cap Solana tokens returned `quote_rate: 0` or `quote_rate: null` despite having active markets. We fell back to Jupiter Price API for those cases.

Suggestion: use Jupiter's price oracle as a fallback for Solana tokens where Covalent's quote is unavailable.

---

## Overall

GoldRush replaced what would have been a substantial amount of custom data pipeline work. The `balances_v2` endpoint is the fastest way to get enriched wallet data on Solana without running your own indexer. The main gaps are Solana-specific: activity timestamps and pricing for long-tail tokens.
