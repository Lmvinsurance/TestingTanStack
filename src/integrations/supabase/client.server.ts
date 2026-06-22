// Server-side Supabase client with service role key - bypasses RLS.
// Use this for admin operations in server functions and server routes only.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// We create a true admin client bypassing RLS using the service role key.
// This allows server functions to perform sensitive updates (like payment status)
// that users shouldn't be able to do directly.
export const supabaseAdmin = createClient<Database>(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || ""
);
