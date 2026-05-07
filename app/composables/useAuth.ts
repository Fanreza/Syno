import type Privy from '@privy-io/js-sdk-core'
import { createSiwsMessage } from '@privy-io/js-sdk-core'
import { getPrivy, resetPrivy } from '~/config/privy'

type PrivyUser = Awaited<ReturnType<Privy['user']['get']>>['user']

export interface AppUser {
  id: string
  privy_user_id: string
  username: string
  wallet_address: string
  privy_wallet_id: string | null
  email: string | null
}

export function useAuth() {
  const isReady = useState<boolean>('auth:isReady', () => false)
  const isAuthenticated = useState<boolean>('auth:isAuthenticated', () => false)
  const privyUser = useState<PrivyUser | null>('auth:privyUser', () => null)
  const accessToken = useState<string | null>('auth:token', () => null)
  const identityToken = useState<string | null>('auth:identityToken', () => null)
  const appUser = useState<AppUser | null>('auth:appUser', () => null)

  const walletAddress = computed(() => appUser.value?.wallet_address ?? null)
  const solanaAddress = walletAddress

  function privy() { return getPrivy() }

  async function apiFetch<T>(url: string, opts: any = {}): Promise<T> {
    const fresh = await privy().getAccessToken().catch(() => null)
    if (fresh) accessToken.value = fresh
    const headers: Record<string, string> = { ...(opts.headers || {}) }
    const token = fresh ?? accessToken.value
    if (token) headers.Authorization = `Bearer ${token}`
    const freshIdToken = await privy().getIdentityToken().catch(() => null)
    if (freshIdToken) identityToken.value = freshIdToken
    const idToken = freshIdToken ?? identityToken.value
    if (idToken) headers['x-identity-token'] = idToken
    return $fetch<T>(url, { ...opts, headers })
  }

  async function refreshAppUser() {
    if (!accessToken.value) { appUser.value = null; return null }
    const me = await apiFetch<AppUser | null>('/api/users/me').catch(() => null)
    appUser.value = me
    return me
  }

  async function handlePostLogin(session: { user: PrivyUser }) {
    privyUser.value = session.user
    accessToken.value = (await privy().getAccessToken()) ?? null
    identityToken.value = (await privy().getIdentityToken().catch(() => null)) ?? (session as any).identity_token ?? null
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
    localStorage.setItem('syno:oauth-provider', 'google')
    window.location.assign(result.url)
  }

  async function completeOAuthLogin(code: string, state: string) {
    const session = await privy().auth.oauth.loginWithCode(code, state)
    await handlePostLogin(session as any)
  }

  async function loginWithSolanaWallet(wallet: any, walletName?: string) {
    const features = wallet.features ?? {}
    const featureKeys = Object.keys(features)
    const isWalletStandard = featureKeys.length > 0 && featureKeys.some(k => k.startsWith('solana:') || k.startsWith('standard:'))

    let address: string
    let signFn: (msg: Uint8Array) => Promise<Uint8Array>

    if (isWalletStandard) {
      const connectFeature = features['standard:connect']
      if (connectFeature) await connectFeature.connect()
      const accounts: any[] = wallet.accounts ?? []
      const rawAccount = accounts[0]
      if (!rawAccount) throw new Error('No account found. Make sure your wallet is unlocked and has an account.')
      const resolvedAddress: string = typeof rawAccount.address === 'string'
        ? rawAccount.address
        : encodeBase58(rawAccount.address as Uint8Array)
      address = resolvedAddress
      const signFeature = features['solana:signMessage'] ?? features['standard:signMessage']
      if (!signFeature) throw new Error('Wallet does not support signMessage')
      signFn = async (msg: Uint8Array) => {
        const results = await signFeature.signMessage({ account: rawAccount, message: msg })
        const [result] = Array.isArray(results) ? results : [results]
        return result.signature
      }
    } else {
      if (wallet.connect) await wallet.connect()
      const pubkey = wallet.publicKey
      if (!pubkey) throw new Error('Wallet not connected or locked. Please unlock your wallet and try again.')
      address = typeof pubkey.toString === 'function' ? pubkey.toString() : encodeBase58(pubkey.toBytes())
      signFn = async (msg: Uint8Array) => {
        const result = await wallet.signMessage(msg)
        return result.signature ?? result
      }
    }

    const privyInstance = privy()
    const siws = (privyInstance.auth as any).siws
    const { nonce } = await siws.fetchNonce({ address })
    const message = createSiwsMessage({
      address,
      nonce,
      domain: window.location.host,
      uri: window.location.origin,
    })
    const encoded = new TextEncoder().encode(message)
    const signatureBytes = await signFn(encoded)
    const signatureBase64 = btoa(String.fromCharCode(...signatureBytes))
    const resolvedWalletName = (walletName ?? wallet.name ?? 'phantom').toLowerCase().replace(/\s+/g, '_')
    const session = await siws.login({
      mode: 'login-or-sign-up',
      message,
      signature: signatureBase64,
      walletClientType: resolvedWalletName,
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
    const me = await apiFetch<AppUser>('/api/users/register', {
      method: 'POST',
      body: { username }
    })
    appUser.value = me
    return me
  }

  function clearAllStorage() {
    try { sessionStorage.clear() } catch {}
    // Only clear our own keys — Privy manages its own localStorage entries.
    // Nuking all localStorage breaks Privy's session restoration on next load.
    try {
      const toRemove = Object.keys(localStorage).filter(k =>
        k.startsWith('syno_') || k.startsWith('syno:')
      )
      toRemove.forEach(k => localStorage.removeItem(k))
    } catch {}
    // Don't remove the Privy iframe — it's needed for Privy to communicate.
    // privy().auth.logout() above already invalidates the session server-side.
  }

  function clearVueState() {
    privyUser.value = null
    accessToken.value = null
    identityToken.value = null
    appUser.value = null
    isAuthenticated.value = false
    isReady.value = false
    useState('wallet:balance').value = null
    useState('wallet:balance:pending').value = false
    useState('notif-unread').value = 0
    useState('friends:list').value = []
    useState('friends:loaded').value = false
    try {
      const nuxtApp = useNuxtApp()
      for (const key of Object.keys(nuxtApp.payload.data ?? {})) {
        delete nuxtApp.payload.data[key]
      }
    } catch {}
  }

  async function logout() {
    try { await privy().auth.logout() } catch {}
    resetPrivy()
    clearAllStorage()
    clearVueState()
    await navigateTo('/login')
  }

  async function forceLogout() {
    try { await privy().auth.logout() } catch {}
    resetPrivy()
    clearAllStorage()
    clearVueState()
    await navigateTo('/login')
  }

  return {
    isReady,
    isAuthenticated,
    user: appUser,
    privyUser,
    solanaAddress,
    walletAddress,
    accessToken,
    apiFetch,
    restoreSession,
    sendEmailCode,
    loginWithEmail,
    loginWithGoogle,
    completeOAuthLogin,
    registerUsername,
    refreshAppUser,
    loginWithSolanaWallet,
    logout,
    forceLogout,
  }
}
