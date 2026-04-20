import { PrivyClient } from '@privy-io/node'
import type { H3Event } from 'h3'

let cached: PrivyClient | null = null

export function authorizationContext() {
  const key = useRuntimeConfig().privyAuthorizationKey as string | undefined
  if (!key) return {}
  return { authorization_context: { authorization_private_keys: [key] } }
}

export function getPrivy(): PrivyClient {
  if (cached) return cached
  const config = useRuntimeConfig()
  if (!config.privyAppId || !config.privyAppSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Privy credentials missing' })
  }
  cached = new PrivyClient({
    appId: config.privyAppId,
    appSecret: config.privyAppSecret
  })
  return cached
}

export interface PrivyAuthClaims {
  userId: string
  appId: string
  sessionId?: string
}

export async function requireUser(event: H3Event): Promise<PrivyAuthClaims> {
  const auth = getHeader(event, 'authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Missing token' })

  try {
    const privy = getPrivy()
    const claims = await privy.utils().auth().verifyAuthToken(token)
    return {
      userId: claims.user_id,
      appId: claims.app_id,
      sessionId: claims.session_id
    }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }
}
