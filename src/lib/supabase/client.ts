import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key || !isSupabaseConfigured()) {
    return null;
  }
  return createBrowserClient(url, key);
}
