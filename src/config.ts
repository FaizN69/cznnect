// Paste your two Supabase values between the quotes (Supabase > Project Settings > API).
// The anon key is meant to be public. Your data is protected by the privacy rules
// in supabase/01_accounts.sql, not by hiding this key.
export const SUPABASE_URL = 'PASTE_YOUR_PROJECT_URL'
export const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY'

export const configured =
  !SUPABASE_URL.startsWith('PASTE') && !SUPABASE_ANON_KEY.startsWith('PASTE')
