import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Singleton for server-side usage
let _supabase: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = getSupabaseAdmin();
  }
  return _supabase;
}
