import { getPrivy } from '~/config/privy'

export default defineNuxtPlugin(async () => {
  let privy: ReturnType<typeof getPrivy> | null = null

  try {
    privy = getPrivy()

    const iframeUrl = privy.embeddedWallet.getURL()
    const iframeOrigin = new URL(iframeUrl).origin

    const iframe = document.createElement('iframe')
    iframe.src = iframeUrl
    iframe.style.display = 'none'
    iframe.id = 'privy-iframe'
    iframe.allow = 'clipboard-read; clipboard-write'
    document.body.appendChild(iframe)

    let iframeReady = false
    const privyRef = privy

    window.addEventListener('message', (e: MessageEvent) => {
      if (!iframeReady || e.origin !== iframeOrigin) return
      try { privyRef.embeddedWallet.onMessage(e.data) } catch {}
    })

    // Block until iframe is ready and session is restored so middleware always
    // sees a definitive isReady=true — prevents the /app → /login → /app loop.
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 4000) // don't block forever

      iframe.addEventListener('load', async () => {
        if (iframe.contentWindow) {
          privyRef.setMessagePoster(iframe.contentWindow as any)
        }
        iframeReady = true
        const { restoreSession } = useAuth()
        await restoreSession()
        clearTimeout(timeout)
        resolve()
      })
    })
  } catch (e) {
    console.warn('[privy] failed to initialize:', e)
    // Ensure isReady is set even on failure so middleware doesn't hang
    const { isReady } = useAuth()
    isReady.value = true
  }

  return { provide: { privy } }
})
