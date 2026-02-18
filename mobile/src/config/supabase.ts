import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project credentials
// You can find these in your Supabase project settings
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.warn(
    '⚠️ Supabase URL not configured. Please set EXPO_PUBLIC_SUPABASE_URL in your .env file or environment variables.',
  );
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn(
    '⚠️ Supabase Anon Key not configured. Please set EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file or environment variables.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
