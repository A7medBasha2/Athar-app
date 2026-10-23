import { createClient } from '@supabase/supabase-js';

function getResolvedSupabaseUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem('athar_custom_supabase_url');
      if (custom) {
        // Clean up legacy typo or invalid URLs
        if (custom.includes('omixodcgbijfrxgyviz') || !custom.startsWith('http')) {
          localStorage.removeItem('athar_custom_supabase_url');
        } else {
          return custom.trim();
        }
      }
    }
  } catch {}
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    'https://omixodcgbijfjrxgyviz.supabase.co'
  );
}

function getResolvedSupabaseAnonKey(): string {
  try {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem('athar_custom_supabase_anon_key');
      if (custom && custom.length > 20) return custom.trim();
    }
  } catch {}
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    'sb_publishable_HRxPGjODBnTOWl0-QgoyAw_9wxeLC-D'
  );
}

// Explicit constant Supabase configuration for Athar (أثر)
// Hardcoded fallback guarantees no undefined values during Android APK release builds
export const SUPABASE_URL = getResolvedSupabaseUrl();

export const SUPABASE_ANON_KEY = getResolvedSupabaseAnonKey();

// Backward compatibility alias for tests and existing imports
export const SUPABASE_PUBLISHABLE_KEY = SUPABASE_ANON_KEY;

/**
 * Global Supabase Client instance for Athar (أثر)
 * Configured specifically for web and hybrid Android WebView (Capacitor)
 * with robust session persistence, auto token refresh, and headers to avoid CORS rejections.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'x-client-info': 'athar-android-app',
    },
  },
});

export default supabase;

