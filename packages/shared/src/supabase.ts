import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing environment variable: ${name}`);
  return val;
}

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || requireEnv('SUPABASE_URL');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key);
}
