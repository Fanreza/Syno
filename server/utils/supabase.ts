import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

export function adminDb(): SupabaseClient {
  if (cached) return cached
  const config = useRuntimeConfig()
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase credentials missing' })
  }
  cached = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return cached
}
