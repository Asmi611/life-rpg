/**
 * Rate-limiting helper for Life RPG.
 *
 * Exposes checkRateLimit(admin, userId, route) — a sliding-window rate
 * limiter backed by a "RateLimit" DB table. Allows up to 10 requests per
 * 10-second window per (userId, route) pair. Fails open: if the rate-limit
 * check itself breaks, the request is allowed through (logged, not blocked).
 *
 * Callers create their own admin client via createAdminClient() and pass it in.
 */

/**
 * Check whether `userId` is allowed to make another request to `route`.
 *
 * RACE CONDITION NOTE (same class of limitation as the atomicity notes in
 * purchase/route.js and buildings/[type]/upgrade/route.js):
 *   The count-then-insert pattern here is not atomic. Under a genuine burst of
 *   near-simultaneous requests, multiple requests can each read the count BEFORE
 *   any of the others' inserts commit, so each one independently sees "under the
 *   limit" and proceeds — meaning slightly more than 10 requests may occasionally
 *   pass through in a 10-second window under heavy concurrency. This was observed
 *   directly during testing (11 requests in a Start-Job burst all passed rate
 *   limiting when only 10 should have). This is an accepted limitation for the
 *   hackathon timeline — rate limiting here is a defense-in-depth layer, not the
 *   primary anti-cheat mechanism (the actual reward computation in
 *   quest-complete/purchase/upgrade remains fully atomic and race-safe via the
 *   .in()-status-guard pattern, independently verified). A Postgres RPC function
 *   wrapping the count-check-and-insert in one transaction would close this fully
 *   if it becomes a priority later.
 *
 * @param {object} admin   - an existing service-role Supabase client
 * @param {string} userId  - the authenticated user's id
 * @param {string} route   - short label identifying the endpoint, e.g. "quest-complete"
 * @returns {Promise<{ allowed: boolean }>}
 */
export async function checkRateLimit(admin, userId, route) {
  // 10-second sliding window.
  const cutoff = new Date(Date.now() - 10_000).toISOString();

  // Efficient count-only query: select nothing, just count matching rows.
  const { count, error: countError } = await admin
    .from("RateLimit")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("route", route)
    .gte("createdAt", cutoff);

  // Fail open: if the rate-limit query itself errors, log it and allow the
  // request through. A broken rate limiter must never block a legitimate user.
  if (countError) {
    console.error(`RateLimit count query failed for ${route}:`, countError);
    return { allowed: true };
  }

  const requestsInWindow = count || 0;

  if (requestsInWindow >= 10) {
    // Rate limit exceeded — do NOT insert a row for this blocked request.
    return { allowed: false };
  }

  // Under the limit — record this request.
  const { error: insertError } = await admin.from("RateLimit").insert({
    userId,
    route,
  });

  if (insertError) {
    // The count passed but the insert failed — fail open so we don't block
    // the user for a transient DB issue on the insert side.
    console.error(`RateLimit insert failed for ${route}:`, insertError);
    return { allowed: true };
  }

  return { allowed: true };
}
