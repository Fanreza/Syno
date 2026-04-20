export default defineNuxtRouteMiddleware(async (to) => {
  // Public routes — no auth check needed
  if (to.path === '/' || to.path === '/landing') return
  if (to.path === '/login' || to.path.startsWith('/auth/')) return
  if (to.path === '/terms' || to.path === '/privacy') return
  if (to.path.startsWith('/pay/')) return
  if (to.path.startsWith('/gift/')) return

  const { isReady, isAuthenticated, user } = useAuth()

  // Skip wait if already authenticated — avoids blocking every navigation
  if (!isAuthenticated.value && !isReady.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(isReady, (v) => {
        if (v) { stop(); resolve() }
      }, { immediate: true })
    })
  }

  if (!isAuthenticated.value) return navigateTo('/login')
  if (!user.value && to.path !== '/onboarding') return navigateTo('/onboarding')
  if (user.value && to.path === '/onboarding') return navigateTo('/app')
})
