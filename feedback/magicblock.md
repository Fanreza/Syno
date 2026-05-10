# Feedback: MagicBlock integration (Syno)

**Project:** Syno, a crypto finance app on Solana  
**Website:** https://syno.aethereal.top  
**Integration used:** MagicBlock private SPL transfer API

---

## What we built

We integrated MagicBlock's private send for shielded USDC/USDT transfers. Users can send stablecoins where the sender address, receiver address, and amount are hidden on-chain. It is accessible from the Send modal with a "Private" toggle.

The flow:
1. POST to `/v1/spl/transfer` with `visibility: "private"`, `fromBalance: "base"`, `toBalance: "base"`
2. MagicBlock returns an unsigned transaction and routing info (`sendTo: "ephemeral" | "base"`, `validator` URL)
3. We sign with the sender's Privy server wallet and broadcast to the right endpoint
4. Confirm on Solana mainnet

---

## What worked

One POST endpoint, unsigned transaction back, you sign and broadcast. No SDK required. The `sendTo` and `validator` routing is a clean pattern. MagicBlock tells you where to broadcast so you do not have to hardcode anything. `initIfMissing` and `initAtasIfMissing` handle ATA creation automatically. Works on mainnet with real USDC/USDT, and from the user's perspective it feels identical to a regular send.

---

## Issues

**1. Cannot spawn as a child process in serverless environments**

Our initial implementation wrapped the MagicBlock logic in a standalone `.mjs` runner and spawned it as a child process to isolate the ESM dependency. This failed on Vercel because Nitro bundles everything and the separate file is not included in the output.

Fix on our side: inlined all MagicBlock logic directly into the server utility. It is just a `fetch` + sign + broadcast pattern, so inlining it works fine.

Note for anyone building on Vercel or another Nitro-based host: do not try to run MagicBlock in a child process. Just inline it.

**2. `skipPreflight` behavior is not documented**

Solana's preflight simulation does not have visibility into MagicBlock's ephemeral state, so simulation fails even when the transaction would succeed on-chain. We figured this out through trial and error.

Suggestion: document that callers should use `skipPreflight: true` when broadcasting to the ephemeral validator. This is a non-obvious footgun.

**3. Only USDC and USDT are supported**

For a payments app this is mostly fine, but SOL support would cover a lot more use cases.

Suggestion: document the supported token list explicitly in the API response or docs, not just in a blog post somewhere.

**4. No way to query shielded balance**

After a private send, the recipient's shielded balance is not visible via standard Solana RPC. There is no documented endpoint to check it. This makes it impossible to build a "received private transfers" history view without asking MagicBlock to add one.

Suggestion: expose a read endpoint for shielded balances per wallet address.

**5. Protocol fee adds complexity to ExactOut flows**

MagicBlock charges roughly 1% on top of the send amount. When the user wants to send exactly $10 USDC, we need to acquire $10.10 first. In swap-then-send flows, we use Jupiter ExactOut to get the right amount pre-fee. It works, but the calculation is on us and the fee structure is not documented.

Suggestion: return the fee amount in the `/v1/spl/transfer` response so callers can display it to users and compute ExactOut amounts without guessing.

---

## Overall

MagicBlock's private send is the only production-ready privacy option for SPL tokens on Solana mainnet we found. The API is minimal in a good way. The friction points were all one-time discoveries: the child process issue during deployment and the `skipPreflight` behavior. Once past those, the integration runs reliably.
