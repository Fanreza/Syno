import Privy, { LocalStorage } from '@privy-io/js-sdk-core'

let privyInstance: Privy | null = null

export function getPrivy(): Privy {
  if (privyInstance) return privyInstance
  const config = useRuntimeConfig()
  privyInstance = new Privy({
    appId: config.public.privyAppId as string,
    clientId: config.public.privyClientId as string,
    storage: new LocalStorage()
  })
  return privyInstance
}

export function resetPrivy(): void {
  privyInstance = null
}
