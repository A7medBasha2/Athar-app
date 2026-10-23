import { createClient } from '@supabase/supabase-js';

// Supabase Configuration for Athar (أثر)
// Project URL is explicitly set to the user's project instance
export const SUPABASE_URL = 'https://omixodcgbijfrxgyviz.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_HRxPGjODBnTOWl0-QgoyAw_9wxeLC-D';

/**
 * Global Supabase Client instance for Athar (أثر)
 * Configured specifically for web and hybrid Android WebView (Capacitor)
 * with robust session persistence and auto token refresh.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export default supabase;
