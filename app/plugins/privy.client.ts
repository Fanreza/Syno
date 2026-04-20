import { getPrivy } from '~/config/privy'

export default defineNuxtPlugin(() => {
  let privy: ReturnType<typeof getPrivy> | null = null

  try {
    privy = getPrivy()

    // Mount the hidden Privy iframe and wire postMessage <-> SDK
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

    iframe.addEventListener('load', () => {
      if (iframe.contentWindow) {
        privyRef.setMessagePoster(iframe.contentWindow)
      }
      iframeReady = true
      // Tell the auth store it's safe to read existing session
      const { restoreSession } = useAuth()
      restoreSession()
    })

    window.addEventListener('message', (e: MessageEvent) => {
      if (!iframeReady || e.origin !== iframeOrigin) return
      try {
        privyRef.embeddedWallet.onMessage(e.data)
      } catch {
        /* ignore malformed messages */
      }
    })
  } catch (e) {
    console.warn('[privy] failed to initialize:', e)
  }

  return { provide: { privy } }
})
