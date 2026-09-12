/**
 * ⚠️  WARNING: This file uses the Supabase service-role key, which bypasses
 * Row Level Security entirely. It must NEVER be imported into any component
 * or module marked "use client". Import it only in server-only code such as
 * app/api/ route handlers, lib/server/ helpers, or server actions.
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
