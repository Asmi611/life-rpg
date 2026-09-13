// Phase 11 — wraps the native fetch for calls to our own /api/* routes.
// If a request comes back 401 (expired/invalid session), redirect to
// /select-character with a message instead of letting the screen show a
// confusing error or blank state. Use this in place of a raw fetch() for
// any authenticated API call from Village, Quest, or Shop.
export async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/select-character?sessionExpired=1";
    // Return a never-resolving promise so calling code doesn't also try to
    // parse/act on this response while the redirect is in flight.
    return new Promise(() => {});
  }
  return res;
}
