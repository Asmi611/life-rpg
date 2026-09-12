/**
 * Supabase client scoped to the logged-in user's session.
 *
 * Reads the session from cookies via @supabase/ssr's createServerClient,
 * so all queries automatically run under that user's Row Level Security
 * policies. Use this inside app/api/ route handlers.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component where cookies cannot
            // be modified. This can be ignored when the middleware refreshes
            // the session — the cookie is httpOnly and managed by Supabase.
          }
        },
      },
    }
  );
}
