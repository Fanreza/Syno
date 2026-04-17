import {
  getUserEmbeddedEthereumWallet,
  getUserEmbeddedSolanaWallet,
  getEntropyDetailsFromAccount,
  type User as PrivyUser
} from '@privy-io/js-sdk-core'
import { getPrivy } from '~/config/privy'

export interface AppUser {
  id: string
  privy_user_id: string
  username: string
  wallet_address: string
  email: string | null
}

export function useAuth() {
  // useState with a string key is globally shared across all useAuth() calls,
  // so these behave as singletons while staying inside a Nuxt context.
  const isReady = useState<boolean>('auth:isReady', () => false)
  const isAuthenticated = useState<boolean>('auth:isAuthenticated', () => false)
  const privyUser = useState<PrivyUser | null>('auth:privyUser', () => null)
  const accessToken = useState<string | null>('auth:token', () => null)
  const solanaAddress = useState<string | null>('auth:solana', () => null)
  const appUser = useState<AppUser | null>('auth:appUser', () => null)

  function privy() {
    return getPrivy()
  }

  async function apiFetch<T>(url: string, opts: any = {}): Promise<T> {
    const headers: Record<string, string> = { ...(opts.headers || {}) }
    if (accessToken.value) headers.Authorization = `Bearer ${accessToken.value}`
    return $fetch<T>(url, { ...opts, headers })
  }

  async function ensureSolanaWallet(user: PrivyUser): Promise<PrivyUser> {
    let eth = getUserEmbeddedEthereumWallet(user)
    let sol = getUserEmbeddedSolanaWallet(user)

    if (!eth) {
      const created = await privy().embeddedWallet.create({})
      user = (created as any).user ?? user
      eth = getUserEmbeddedEthereumWallet(user)
    }

    if (!sol) {
      const created = await privy().embeddedWallet.createSolana({
        ethereumAccount: eth ?? undefined
      } as any)
      user = (created as any).user ?? user
      sol = getUserEmbeddedSolanaWallet(user)
    }

    if (sol) solanaAddress.value = sol.address
    return user
  }

  async function refreshAppUser() {
    if (!accessToken.value) {
      appUser.value = null
      return null
    }
    const me = await apiFetch<AppUser | null>('/api/users/me').catch(() => null)
    appUser.value = me
    return me
  }

  async function handlePostLogin(session: { user: PrivyUser }) {
    const updated = await ensureSolanaWallet(session.user)
    privyUser.value = updated
    accessToken.value = (await privy().getAccessToken()) ?? null
    isAuthenticated.value = true
    isReady.value = true
    await refreshAppUser()
  }

  async function restoreSession() {
    try {
      const token = await privy().getAccessToken()
      if (token) {
        accessToken.value = token
        const { user } = await privy().user.get()
        if (user) {
          privyUser.value = user
          const sol = getUserEmbeddedSolanaWallet(user)
          if (sol) solanaAddress.value = sol.address
          isAuthenticated.value = true
          await refreshAppUser()
        }
      }
    } catch (e) {
      console.warn('[auth] restoreSession failed', e)
    } finally {
      isReady.value = true
    }
  }

  async function sendEmailCode(email: string) {
    await privy().auth.email.sendCode(email)
  }

  async function loginWithEmail(email: string, code: string) {
    const session = await privy().auth.email.loginWithCode(email, code)
    await handlePostLogin(session as any)
  }

  async function loginWithGoogle() {
    const redirectURI = `${window.location.origin}/auth/callback`
    const result = await privy().auth.oauth.generateURL('google', redirectURI)
    localStorage.setItem('payra:oauth-provider', 'google')
    window.location.assign(result.url)
  }

  async function completeOAuthLogin(code: string, state: string) {
    const session = await privy().auth.oauth.loginWithCode(code, state)
    await handlePostLogin(session as any)
  }

  async function loginWithSolanaWallet(wallet: any) {
    // Support both Wallet Standard and legacy window.solana providers
    const isWalletStandard = typeof wallet.features === 'object'

    let address: string
    let signFn: (msg: Uint8Array) => Promise<Uint8Array>

    if (isWalletStandard) {
      // Wallet Standard: connect via 'standard:connect', sign via 'solana:signMessage'
      const connectFeature = wallet.features['standard:connect']
      if (connectFeature) await connectFeature.connect()
      const account = wallet.accounts?.[0]
      if (!account) throw new Error('No account found in wallet')
      address = account.address

      const signFeature = wallet.features['solana:signMessage'] ?? wallet.features['standard:signMessage']
      if (!signFeature) throw new Error('Wallet does not support signMessage')
      signFn = async (msg: Uint8Array) => {
        const [result] = await signFeature.signMessage({ account, message: msg })
        return result.signature
      }
    } else {
      // Legacy provider (window.solana style)
      if (wallet.connect) await wallet.connect()
      address = wallet.publicKey.toString()
      signFn = async (msg: Uint8Array) => {
        const result = await wallet.signMessage(msg)
        return result.signature ?? result
      }
    }

    const { nonce } = await (privy().auth as any).siws.fetchNonce({ address })

    const issuedAt = new Date().toISOString()
    const message = [
      `${window.location.host} wants you to sign in with your Solana account:`,
      address,
      '',
      'By signing, you are proving you own this wallet and logging in.',
      '',
      `URI: ${window.location.origin}`,
      'Version: 1',
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join('\n')

    const encoded = new TextEncoder().encode(message)
    const signatureBytes = await signFn(encoded)
    const signatureBase58 = encodeBase58(signatureBytes)

    const walletName = (isWalletStandard ? wallet.name : wallet.name) ?? 'phantom'
    const session = await (privy().auth as any).siws.login({
      mode: 'login-or-link',
      message,
      signature: signatureBase58,
      walletClientType: walletName.toLowerCase().replace(/\s+/g, '_'),
      connectorType: 'injected',
    })
    await handlePostLogin(session as any)
  }

  function encodeBase58(bytes: Uint8Array): string {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let num = BigInt(0)
    for (const byte of bytes) num = num * BigInt(256) + BigInt(byte)
    let encoded = ''
    while (num > BigInt(0)) {
      encoded = ALPHABET[Number(num % BigInt(58))] + encoded
      num = num / BigInt(58)
    }
    for (const byte of bytes) {
      if (byte === 0) encoded = '1' + encoded
      else break
    }
    return encoded
  }


  async function registerUsername(username: string) {
    if (!solanaAddress.value) throw new Error('Wallet not ready')
    const me = await apiFetch<AppUser>('/api/users/register', {
      method: 'POST',
      body: { username, wallet_address: solanaAddress.value }
    })
    appUser.value = me
    return me
  }

  async function getSolanaProvider() {
    const user = privyUser.value
    if (!user) throw new Error('Not authenticated')
    const sol = getUserEmbeddedSolanaWallet(user)
    if (!sol) throw new Error('No Solana wallet')
    const entropy = getEntropyDetailsFromAccount(sol)
    return await privy().embeddedWallet.getSolanaProvider(
      sol,
      entropy.entropyId,
      entropy.entropyIdVerifier
    )
  }

  async function logout() {
    try { await privy().logout() } catch {}
    privyUser.value = null
    accessToken.value = null
    solanaAddress.value = null
    appUser.value = null
    isAuthenticated.value = false
    await navigateTo('/login')
  }

  return {
    isReady,
    isAuthenticated,
    user: appUser,
    privyUser,
    solanaAddress,
    accessToken,
    apiFetch,
    restoreSession,
    sendEmailCode,
    loginWithEmail,
    loginWithGoogle,
    completeOAuthLogin,
    registerUsername,
    refreshAppUser,
    getSolanaProvider,
    loginWithSolanaWallet,
    logout
  }
}
