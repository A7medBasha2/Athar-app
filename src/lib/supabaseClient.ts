import { createClient } from '@supabase/supabase-js';

// Supabase Configuration for Athar (أثر)
export const SUPABASE_URL =
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://omixodcgbijfrxgyviz.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_HRxPGjODBnTOWl0-QgoyAw_9wxeLC-D';

/**
 * Global Supabase Client instance for Athar (أثر)
 * Handles:
 * 1. Supabase Auth (Sign Up, Sign In, Session)
 * 2. Gamaa Community (Posts, Comments, Likes, Campaigns)
 * 3. User Profiles & Admin Role verification
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
