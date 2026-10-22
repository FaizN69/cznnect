// Paste your two Supabase values between the quotes (Supabase > Project Settings > API).
// The anon key is meant to be public. Your data is protected by the privacy rules
// in supabase/01_accounts.sql, not by hiding this key.
export const SUPABASE_URL = 'https://quatnrlyzitmgsvqyzbi.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1YXRucmx5eml0bWdzdnF5emJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NjYwOTMsImV4cCI6MjEwODI0MjA5M30.51NnuAIHuPFYjHaVoiLvq1l_XraerKQ-UVjtj7eXi3w'

export const configured =
  !SUPABASE_URL.startsWith('https://quatnrlyzitmgsvqyzbi.supabase.co') && !SUPABASE_ANON_KEY.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1YXRucmx5eml0bWdzdnF5emJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NjYwOTMsImV4cCI6MjEwODI0MjA5M30.51NnuAIHuPFYjHaVoiLvq1l_XraerKQ-UVjtj7eXi3w')
