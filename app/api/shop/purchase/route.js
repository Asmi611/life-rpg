import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";
import { checkRateLimit } from "@/lib/server/rateLimit";

// ============================================================
// POST /api/shop/purchase
// ============================================================
// Body: { itemId } — buys a shop item for the authenticated user,
// deducting coins and/or gems from their Character row and inserting
// an Inventory row + Transaction audit rows.
//
// Atomicity note (same limitation as the quest-completion route):
//   The balance check (reading Character.coins / .gems) and the subsequent
//   deduction UPDATE + inserts are not wrapped in a single Postgres
//   transaction via the JS client. In a concurrent scenario two requests
//   could both read the same balance, both pass the check, and both deduct
//   — overspending the account. A Postgres RPC function (admin.rpc) would
//   close this fully with SELECT ... FOR UPDATE inside a transaction, but
//   for the hackathon timeline we implement the straightforward sequential
//   version here.
// ============================================================

export async function POST(request) {
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  // Parse body.
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { itemId } = body || {};

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Rate-limit check — 10 requests per 10-second window per user per route.
  // Fails open: if the rate-limit check itself breaks, the request is allowed
  // through so a broken limiter never blocks a legitimate user.
  const rateLimitResult = await checkRateLimit(admin, user.id, "shop-purchase");
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  // 1) Fetch the ShopItem.
  const { data: item, error: itemError } = await admin
    .from("ShopItem")
    .select("id, name, type, costCoins, costGems")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // 2) Fetch the user's Character (for balance).
  const { data: character, error: charError } = await admin
    .from("Character")
    .select("coins, gems")
    .eq("userId", user.id)
    .single();

  if (charError || !character) {
    console.error("Character fetch failed:", charError);
    return NextResponse.json({ error: "Character not found" }, { status: 500 });
  }

  // 3) Check if already owned.
  //
  // .single() returns data: null both when there is no matching row (the normal
  // case — the user doesn't own the item yet) AND when a real DB/Supabase error
  // occurs. We distinguish the two by checking the error code: PGRST116 is
  // PostgREST's "no rows returned" code, which is the only acceptable outcome
  // here. Any other error code is a real failure.
  const { data: existingInventory, error: existingInvError } = await admin
    .from("Inventory")
    .select("id")
    .eq("userId", user.id)
    .eq("itemId", itemId)
    .single();

  if (existingInvError && existingInvError.code !== "PGRST116") {
    console.error("Existing-inventory check failed:", existingInvError);
    return NextResponse.json({ error: "Failed to process purchase" }, { status: 500 });
  }

  if (existingInventory) {
    return NextResponse.json({ error: "Item already owned" }, { status: 409 });
  }

  // 4) Validate server-side balance.
  const { costCoins, costGems } = item;

  if (character.coins < costCoins) {
    return NextResponse.json({ error: "Not enough coins" }, { status: 400 });
  }

  if (costGems > 0 && character.gems < costGems) {
    return NextResponse.json({ error: "Not enough gems" }, { status: 400 });
  }

  // 5) Deduct from Character (single UPDATE).
  const { error: deductError } = await admin
    .from("Character")
    .update({
      coins: character.coins - costCoins,
      gems: character.gems - costGems,
    })
    .eq("userId", user.id);

  if (deductError) {
    console.error("Character deduction failed:", deductError);
    return NextResponse.json({ error: "Failed to process purchase" }, { status: 500 });
  }

  // 6) Insert Inventory row.
  const { error: invError } = await admin.from("Inventory").insert({
    userId: user.id,
    itemId: item.id,
    type: item.type,
    equipped: false,
    purchasedAt: new Date().toISOString(),
  });

  if (invError) {
    console.error("Inventory insert failed:", invError);
    return NextResponse.json({ error: "Failed to process purchase" }, { status: 500 });
  }

  // 7) Transaction audit rows (spend).
  const { error: coinTxError } = await admin.from("Transaction").insert({
    userId: user.id,
    type: "spend",
    currency: "coin",
    amount: costCoins,
    reason: `Purchased: ${item.name}`,
  });

  if (coinTxError) {
    console.error("Transaction (coins) insert failed:", coinTxError);
  }

  if (costGems > 0) {
    const { error: gemTxError } = await admin.from("Transaction").insert({
      userId: user.id,
      type: "spend",
      currency: "gem",
      amount: costGems,
      reason: `Purchased: ${item.name}`,
    });

    if (gemTxError) {
      console.error("Transaction (gems) insert failed:", gemTxError);
    }
  }

  // 8) Return updated balances + owned item.
  const newCoins = character.coins - costCoins;
  const newGems = character.gems - costGems;

  return NextResponse.json({
    coins: newCoins,
    gems: newGems,
    item: { id: item.id, owned: true },
  });
}
