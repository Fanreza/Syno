export default defineNuxtPlugin({
  name: 'auth-guard',
  parallel: true,
  setup() {
    const { forceLogout, isAuthenticated } = useAuth()
    let handling = false

    const nuxtApp = useNuxtApp()
    nuxtApp.hook('app:error', async (err: any) => {
      if (handling) return
      // Only react to actual HTTP 401 responses — not errors that happen to have
      // a statusCode field buried in their body (too broad, causes false logouts).
      const status = err?.statusCode ?? err?.response?.status
      if (status === 401 && isAuthenticated.value) {
        handling = true
        console.warn('[auth-guard] 401 detected, forcing logout')
        await forceLogout()
        handling = false
      }
    })
  },
})
