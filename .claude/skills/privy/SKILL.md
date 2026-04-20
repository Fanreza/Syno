---
name: Privy
description: Use when building authentication systems, embedded wallets, and wallet controls for blockchain applications. Reach for Privy when you need to onboard users with multiple login methods, create self-custodial wallets, manage wallet permissions with policies, or integrate wallet signing into your app.
metadata:
    mintlify-proj: privy
    version: "1.0"
---

# Privy Skill Reference

## Product summary

Privy is an authentication and wallet infrastructure platform that enables developers to onboard users and manage blockchain wallets. It provides three interconnected layers: authentication (email, social, passkeys, wallet login), embedded wallets (self-custodial wallets managed by Privy's infrastructure), and controls (policies and authorization rules that define who can take actions and what they're allowed to do).

**Key files and configuration:**
- `PrivyProvider` component wraps your app and initializes the SDK
- App ID and app secret from Privy Dashboard authenticate API requests
- Webhooks configured in Dashboard for transaction and user events
- Policies defined in Dashboard or via API to control wallet actions

**Primary docs:** https://docs.privy.io

**SDKs available:** React, React Native, Swift, Android, Flutter, Unity, Node.js, Python, Java, Go, Rust, REST API

## When to use

Reach for Privy when:
- Building user authentication with multiple login methods (email, SMS, social, wallet, passkey)
- Creating embedded wallets for users without requiring them to manage keys
- Implementing wallet signing and transaction flows in your app
- Setting up authorization controls, policies, or multi-sig wallets
- Integrating wallet actions like swaps, transfers, or earn protocols
- Managing server-side wallet operations via API
- Tracking transaction status and wallet events via webhooks
- Migrating existing users to Privy wallets

## Quick reference

### Core hooks (React)

| Hook | Purpose |
|------|---------|
| `usePrivy()` | Access auth state (`authenticated`, `user`, `login`, `logout`, `ready`) |
| `useWallets()` | Get connected wallets and create new ones |
| `useSendTransaction()` | Send transactions from a wallet |
| `useSignTransaction()` | Sign a transaction without sending |
| `useSignMessage()` | Sign arbitrary messages |
| `useCreateWallet()` | Create new embedded wallets |

### API authentication

All REST API calls require two headers:
- `Authorization: Basic <base64(appId:appSecret)>`
- `privy-app-id: <your-app-id>`

### PrivyProvider configuration

```tsx
<PrivyProvider
  appId="your-privy-app-id"
  clientId="your-app-client-id"
  config={{
    embeddedWallets: {
      ethereum: { createOnLogin: 'users-without-wallets' },
      solana: { createOnLogin: 'users-without-wallets' }
    },
    loginMethods: ['email', 'wallet', 'google', 'discord'],
    appearance: { showWalletLoginFirst: true }
  }}
>
  {children}
</PrivyProvider>
```

### Wallet control models

| Model | Owner | Use case |
|-------|-------|----------|
| User-owned | User only | Self-custodial consumer wallets |
| User + server | User + authorization key | Automated trading, limit orders |
| Application-owned | Authorization key | Treasury, bots, agents |
| Custodial | Licensed custodian | FBO banking model |

### Webhook event types

| Event | Trigger |
|-------|---------|
| `user.created` | New user registered |
| `user.authenticated` | User logged in |
| `wallet.funds_deposited` | Funds received |
| `transaction.broadcasted` | Tx submitted to network |
| `transaction.confirmed` | Tx confirmed on-chain |
| `transaction.failed` | Tx failed or reverted |
| `intent.created` | Approval request created |
| `intent.authorized` | Approval request signed |

## Decision guidance

### When to use embedded wallets vs external wallets

| Scenario | Embedded | External |
|----------|----------|----------|
| New users, no crypto experience | ✓ | |
| Users have existing wallets | | ✓ |
| Need key export capability | ✓ | |
| Users control keys directly | | ✓ |
| Seamless onboarding UX | ✓ | |
| Power users, familiar with MetaMask | | ✓ |

### When to use Privy auth vs JWT-based auth

| Scenario | Privy auth | JWT-based |
|----------|-----------|-----------|
| Building from scratch | ✓ | |
| Multiple login methods needed | ✓ | |
| Existing auth system | | ✓ |
| Social login required | ✓ | |
| Custom authentication | | ✓ |

### When to use policies vs signers

| Scenario | Policies | Signers |
|----------|----------|---------|
| Limit transaction amounts | ✓ | |
| Restrict recipient addresses | ✓ | |
| Delegate scoped permissions | | ✓ |
| Require multi-sig approval | ✓ | ✓ |
| Enforce time windows | ✓ | |
| Server automation | | ✓ |

## Workflow

### 1. Set up authentication and wallets

1. Create a Privy app in the Dashboard and get your app ID
2. Wrap your app with `PrivyProvider` at the root
3. Configure login methods and embedded wallet creation in the config
4. Wait for `ready` from `usePrivy()` before rendering auth-dependent content
5. Use `usePrivy()` to access `login`, `authenticated`, and `user` state

### 2. Create and access wallets

1. Configure `embeddedWallets` in `PrivyProvider` config with `createOnLogin` setting
2. Use `useWallets()` hook to get the user's wallets
3. Find the embedded wallet: `wallets.find(w => w.walletClientType === 'privy')`
4. Access wallet address and chain information from the wallet object
5. For server-side wallet creation, use the Node.js SDK with authorization keys

### 3. Send transactions

1. Get the wallet address from `useWallets()`
2. Use `useSendTransaction()` to send a transaction
3. Pass the transaction object with `to`, `value`, `data` fields
4. Optionally set `sponsor: true` for gas sponsorship
5. Handle the returned transaction hash and listen for webhook events

### 4. Implement policies and controls

1. Define policies in the Privy Dashboard under Wallet Infrastructure > Policies
2. Create condition sets to specify allowed recipients, amounts, or contract interactions
3. Attach policies to wallets or signers via API or Dashboard
4. For multi-sig, create key quorums with required signers
5. Test policies in development before deploying to production

### 5. Set up webhooks

1. Navigate to Webhooks in the Privy Dashboard
2. Add your webhook endpoint URL
3. Subscribe to relevant events (transaction, user, wallet, intent)
4. Implement webhook handlers in your backend
5. Verify webhook signatures using your app secret
6. Log webhook events for debugging and monitoring

### 6. Query users and wallets server-side

1. Get the user's identity token from the client via `usePrivy()`
2. Send the token to your backend
3. Use the Node.js SDK: `privy.users().get({id_token: 'token'})`
4. Query wallets: `privy.wallets().get({id: 'wallet-id'})`
5. Cache user data to avoid rate limits on repeated queries

## Common gotchas

- **Not waiting for `ready`**: Always check `usePrivy().ready` before accessing auth state or wallets. Privy initializes asynchronously.
- **Missing PrivyProvider**: Any component using Privy hooks must be wrapped by `PrivyProvider`. It must be near the root of your app.
- **Wallet not created**: If `createOnLogin` is `'off'`, wallets won't be created automatically. Call `createWallet()` manually or set it to `'users-without-wallets'`.
- **Forgetting to configure networks**: If using Solana or custom EVM networks, configure RPC endpoints in the `PrivyProvider` config or wallets won't work.
- **API auth headers missing**: REST API calls fail silently without proper `Authorization` and `privy-app-id` headers. Always include both.
- **Policies not enforced**: Policies are evaluated at signing time. If a transaction violates a policy, the user sees an error. Test policies in development.
- **Webhook signature verification skipped**: Always verify webhook signatures using your app secret to prevent spoofed events.
- **Rate limiting on user queries**: The REST API rate-limits user lookups. Use identity tokens instead of querying by email or wallet address when possible.
- **External wallet not configured**: To use external wallets (MetaMask, Phantom), configure them in `externalWallets` prop and pass connectors.
- **MFA not enforced on sensitive actions**: MFA is optional by default. Enable it in Dashboard for high-value transactions.

## Verification checklist

Before submitting work with Privy:

- [ ] `PrivyProvider` wraps the app at the root level
- [ ] `usePrivy().ready` is checked before accessing auth state
- [ ] Wallet creation is configured (`createOnLogin` is not `'off'`)
- [ ] Network RPC endpoints are configured if using Solana or custom chains
- [ ] Transaction signing uses the correct hook (`useSendTransaction` or `useSignTransaction`)
- [ ] Policies are defined and attached to wallets/signers if needed
- [ ] Webhook endpoint is registered and handlers are implemented
- [ ] API calls include both `Authorization` and `privy-app-id` headers
- [ ] Webhook signatures are verified in the backend
- [ ] Error handling covers common failures (user not authenticated, wallet not found, policy violation)
- [ ] App ID and secrets are stored in environment variables, not hardcoded
- [ ] Tested in development environment before deploying to production

## Resources

**Comprehensive navigation:** https://docs.privy.io/llms.txt

**Critical documentation pages:**
- [Key Concepts](https://docs.privy.io/basics/key-concepts) — Understand authentication, wallets, and controls
- [React Setup](https://docs.privy.io/basics/react/setup) — Initialize PrivyProvider and configure the SDK
- [Wallets Overview](https://docs.privy.io/wallets/overview) — Learn embedded and external wallet options
- [Policies & Controls](https://docs.privy.io/controls/overview) — Implement authorization rules and multi-sig
- [REST API Setup](https://docs.privy.io/basics/rest-api/setup) — Authenticate and call server-side APIs
- [Webhooks](https://docs.privy.io/api-reference/webhooks/overview) — Set up event notifications

---

> For additional documentation and navigation, see: https://docs.privy.io/llms.txt