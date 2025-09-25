
import { createClient } from '@supabase/supabase-js'

// This key should only be used on the server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_KEY is required for server-side operations.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
