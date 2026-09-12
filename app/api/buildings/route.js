import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";

// ============================================================
// GET /api/buildings
// ============================================================
// Returns all of the authenticated user's Building rows, with
// nextUpgradeCost computed server-side as 150 * level.
// ============================================================

export async function GET(request) {
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { data: buildings, error } = await admin
    .from("Building")
    .select("type, level")
    .eq("userId", user.id);

  if (error) {
    console.error("Building fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch buildings" }, { status: 500 });
  }

  const buildingsResponse = (buildings || []).map((b) => ({
    type: b.type,
    level: b.level,
    nextUpgradeCost: 150 * b.level,
  }));

  return NextResponse.json({ buildings: buildingsResponse });
}
