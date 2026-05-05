export function useOnboarding() {
  const STORAGE_KEY = 'syno_onboarding_done'

  async function startTour() {
    const { driver } = await import('driver.js')
    await import('driver.js/dist/driver.css')

    const driverObj = driver({
      animate: true,
      showProgress: true,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done ✓',
      overlayOpacity: 0.65,
      allowClose: true,
      disableActiveInteraction: true,
      steps: [
        // ── Dashboard ──────────────────────────────────────────────────────
        {
          element: '[data-tour="balance"]',
          popover: {
            title: '💰 Your balance',
            description: 'Total wallet value across all your tokens, updated in real time.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="send"]',
          popover: {
            title: '✈️ Send',
            description: 'Send any token to a @username or wallet address. Syno auto-converts if needed.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="request"]',
          popover: {
            title: '🔗 Request',
            description: 'Generate a payment link with a QR code. Share via WhatsApp or Telegram to get paid.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="swap"]',
          popover: {
            title: '🔄 Swap',
            description: 'Swap any token for another at the best rate, powered by Jupiter.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="split"]',
          popover: {
            title: '🍽️ Split bills',
            description: 'Split expenses with friends. Each person gets their own payment link.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="gift"]',
          popover: {
            title: '🧧 Gift envelopes',
            description: 'Create a crypto gift with multiple claim slots. Share the link — first come, first served.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="payroll"]',
          popover: {
            title: '💼 Payroll',
            description: 'Pay your whole team in one click. Bulk send to any @username or wallet.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="holdings"]',
          popover: {
            title: '📊 Holdings',
            description: 'All your tokens and earning positions in one place.',
            side: 'top',
            align: 'start',
          },
        },
        // ── Sidebar / bottom nav ───────────────────────────────────────────
        {
          element: '[data-tour="nav-notifications"]',
          popover: {
            title: '🔔 Notifications',
            description: 'Payments received, gifts claimed, splits — all here.',
            side: 'right',
          },
        },
        {
          element: '[data-tour="nav-earn"]',
          popover: {
            title: '📈 Earn',
            description: 'Deposit tokens and earn yield via Jupiter Lend. Withdraw anytime.',
            side: 'right',
          },
        },
        {
          element: '[data-tour="nav-friends"]',
          popover: {
            title: '👥 Friends',
            description: 'Add friends by @username. Quick contacts in Send and Split.',
            side: 'right',
          },
        },
        {
          element: '[data-tour="nav-activity"]',
          popover: {
            title: '📋 Activity',
            description: 'Full history of your on-chain and in-app transactions.',
            side: 'right',
          },
        },
        {
          element: '[data-tour="nav-profile"]',
          popover: {
            title: '👤 Profile',
            description: 'View your wallet address and export your private key if needed.',
            side: 'right',
          },
        },
      ],
      onDestroyStarted: () => {
        localStorage.setItem(STORAGE_KEY, '1')
        driverObj.destroy()
      },
    })

    localStorage.setItem(STORAGE_KEY, '1')
    driverObj.drive()
  }

  function shouldShow() {
    if (import.meta.server) return false
    return !localStorage.getItem(STORAGE_KEY)
  }

  function resetTour() {
    if (import.meta.server) return
    localStorage.removeItem(STORAGE_KEY)
  }

  return { startTour, shouldShow, resetTour }
}
