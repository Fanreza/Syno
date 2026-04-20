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
    },
    externals: {
      inline: ['@solana/spl-token', '@solana/web3.js']
    }
  },

  runtimeConfig: {
    privyAppId: process.env.PRIVY_APP_ID || '',
    privyAppSecret: process.env.PRIVY_APP_SECRET || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    solanaCaip2: process.env.SOLANA_CAIP2 || 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    goldrushApiKey: process.env.GOLDRUSH_API_KEY || '',
    public: {
      privyAppId: process.env.NUXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID || '',
      privyClientId: process.env.NUXT_PUBLIC_PRIVY_CLIENT_ID || '',
      solanaCluster: process.env.NUXT_PUBLIC_SOLANA_CLUSTER || 'mainnet-beta',
      solanaRpcUrl: process.env.NUXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
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
        { rel: 'apple-touch-icon', href: '/icon.jpeg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&display=swap' }
      ]
    }
  }
})
