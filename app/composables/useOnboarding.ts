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
      allowClose: false,
      disableActiveInteraction: true,
      steps: [
        {
          element: '[data-tour="balance"]',
          popover: {
            title: 'Your balance',
            description: 'This shows your total wallet balance across all tokens.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="send"]',
          popover: {
            title: 'Send',
            description: 'Send any token to a @username or wallet address. Auto-convert if needed.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="request"]',
          popover: {
            title: 'Request',
            description: 'Create a payment link with a QR code. Share it to get paid.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="swap"]',
          popover: {
            title: 'Swap',
            description: 'Convert any token to another. Best rate via Jupiter, automatically.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="split"]',
          popover: {
            title: 'Split bills',
            description: 'Split a bill across multiple people. Each person gets their own payment link.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="gift"]',
          popover: {
            title: 'Gift envelopes',
            description: 'Create a gift with multiple claim slots. Share the link and let people grab their share.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="payroll"]',
          popover: {
            title: 'Payroll',
            description: 'Send payments to multiple people at once. Great for team payouts.',
            side: 'bottom',
          },
        },
        {
          element: '[data-tour="holdings"]',
          popover: {
            title: 'Holdings',
            description: 'All your tokens in one place. Earning positions show up here too.',
            side: 'top',
            align: 'start',
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

  return { startTour, shouldShow }
}
