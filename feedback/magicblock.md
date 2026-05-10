# Feedback — MagicBlock Integration (Syno)

**Project:** Syno — crypto finance app on Solana  
**Website:** https://syno.aethereal.top  
**Integration used:** MagicBlock private SPL transfer API

---

## What we built with MagicBlock

Integrated MagicBlock's private send feature for shielded USDC/USDT transfers. Users can send stablecoins where the sender address, receiver address, and amount are hidden on-chain via MagicBlock's ephemeral rollup. Accessible from the Send modal with a "Private" toggle.

Flow:
1. Call `POST /v1/spl/transfer` with `visibility: "private"`, `fromBalance: "base"`, `toBalance: "base"`
2. MagicBlock returns an unsigned transaction + routing info (`sendTo: "ephemeral" | "base"`, `validator` URL)
3. We sign with the sender's Privy server wallet and broadcast to the appropriate endpoint (ephemeral validator or Solana RPC)
4. Confirm on Solana mainnet

---

## What worked well

- **API is simple.** One POST endpoint to get an unsigned transaction — no complex setup or SDK required.
- **`sendTo` + `validator` routing** is a clean pattern. MagicBlock tells the caller where to broadcast, so we don't need to hardcode the ephemeral validator URL.
- **`initIfMissing` / `initAtasIfMissing`** flags are a nice touch — handles ATA creation automatically so we don't need to preflight account existence checks.
- Works on mainnet with real USDC/USDT. The privacy layer is transparent to the user — same UX as a regular send.

---

## Issues & friction

### 1. Can't be spawned as a child process in serverless environments (Vercel/Nitro)
Our initial implementation wrapped the MagicBlock logic in a standalone `.mjs` runner spawned as a child process (to isolate the ESM dependency). This failed on Vercel because Nitro bundles everything and the separate file wasn't included in the bundle.

**Fix on our side:** Inlined all MagicBlock logic directly into the server utility — no child process.

**Note for others building on Vercel/serverless:** Don't rely on `child_process.spawn` with separate script files. The MagicBlock integration works fine when inlined — it's just a `fetch` + sign + broadcast pattern.

### 2. `skipPreflight: false` required but not documented
Solana's preflight simulation doesn't have visibility into MagicBlock's ephemeral state, so simulation fails even when the transaction would succeed on-chain. We discovered this through trial and error.

**Suggestion:** Document that callers should use `skipPreflight: true` when broadcasting to the ephemeral validator. This is a non-obvious footgun.

### 3. Only supports USDC and USDT
Private send is limited to two stablecoins. For a payments app this is fine, but it would be useful to support SOL or other SPL tokens for broader use cases.

**Suggestion:** Document the supported token list explicitly in the API response or docs, and ideally support SOL natively.

### 4. No way to query shielded balance from the API
After a private send, the recipient's shielded balance isn't visible via standard Solana RPC. There's no documented API to check shielded balances, which makes it hard to build a "received private transfers" history view.

**Suggestion:** Expose a read endpoint for shielded balances per wallet address, so apps can display the full picture to users.

### 5. Protocol fee (~1%) adds complexity to ExactOut flows
When the user wants to send exactly $10 USDC privately, the ~1% MagicBlock fee means we need to acquire $10.10 USDC first. In swap-then-send flows, we use ExactOut on Jupiter to get the right amount pre-fee. This works but requires careful calculation and isn't documented.

**Suggestion:** Document the fee structure clearly and consider returning the fee amount in the `/v1/spl/transfer` response so callers can display it to users.

---

## Overall

MagicBlock's private send is the only production-ready privacy layer for SPL tokens on Solana mainnet that we found. The API is clean and the ephemeral rollup approach is clever. The main friction points are around serverless deployment (child_process issue) and the `skipPreflight` behavior — both are one-time discoveries, not ongoing issues. Would love to see shielded balance queries and broader token support in the future.
