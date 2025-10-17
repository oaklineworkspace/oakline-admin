// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Use your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nrjdmgltshosdqccaymr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yamRtZ2x0c2hvc2RxY2NheW1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMzYyMjAsImV4cCI6MjA3MTYxMjIyMH0.b9H553W2PCsSNvr8HyyINl4nTSrldHN_QMQ3TVwt6qk';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yamRtZ2x0c2hvc2RxY2NheW1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjAzNjIyMCwiZXhwIjoyMDcxNjEyMjIwfQ.cXKwVlQNqtAE13jrgmr2RBuIwtEbxqGsVF9SiRwqV_E';

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
}

// Public client for front-end (browser)
let supabaseInstance = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.localStorage : null,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Dynamic redirect URL detection
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    })
  }
  return supabaseInstance
})()

// Server-side client with elevated privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);