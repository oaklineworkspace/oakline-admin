// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Use your environment variables
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validate required environment variables with fallback for development
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Missing Supabase configuration - using development fallback');
    // Development fallback - replace with your actual values
    supabaseUrl = supabaseUrl || 'https://your-project.supabase.co';
    supabaseAnonKey = supabaseAnonKey || 'your-anon-key';
  } else {
    throw new Error('Missing required Supabase configuration. Please check your environment variables.');
  }
}

// Public client for front-end (browser) - Singleton pattern
let supabaseInstance = null;

export const supabase = (() => {
  if (typeof window !== 'undefined' && !supabaseInstance && supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storage: window.localStorage,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        storageKey: 'oakline-auth-session',
        flowType: 'pkce',
        sessionTimeoutMinutes: 15,
        refreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  return supabaseInstance;
})();

// Server-side client with elevated privileges
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;