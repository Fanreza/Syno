# Feedback — GoldRush (Covalent) Integration (Syno)

**Project:** Syno — crypto finance app on Solana  
**Website:** https://syno.aethereal.top  
**Integration used:** GoldRush API (Covalent) for Solana

---

## What we built with GoldRush

Used GoldRush across three features:

1. **Token balance enrichment** — augment raw RPC balance data with token logos, USD quotes, 24h price change, and spam flags via `/v1/{chain}/address/{wallet}/balances_v2/`
2. **Portfolio P&L** — track historical portfolio value and per-token P&L using 24h quote data
3. **Wallet risk scoring** — surface a risk score on the send modal before a user transfers funds, so they can assess the recipient wallet

---

## What worked well

- **`balances_v2` endpoint** returns rich token metadata in one call — logos, quotes, 24h change — that would otherwise require multiple API calls to CoinGecko + IPFS lookups.
- **Spam flag (`is_spam`)** is genuinely useful. Filtering spam tokens out of the holdings view cleaned up the UI significantly.
- **Risk score** gave us a meaningful signal to show before sending. Even a simple numeric score with a color band (green/yellow/red) is enough for users to pause and check.
- Response structure is consistent and predictable — easy to map into our own types.

---

## Issues & friction

### 1. `last_transferred_at` not populated on Solana
For every token on Solana, `last_transferred_at` comes back as `null`. We planned to use this to sort holdings by recency of activity, but had to fall back to using balance as a proxy. Not a blocker, but limits what you can build on top.

**Suggestion:** Populate `last_transferred_at` from Solana transaction history, even if it's approximate.

### 2. Risk score endpoint not well documented for Solana
Finding the right endpoint and understanding what the score represents took some trial and error. The score ranges and what constitutes "high risk" aren't clearly defined in the docs.

**Suggestion:** Add a legend to the response — e.g. `{ score: 72, label: "medium", factors: ["new wallet", "few transactions"] }` — so apps can display meaningful context, not just a number.

### 3. Rate limits hit during development without clear headers
During testing with multiple wallets, we hit rate limits without clear `Retry-After` or rate limit headers in the response. Harder to implement proper backoff without knowing the window.

**Suggestion:** Return standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) on all responses.

### 4. USD quote occasionally returns 0 for valid tokens
Some mid-cap Solana tokens returned `quote_rate: 0` or `quote_rate: null` despite having active markets. We fell back to Jupiter Price API for these cases.

**Suggestion:** Consider pulling Jupiter's price oracle as a fallback for Solana tokens where Covalent's quote is unavailable.

---

## Overall

GoldRush saved us from building our own token metadata pipeline. The `balances_v2` endpoint is genuinely the fastest way to get enriched wallet data on Solana without running your own indexer. The main gaps are Solana-specific — activity timestamps, and some pricing gaps for long-tail tokens.
