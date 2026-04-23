import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Privy embedded wallet uses a hidden iframe that requires browser globals
  // and a stable client-side runtime. SSR is incompatible with this pattern.
  ssr: false,

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],
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
      inline: ['@solana/spl-token', '@solana/web3.js', 'jayson'],
      external: ['@umbra-privacy/sdk', '@umbra-privacy/web-zk-prover']
    }
  },

  runtimeConfig: {
    privyAppId: process.env.PRIVY_APP_ID || '',
    privyAppSecret: process.env.PRIVY_APP_SECRET || '',
    privyAuthorizationKeyId: process.env.PRIVY_AUTHORIZATION_KEY_ID || '',
    privyAuthorizationPublicKey: process.env.PRIVY_AUTHORIZATION_PUBLIC_KEY || '',
    privyAuthorizationKey: process.env.PRIVY_AUTHORIZATION_KEY || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    solanaCaip2: process.env.SOLANA_CAIP2 || 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    jupiterApiKey: process.env.JUPITER_API_KEY || '',
    public: {
      privyAppId: process.env.NUXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID || '',
      privyClientId: process.env.NUXT_PUBLIC_PRIVY_CLIENT_ID || '',
      solanaCluster: process.env.NUXT_PUBLIC_SOLANA_CLUSTER || 'mainnet-beta',
      solanaRpcUrl: process.env.NUXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Payra',
      short_name: 'Payra',
      description: 'Send crypto on Solana like sending a DM.',
      theme_color: '#182440',
      background_color: '#0f0f14',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/app',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,ico,png,jpeg,jpg,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gstatic-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  app: {
    head: {
      title: 'Payra',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#182440' },
        { name: 'description', content: 'Payra — send crypto on Solana like sending a DM.' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/jpeg', href: '/icon.jpeg' },
        { rel: 'apple-touch-icon', href: '/icon-192.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&display=swap' }
      ]
    }
  }
})
