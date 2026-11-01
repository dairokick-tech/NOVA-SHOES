import { createClient } from '@supabase/supabase-js';

// CONTANOVA uses its own Supabase project. The publishable key is designed
// for browser use; access is protected by PostgreSQL RLS policies.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://jxyfijrvqkoxevtxezzn.supabase.co';
const publishableKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_GYXRKgUSJ5xnFoMNEpz0uw_JlphP66m';

export const isSupabaseConfigured = Boolean(url && publishableKey);
export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'X-Client-Info': 'contanova-web' } },
    })
  : null;
