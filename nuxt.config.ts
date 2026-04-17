import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Privy embedded wallet uses a hidden iframe that requires browser globals
  // and a stable client-side runtime. SSR is incompatible with this pattern.
  ssr: false,

  modules: [],
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },

  vite: {
    plugins: [tailwindcss()],
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      include: ['@privy-io/js-sdk-core', 'buffer']
    },
    resolve: {
      alias: {
        buffer: 'buffer/'
      }
    }
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'Content-Security-Policy': "frame-ancestors *"
        }
      }
    }
  },

  runtimeConfig: {
    privyAppId: process.env.PRIVY_APP_ID || '',
    privyAppSecret: process.env.PRIVY_APP_SECRET || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    goldrushApiKey: process.env.GOLDRUSH_API_KEY || '',
    public: {
      privyAppId: process.env.NUXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID || '',
      privyClientId: process.env.NUXT_PUBLIC_PRIVY_CLIENT_ID || '',
      solanaCluster: process.env.NUXT_PUBLIC_SOLANA_CLUSTER || 'devnet',
      solanaRpcUrl: process.env.NUXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  },

  app: {
    head: {
      title: 'Payra',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        { name: 'theme-color', content: '#182440' },
        { name: 'description', content: 'Payra — send crypto on Solana like sending a DM.' }
      ],
      link: [
        { rel: 'icon', type: 'image/jpeg', href: '/icon.jpeg' },
        { rel: 'apple-touch-icon', href: '/icon.jpeg' }
      ]
    }
  }
})
