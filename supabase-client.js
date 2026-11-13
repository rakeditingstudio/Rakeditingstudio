import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

let sharedClient = null;

export function getSupabaseClient() {
  if (sharedClient) return sharedClient;
  if (window.rakSupabase) {
    sharedClient = window.rakSupabase;
    return sharedClient;
  }
  sharedClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.rakSupabase = sharedClient;
  return sharedClient;
}
