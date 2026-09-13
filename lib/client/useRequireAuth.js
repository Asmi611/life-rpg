"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/client/supabaseClient";

// Phase 11 — client-side route guard. Call this at the top of any screen under
// app/(game)/ that requires a logged-in user (Village, Quest, Shop). Redirects
// to /select-character if there's no active session, and again if the session
// ends mid-use (sign-out, token revoked elsewhere).
export function useRequireAuth() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && !session) {
        router.replace("/select-character?sessionExpired=1");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/select-character?sessionExpired=1");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);
}
