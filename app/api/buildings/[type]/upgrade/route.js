import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";
import { checkRateLimit } from "@/lib/server/rateLimit";

// ============================================================
// POST /api/buildings/:type/upgrade
// ============================================================
// Upgrades the authenticated user's building of the given type,
// deducting coins from their Character row.
//
// In this MVP only "Academy" can be upgraded — all other types are
// rejected with 400 before any DB access.
//
// Atomicity note (same limitation as purchase/route.js):
//   The balance check and the two UPDATEs are sequential, not wrapped
//   in a single Postgres transaction. A concurrent request could
//   theoretically both pass the balance check before either deducts.
//   A Postgres RPC function would close this; acceptable for the
//   hackathon timeline.
// ============================================================

const MAX_BUILDING_LEVEL = 2;
const UPGRADE_BASE_COST = 150;

export async function POST(request, { params }) {
  // 1) Auth.
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  // Next.js 16.3.5: params is an async Promise — must await before destructuring.
  const { type } = await params;

  // 2) Scope restriction: only Academy can be upgraded in this MVP.
  if (type !== "Academy") {
    return NextResponse.json(
      { error: "This building cannot be upgraded yet" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Rate-limit check — 10 requests per 10-second window per user per route.
  // Fails open: if the rate-limit check itself breaks, the request is allowed
  // through so a broken limiter never blocks a legitimate user.
  const rateLimitResult = await checkRateLimit(admin, user.id, "building-upgrade");
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  // 3) Fetch the Building row for this user + type = Academy.
  const { data: building, error: buildingError } = await admin
    .from("Building")
    .select("id, type, level")
    .eq("userId", user.id)
    .eq("type", "Academy")
    .single();

  // Distinguish "no row found" (PGRST116) from a real DB error.
  // A genuine backend failure must return 500, not 404 — it should not look
  // identical to "this building doesn't exist yet."
  if (buildingError && buildingError.code !== "PGRST116") {
    console.error("Building fetch failed:", buildingError);
    return NextResponse.json({ error: "Failed to fetch building" }, { status: 500 });
  }

  if (!building) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  // 4) Max level cap.
  if (building.level >= MAX_BUILDING_LEVEL) {
    return NextResponse.json(
      { error: "Building already at max level" },
      { status: 400 }
    );
  }

  // 5) Compute upgrade cost server-side (never trust a client-supplied cost).
  const cost = UPGRADE_BASE_COST * building.level;

  // 6) Fetch the user's Character for the current coins balance.
  const { data: character, error: charError } = await admin
    .from("Character")
    .select("coins")
    .eq("userId", user.id)
    .single();

  if (charError) {
    console.error("Character fetch failed:", charError);
    return NextResponse.json({ error: "Character not found" }, { status: 500 });
  }

  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 500 });
  }

  // 7) Balance check.
  if (character.coins < cost) {
    return NextResponse.json({ error: "Not enough coins" }, { status: 400 });
  }

  // 8) Two writes: deduct coins from Character, increment Building level.
  const newCoins = character.coins - cost;
  const newLevel = building.level + 1;

  const { error: charUpdateError } = await admin
    .from("Character")
    .update({ coins: newCoins })
    .eq("userId", user.id);

  if (charUpdateError) {
    console.error("Character coins deduction failed:", charUpdateError);
    return NextResponse.json({ error: "Failed to process upgrade" }, { status: 500 });
  }

  const { error: buildingUpdateError } = await admin
    .from("Building")
    .update({
      level: newLevel,
      upgradedAt: new Date().toISOString(),
    })
    .eq("userId", user.id)
    .eq("type", "Academy");

  if (buildingUpdateError) {
    console.error("Building level update failed:", buildingUpdateError);
    return NextResponse.json({ error: "Failed to process upgrade" }, { status: 500 });
  }

  // 9) Transaction audit row (non-fatal — the upgrade already succeeded).
  const { error: txError } = await admin.from("Transaction").insert({
    userId: user.id,
    type: "spend",
    currency: "coin",
    amount: cost,
    reason: `Upgraded Academy to level ${newLevel}`,
  });

  if (txError) {
    console.error("Transaction insert failed:", txError);
  }

  // 10) Return updated state.
  return NextResponse.json({
    type: "Academy",
    level: newLevel,
    coins: newCoins,
    nextUpgradeCost: UPGRADE_BASE_COST * newLevel,
  });
}
