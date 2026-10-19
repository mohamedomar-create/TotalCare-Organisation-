import { createClient } from '@supabase/supabase-js'

// The project URL and publishable key are public by design (every browser receives them);
// access is controlled by row-level security. Env vars override these, e.g. for a test project.
const DEFAULT_URL = 'https://ijsxhfvtcvvvjqxwvjlo.supabase.co'
const DEFAULT_KEY = 'sb_publishable_dlqY8SDHkqALU-BloDeaLw_0Bq_7xhG'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY

export const isConfigured = Boolean(url && key)

export const supabase = createClient(url, key)

export const ALLOWED_DOMAIN = (import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined) || 'totalcareegypt.com'
