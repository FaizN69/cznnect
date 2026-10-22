import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, configured } from './config'

// Placeholders keep the app from crashing before the real values are pasted in.
export const supabase = createClient(
  configured ? SUPABASE_URL : 'https://not-configured.supabase.co',
  configured ? SUPABASE_ANON_KEY : 'not-configured',
)
