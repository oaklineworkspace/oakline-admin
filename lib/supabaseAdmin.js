import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables for admin client');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  console.error('Available env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  
  // Only throw in server-side context
  if (typeof window === 'undefined') {
    throw new Error('Missing required Supabase environment variables');
  } else {
    console.warn('⚠️ Supabase admin client not available on client-side');
  }
}

if (supabaseUrl && supabaseServiceKey) {
  console.log('✅ Supabase Admin client initialized');
}

export const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;