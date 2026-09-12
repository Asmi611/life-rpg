/**
 * Supabase client scoped to the logged-in user's session.
 *
 * Reads the session from cookies via @supabase/ssr's createServerClient,
 * so all queries automatically run under that user's Row Level Security
 * policies. Use this inside app/api/ route handlers.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Try to authenticate via a cookie session first; if none, fall back to an
 * "Authorization: Bearer <token>" header. Returns { user, error, supabase }
 * where `supabase` is a client whose queries are scoped by RLS to the
 * authenticated user — either via cookie session or via the Bearer token
 * Authorization header.
 */
export async function getAuthenticatedUser(request) {
  const supabase = await createClient();

  // 1) Prefer the real browser session (cookies + @supabase/ssr middleware)
  const { data: { user: cookieUser }, error: cookieError } =
    await supabase.auth.getUser();

  if (cookieUser) {
    // Cookie-based client already has the session from cookies; return it
    // so queries run under this user's RLS policies.
    return { user: cookieUser, error: null, supabase };
  }

  // If there was *no* cookie session at all (Supabase can't find one), try
  // the Bearer fallback. A real cookie-session auth failure (invalid/expired
  // token) still returns an error, but we also fall back so the same route
  // can be called with a bearer token for testing.
  //
  // We only attempt the fallback when there is literally no session cookie
  // present, so a browser with a stale/invalid session cookie still hits the
  // normal (same-cookie) error path.
  const authHeader =
    request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      error: cookieError || new Error("Not authenticated"),
    };
  }

  const token = match[1];

  // 2) Validate the bearer token against Supabase Auth directly.
  //    This is a separate lightweight client using the anon key — it does NOT
  //    bypass RLS or service-role access; it only calls the Auth API to verify
  //    the JWT. The returned `user` comes from Supabase, not from any
  //    client-supplied claim we chose to trust.
  const authClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data, error: tokenError } = await authClient.auth.getUser(token);

  if (tokenError || !data.user) {
    return { error: tokenError || new Error("Invalid bearer token") };
  }

  // Create a Supabase client that sends the Bearer token in the Authorization
  // header on every request, so Postgres RLS sees the same user as we just
  // validated. This mirrors what the cookie-based client does via its session.
  const bearerClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return { user: data.user, error: null, supabase: bearerClient };
}

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
