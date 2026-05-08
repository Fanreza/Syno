type TourKey =
  | 'dashboard'
  | 'send-modal'
  | 'request-modal'
  | 'swap-modal'
  | 'split-modal'
  | 'gift-modal'
  | 'payroll-modal'
  | 'portfolio'
  | 'activity'
  | 'people'
  | 'transfers'

const STORAGE_PREFIX = 'syno_tour_'

function storageKey(key: TourKey) {
  return STORAGE_PREFIX + key
}

const TOURS: Record<TourKey, () => import('driver.js').DriveStep[]> = {
  dashboard: () => [
    {
      element: '[data-tour="balance"]',
      popover: {
        title: 'Your balance',
        description: 'Total wallet value across all your tokens, updated live.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="send"]',
      popover: {
        title: 'Send',
        description: 'Send any token to a @username or wallet address. Auto-converts if needed.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="request"]',
      popover: {
        title: 'Request',
        description: 'Create a payment link with a QR code. Share via WhatsApp or Telegram.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="swap"]',
      popover: {
        title: 'Swap',
        description: 'Swap any token at the best rate, powered by Jupiter.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="split"]',
      popover: {
        title: 'Split bills',
        description: 'Split an expense with friends — each person pays their share via their own link.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="gift"]',
      popover: {
        title: 'Gift envelopes',
        description: 'Create a crypto gift with multiple claim slots. First come, first served.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="payroll"]',
      popover: {
        title: 'Payroll',
        description: 'Bulk send to multiple @usernames or addresses in one go.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="holdings"]',
      popover: {
        title: 'Holdings',
        description: 'All your tokens in one place with live prices.',
        side: 'top',
        align: 'start',
      },
    },
  ],

  'send-modal': () => [
    {
      element: '[data-tour="send-to"]',
      popover: {
        title: 'Who to send to',
        description: 'Type a @username, paste a wallet address, or pick from your friends list.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="send-token"]',
      popover: {
        title: 'Pick a token',
        description: 'Choose any token. If the recipient only accepts SOL, Syno auto-swaps for you.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="send-amount"]',
      popover: {
        title: 'Amount',
        description: 'Enter how much to send. Toggle between token and USD.',
        side: 'top',
      },
    },
  ],

  'request-modal': () => [
    {
      element: '[data-tour="request-amount"]',
      popover: {
        title: 'Amount (optional)',
        description: 'Set a fixed amount or leave empty so the payer can choose.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="request-token"]',
      popover: {
        title: 'Token',
        description: 'The token you want to receive.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="request-share"]',
      popover: {
        title: 'Share your link',
        description: 'Copy the link or share directly to WhatsApp and Telegram.',
        side: 'top',
      },
    },
  ],

  'swap-modal': () => [
    {
      element: '[data-tour="swap-from"]',
      popover: {
        title: 'Swap from',
        description: 'The token you want to sell.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="swap-to"]',
      popover: {
        title: 'Swap to',
        description: 'The token you want to receive.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="swap-quote"]',
      popover: {
        title: 'Live quote',
        description: 'Best rate from Jupiter aggregator, updated as you type.',
        side: 'top',
      },
    },
  ],

  'split-modal': () => [
    {
      element: '[data-tour="split-title"]',
      popover: {
        title: 'Bill title',
        description: 'Give the split a name, like "Dinner" or "Airbnb".',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="split-amount"]',
      popover: {
        title: 'Total amount',
        description: 'The full bill. Syno divides it equally among participants.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="split-participants"]',
      popover: {
        title: 'Participants',
        description: 'Add friends or addresses. Each gets their own payment link.',
        side: 'top',
      },
    },
  ],

  'gift-modal': () => [
    {
      element: '[data-tour="gift-amount"]',
      popover: {
        title: 'Total amount',
        description: 'How much crypto to put in the envelope.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="gift-slots"]',
      popover: {
        title: 'Claim slots',
        description: 'How many people can claim. Amount is split equally.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="gift-share"]',
      popover: {
        title: 'Share the link',
        description: 'Whoever opens the link first claims their share.',
        side: 'top',
      },
    },
  ],

  'payroll-modal': () => [
    {
      element: '[data-tour="payroll-token"]',
      popover: {
        title: 'Token',
        description: 'The token to send to everyone.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="payroll-rows"]',
      popover: {
        title: 'Recipients',
        description: 'Add as many @usernames or addresses as you need. Each gets their own amount.',
        side: 'top',
      },
    },
  ],

  portfolio: () => [
    {
      element: '[data-tour="portfolio-networth"]',
      popover: {
        title: 'Net worth',
        description: 'Total value of all your tokens at current prices.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="portfolio-chart"]',
      popover: {
        title: 'Performance chart',
        description: 'Your portfolio value over the past 30 days.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="analytics-summary"]',
      popover: {
        title: 'Spending analytics',
        description: 'How much you sent and received over the last 6 months, in USD.',
        side: 'bottom',
      },
    },
  ],

  activity: () => [
    {
      element: '[data-tour="activity-onchain"]',
      popover: {
        title: 'On-chain history',
        description: 'Every transaction on the Solana blockchain for your wallet.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="activity-inapp"]',
      popover: {
        title: 'In-app history',
        description: 'Payments, splits, and gifts made through Syno.',
        side: 'bottom',
      },
    },
  ],

  people: () => [
    {
      element: '[data-tour="people-friends"]',
      popover: {
        title: 'Friends',
        description: 'Search and add friends by @username. They appear as quick picks in Send and Split.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="people-contacts"]',
      popover: {
        title: 'Contacts',
        description: 'Save any wallet address with a label — no username needed.',
        side: 'bottom',
      },
    },
  ],

  transfers: () => [
    {
      element: '[data-tour="transfers-recurring"]',
      popover: {
        title: 'Recurring payments',
        description: 'Schedule weekly or monthly sends that run automatically.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="transfers-payroll"]',
      popover: {
        title: 'Payroll',
        description: 'Send to your whole team in one click. Each recipient gets their own transaction.',
        side: 'bottom',
      },
    },
  ],
}

export function useOnboarding() {
  function isDone(key: TourKey) {
    if (import.meta.server) return true
    return !!localStorage.getItem(storageKey(key))
  }

  function markDone(key: TourKey) {
    if (import.meta.server) return
    localStorage.setItem(storageKey(key), '1')
  }

  async function startTour(key: TourKey) {
    const steps = TOURS[key]?.()
    if (!steps?.length) return

    const firstEl = steps[0]?.element as string | undefined
    if (firstEl && !document.querySelector(firstEl)) return

    const { driver } = await import('driver.js')
    await import('driver.js/dist/driver.css')

    const driverObj = driver({
      animate: true,
      showProgress: true,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Got it',
      overlayOpacity: 0.6,
      allowClose: true,
      disableActiveInteraction: true,
      steps,
      onDestroyStarted: () => {
        markDone(key)
        driverObj.destroy()
      },
    })

    markDone(key)
    driverObj.drive()
  }

  async function startTourIfNew(key: TourKey) {
    if (isDone(key)) return
    await startTour(key)
  }

  function resetTour(key?: TourKey) {
    if (import.meta.server) return
    if (key) {
      localStorage.removeItem(storageKey(key))
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(STORAGE_PREFIX))
        .forEach(k => localStorage.removeItem(k))
    }
  }

  return { startTour, startTourIfNew, isDone, resetTour }
}
