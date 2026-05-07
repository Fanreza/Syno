# Syno — Pitch Deck
### DePitch Framework: 11 Slides / 3-Minute Hackathon Format

---

## THE THREE-LEVEL PITCH

### Level 1: 5-second pitch
> "Syno is GoPay for crypto. Send any token by @username, in 2 taps, on Solana."

### Level 2: 30-second pitch
> "In Southeast Asia, 300 million people already send money by username — GoPay, GCash, Dana made it normal. But on Solana, you still need a 32-character wallet address just to pay a friend back for lunch. Syno fixes that. Type @username, pick a token, confirm. Syno handles the swap, the routing, the fees. No seed phrases, no address book, no broken UX. We built the full stack in 20 days: send, request, split, gift, payroll, swap, earn, recurring — everything GoPay does, but on-chain and open."

### Level 3: 3-minute pitch (full script — see each slide below)

---

## SLIDE 1: INTRO

**Core message:** Welcome them into the world where crypto payments are as simple as a DM.

**What goes on it:**
- Logo + name: **Syno**
- One-liner: *"Send crypto like sending a DM."*
- Name + title: **Fanreza, Founder**

**What you say:**
> "Hi, I'm Fanreza, founder of Syno. Today I'm showing you what payments on Solana look like when you stop asking users to be their own banks."

**Design notes:**
- Background: blurred city street at night, phones glowing — energy of mobile payments
- Logo centered, one-liner below in bold white

---

## SLIDE 2: PROBLEM

**Core message:** Crypto payments are still broken for normal people, and the numbers prove it.

**What goes on it:**
- Headline: **"Sending crypto is still harder than sending a text."**
- 3-beat visual flow (reveal one at a time):
  1. GoPay: *type name → confirm → done* (2 taps)
  2. Solana today: *find address → check token → manage ATA → confirm gas* (8 steps)
  3. Result: **Solana has 100M+ wallets. Less than 5% do a P2P transfer in any given month.**
- Stat (large text): **"$245B — what Venmo processed in 2023. There is no Venmo on Solana."**

**What you say:**
> "GoPay has 100 million users in Indonesia alone. You send money to your friend by typing their name, hit confirm, it's done. On Solana today, that same transaction requires a 44-character wallet address, knowing which token they accept, and hoping their token account is initialized. Nobody does this for lunch money. So crypto stays locked in wallets instead of flowing between people. Venmo processed $245 billion in 2023. There is no Venmo on Solana — yet."

**Transition:** *"And that's exactly what we built."*

---

## SLIDE 3: VALUE PROPOSITION

**Core message:** One sentence. The fix feels obvious once you hear it.

**What goes on it:**
- Large, centered text (nothing else):

> **"Send any token to @username. Syno handles the rest."**

**What you say:**
> "Syno. Send any token to anyone by @username. No addresses. No token management. No broken UX. Syno handles the routing, the swap, the fees. It works like GoPay. But it's on-chain, open, and composable."

**Transition:** *"Here's how it actually works."*

---

## SLIDE 4: HOW IT WORKS

**Core message:** Three steps. A 10-year-old can do this.

**What goes on it:**
Three animated reveals:
1. **Type @username** — contact picker with friends list, no addresses ever
2. **Pick token + amount** — any token: SOL, USDC, USDT, or anything via Jupiter auto-swap
3. **Confirm** — Syno signs server-side, tx lands in under 1 second

Below the flow:
> *"No seed phrases. No browser extensions. No broken UX."*

**What you say:**
> "Step one: type a username. Just like texting. Step two: pick your token and amount — pay in SOL, they receive USDC, Jupiter handles the swap automatically. Step three: confirm. The transaction is on-chain in under one second. No extension popup. No seed phrase prompt. The wallet lives server-side via Privy — users never see a private key."

**Transition:** *"Let me show you the product."*

---

## SLIDE 5: DEMO

**Core message:** It's live, it works, and it's smooth.

**What goes on it:**
- Embedded screen recording (30 seconds max)
- Wow moment: sender pays in SOL, receiver gets USDC — auto-swap happens invisibly

**Demo flow to record:**
1. Open app → dashboard loads with balance + 6 action buttons (0:00)
2. Tap "Send" → type @username → contact picker shows friends (0:06)
3. Pick USDC, type amount → Jupiter auto-swap badge appears (0:12)
4. Confirm → green "Transaction confirmed" toast + Solana Explorer link (0:18)
5. Switch to receiver view → FCM push notification pops in real time (0:24)
6. Brief flash of Gift envelope being claimed (0:28)

**What you say (over the demo):**
> "This is the real app, on Solana. I'm sending USDC to a friend who wants SOL — watch, Jupiter auto-converts it. Confirmed. Under a second. The receiver gets a push notification instantly. No wallet extension. No seed phrase. And here's the gift feature — drop funds into an envelope, share a link, anyone claims their share. No group chat IOU needed."

**Transition:** *"Now, how big is this market?"*

---

## SLIDE 6: MARKET

**Core message:** The market already exists. It's just running on Web2 rails.

**What goes on it:**
- Headline: **"The market is proven. It's just not on-chain yet."**
- Three data points (large text, reveal one at a time):
  - **$1.2 trillion** — digital payment volume in SE Asia (2024)
  - **380 million** — GoPay + GCash + Dana combined users
  - **Solana: 1M+ daily active wallets. 0 consumer P2P apps at scale.**
- Comparison visual: GoPay logo → [gap] → Syno logo (with Solana underneath)
- Footer: *"Venmo's 2023 volume: $245B. The Solana equivalent: zero. That's the gap."*

**What you say:**
> "Southeast Asia alone: 380 million people already pay each other by username. The behavior exists. The trust exists. The only thing missing is a Solana app that feels the same way. This is not a new market to create — it's an existing market to migrate. Venmo proved $245 billion a year flows through peer-to-peer payments in just the US. We're building that on-chain, global, and composable."

**Transition:** *"So how do we make money?"*

---

## SLIDE 7: BUSINESS MODEL

**Core message:** Every transaction generates revenue. Simple and proven.

**What goes on it:**
- Headline: **"How do we make money?"**
- Revenue stream (large, clean):
  - **0.3% fee** on each transaction
  - Applied to: Send, Gift, Split, Payroll
  - Swap transactions: Jupiter referral fee on top
- Math block:
  > *10,000 users x 3 tx/month x $20 avg x 0.3% = **$1,800 MRR***
  > *100,000 users = **$18,000 MRR***
- Footer: *"No subscription. No token required. Fee auto-deducted in the token being sent."*

**What you say:**
> "0.3% per transaction. Every send, every split, every gift envelope pays a small fee — invisible to the user at small amounts, but it compounds. At 10,000 active users averaging 3 transactions a month at $20 each: $1,800 MRR. At 100K users: $18,000 MRR. Swap transactions earn a Jupiter referral fee on top. Revenue from day one. No governance token required to use the product."

**Transition:** *"Here's where we are today."*

---

## SLIDE 8: TRACTION

**Core message:** 38 commits. 20 days. 10 features shipped and live.

**What goes on it:**
- Headline: **"Built in 20 days. 38 commits. Everything works."**
- Feature grid (all with checkmarks — these are ALL shipped and live):

| Feature | Status |
|---|---|
| Send by @username | Live |
| Payment links + QR (WhatsApp/Telegram share) | Live |
| Split bill with per-participant payment links | Live |
| Gift envelopes (fair claim, partial signing) | Live |
| Payroll (bulk sequential transfers) | Live |
| Jupiter token swap (live quotes, any-to-any) | Live |
| Private send (MagicBlock ephemeral rollup) | Live |
| Earn (Jupiter Lend positions) | Live |
| Recurring payments | Live |
| Spending analytics + tax export (CSV + PDF) | Live |

- Tech row (logos):
  - Privy server-side wallets (zero seed phrases on client)
  - Jupiter swap + referral
  - Firebase FCM push notifications
  - Helius on-chain history
  - GoldRush wallet risk score + portfolio
  - MagicBlock private send

**What you say:**
> "We shipped 10 full features in 20 days. Send, request, split, gift, payroll, swap, private send, earn, recurring payments, and analytics with tax export. All working on Solana. Every wallet is a Privy server-side wallet — users never see a seed phrase, never install an extension. The app works like a Web2 product. Real push notifications via Firebase FCM. On-chain history via Helius. Private send via MagicBlock. The full stack works."

**Transition:** *"Here's where we take it next."*

---

## SLIDE 9: GROWTH STRATEGY + ROADMAP

**Core message:** Consumer apps grow through word of mouth. Ours is designed for it.

**What goes on it:**

**Growth strategy (top half, 3 channels):**
1. **Viral payment links** — every RequestModal share is a Syno touchpoint in WhatsApp/Telegram
2. **Gift envelopes go viral** — recipient needs a Syno account to claim, that's the signup hook
3. **Payroll-led team onboarding** — one team lead pays 10 people, onboards 10 users in one action

**Roadmap (bottom half):**
| Quarter | Milestone |
|---|---|
| Q2 2026 | Mainnet launch, SIWS (Phantom/OKX), 1K active wallets |
| Q3 2026 | iOS PWA polish, contacts import, 10K active wallets |
| Q4 2026 | Merchant QR, B2B payroll API, $50K MRR |
| Q1 2027 | 100K active wallets, Series A readiness |

**What you say:**
> "Growth is built into the product. Every shared payment link, every gift envelope, every split bill is a Syno touchpoint in someone's WhatsApp group. The recipient doesn't have an account — they sign up to pay. That's the viral loop. Payroll users bring entire teams in one action. Mainnet launches Q2. We target 10K active wallets by end of Q3 and $50K MRR by Q4."

**Transition:** *"Here's who built this."*

---

## SLIDE 10: TEAM

**Core message:** Solo founder. 20 days. 38 commits. 10 features. That's the proof.

**What goes on it:**
- Your photo (left/center)
- **Fanreza** — Founder & Full-Stack Engineer
- Credibility facts:
  - 3+ years building production web apps with Vue.js and Nuxt.js
  - TypeScript-first, ships with Tailwind + Supabase + Solana web3.js
  - Active in crypto: trading, DeFi research (blog: "Trading Quietly in a Transparent World", "Understanding Yield Bearing Asset")
  - Built Syno solo: 38 commits, 20 days, 10 features live
- Founding story line (large, below the photo):
  > *"Built Syno because asking friends for a wallet address to split dinner is embarrassing. There had to be a better way."*

**Design note:** The 38 commits and feature list from the traction slide IS your team proof. "One person built all of this" is a credibility statement, not a weakness.

**What you say:**
> "I'm Fanreza, solo founder. 3 years building web apps with Vue and Nuxt — I've been in crypto long enough to know the UX is still broken. Every time I asked a friend to pay me in crypto, they'd say 'just send me GoPay.' That problem was real. So I shipped the fix — 38 commits, 20 days, 10 features, all working on Solana."

**Transition:** *"Here's how you can get involved."*

---

## SLIDE 11: CALL TO ACTION

**Core message:** Clear next step. QR code. One ask.

**What goes on it:**
- Large QR code: link to live demo (your deployed URL)
- Tagline (large): **"Send crypto like sending a DM."**
- Contact:
  - Try it: **syno.aethereal.top**
  - X/Twitter: **@Synojustpay**
  - Email: rezaramdhani461@gmail.com
- If live event: *"Find me after the session, I'll send you testnet SOL right now."*

**What you say:**
> "Syno is live. Scan this QR, try a send, see it confirm on-chain in under a second. We're looking for early ecosystem partners and users to go mainnet with. Every day this problem exists, people leave crypto in their wallets instead of using it. We've built the fix. Let's ship it."

*(Pause. Breathe. Don't rush this.)*

---

## SPOKEN SCRIPT (full 3-minute version, word for word)

> "Hi, I'm Fanreza, founder of Syno. Today I'm showing you what payments on Solana look like when you stop asking users to be their own banks.

> GoPay has 100 million users in Indonesia alone. Sending money: type a name, hit confirm, done. On Solana today, that same transaction requires a 44-character wallet address, knowing which token they accept, and hoping their token account is initialized. Nobody does this for lunch money. So crypto stays locked in wallets instead of flowing between people. Venmo processed $245 billion in 2023. There is no Venmo on Solana — yet.

> And that's exactly what we built. Syno. Send any token to anyone by @username. Syno handles the routing, the swap, the fees. It works like GoPay. But it's on-chain and open.

> Here's how it works. Type a username — just like texting. Pick your token and amount — pay in SOL, they receive USDC, Jupiter handles the swap automatically. Confirm. The transaction is on-chain in under one second. No extension popup. No seed phrase prompt.

> [Demo plays — 30 seconds]
> This is the real app. Sending USDC, friend receives SOL. Jupiter auto-converts it. Confirmed. Push notification arrives instantly. And here's the gift feature — drop funds into an envelope, share a link, anyone claims their share.

> The market already exists. 380 million people in Southeast Asia already pay each other by username. The behavior is there. The trust is there. The only thing missing is a Solana app that feels the same way. Venmo proved $245 billion a year flows through peer-to-peer payments in just the US. We're building that on-chain.

> How do we make money? 0.3% per transaction. At 10,000 active users averaging 3 transactions a month at $20 each: $1,800 MRR. At 100K users: $18,000 MRR. Swap transactions earn a Jupiter referral fee on top. Revenue from day one.

> We shipped 10 full features in 20 days. Send, request, split, gift, payroll, swap, private send, earn, recurring, analytics. All working on Solana. Privy server-side wallets — users never see a seed phrase. Firebase push notifications. Helius history. MagicBlock private send. The full stack works.

> Growth is built into the product. Every shared payment link, every gift envelope, every split bill is Syno in someone's WhatsApp group. The recipient signs up to claim or pay. That's the loop. Mainnet Q2. 10K active wallets by Q3. $50K MRR by Q4.

> I'm Fanreza, solo founder. I built Syno because I got tired of it myself — every time I asked a friend to pay me in crypto, they'd say 'just send me GoPay.' So I shipped the fix. 38 commits. 20 days. 10 features. All working.

> Syno is live. Scan the QR, try a send, see it confirm on-chain in under a second. We're here to build the Venmo of Solana. Let's ship it."

---

## LANGUAGE AUDIT (run this on your final script before presenting)

- No "trying to", "hoping to", "we imagine", "we could potentially"
- No conditionals: would / should / could / might
- No future tense outside the roadmap slide
- Numbers specific: not "around 10,000" but actual counts
- CTA is a statement, not a question
- Every slide has a natural transition sentence

---

## APPENDIX SLIDES (for Q&A — don't put in main deck)

1. **Tech stack** — Nuxt 4 / Supabase / Privy / Solana web3.js / Jupiter / Helius / Firebase / MagicBlock / GoldRush
2. **Why Privy server-side** — no browser SDK for Vue/Nuxt; server-signing means zero private key exposure on client
3. **Why no token** — fee model works without one; token can be added later as utility layer
4. **Competitive matrix** — vs. Tiplink (no swap), Helio (merchant-first), Dialect (messaging-first), Squads Pay (multisig-first)
5. **Private send** — MagicBlock ephemeral rollup, USDC/USDT only, no on-chain trace
6. **Security model** — all DB access via Nitro with service role key, no client-side Supabase calls, no RLS needed
7. **Why now** — Firedancer going live, Solana Chapter 2 mobile, stablecoin regulatory clarity in SE Asia, 1M+ daily active Solana wallets and growing
