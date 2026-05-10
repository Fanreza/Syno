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
      include: ['@privy-io/js-sdk-core', 'buffer'],
      exclude: ['viem', '@privy-io/ethereum'],
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
      external: ['viem', '@privy-io/ethereum']
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
    goldrushApiKey: process.env.GOLDRUSH_API_KEY || '',
    firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
    cronSecret: process.env.CRON_SECRET || '',
    public: {
      privyAppId: process.env.NUXT_PUBLIC_PRIVY_APP_ID || process.env.PRIVY_APP_ID || '',
      privyClientId: process.env.NUXT_PUBLIC_PRIVY_CLIENT_ID || '',
      solanaCluster: process.env.NUXT_PUBLIC_SOLANA_CLUSTER || 'mainnet-beta',
      solanaRpcUrl: process.env.NUXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      firebaseVapidKey: process.env.NUXT_PUBLIC_FIREBASE_VAPID_KEY || '',
    }
  },

  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Syno',
      short_name: 'Syno',
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
      // Merge Firebase messaging into the vite-pwa SW so only one SW runs at scope /
      importScripts: ['/firebase-messaging-sw-core.js'],
      // Don't cache HTML — always fetch from network so stale pages never cause issues
      globPatterns: ['**/*.{js,css,ico,png,jpeg,jpg,svg,woff2}'],
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
      enabled: false,
    },
  },

  app: {
    head: {
      title: 'Syno — Crypto Payments on Solana',
      titleTemplate: '%s',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#182440' },
        { name: 'description', content: 'Send crypto on Solana like sending a DM. Payment links, split bills, gift envelopes, payroll, and private transfers — all in one app.' },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Syno' },
        { property: 'og:title', content: 'Syno — Crypto Payments on Solana' },
        { property: 'og:description', content: 'Send crypto on Solana like sending a DM. Payment links, split bills, gift envelopes, payroll, and private transfers — all in one app.' },
        { property: 'og:url', content: 'https://syno.aethereal.top/' },
        { property: 'og:image', content: 'https://syno.aethereal.top/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Syno — Crypto Payments on Solana' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Syno — Crypto Payments on Solana' },
        { name: 'twitter:description', content: 'Send crypto on Solana like sending a DM. Payment links, split bills, gift envelopes, payroll, and private transfers — all in one app.' },
        { name: 'twitter:image', content: 'https://syno.aethereal.top/og-image.png' },
      ],
      link: [
        { rel: 'canonical', href: 'https://syno.aethereal.top/' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/jpeg', href: '/syno-logo.jpeg' },
        { rel: 'apple-touch-icon', href: '/icon-192.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&display=swap' }
      ]
    }
  }
})
