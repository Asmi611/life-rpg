import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — MUST use @supabase/ssr's createBrowserClient
// (not plain @supabase/supabase-js) so the session is synced into cookies.
// The server routes (lib/server/supabaseServer.js) read the session from
// those same cookies via createServerClient — a plain client's
// localStorage-only session would be invisible to them, causing
// "Auth session missing!" on every server call right after signup.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
