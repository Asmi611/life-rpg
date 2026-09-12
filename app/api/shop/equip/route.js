import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";

// ============================================================
// POST /api/shop/equip
// ============================================================
// Body: { itemId } — toggles the equipped flag for a cosmetic the
// user owns. Only 'cosmetic' type items can be equipped; decorations
// have no equipped concept in this MVP.
//
// Multiple cosmetics can be equipped simultaneously — this endpoint
// toggles only the single requested row, never touching any other
// inventory rows.
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

  // 1) Fetch the Inventory row for this user + itemId.
  const { data: inventory, error: invError } = await admin
    .from("Inventory")
    .select("id, itemId, equipped")
    .eq("userId", user.id)
    .eq("itemId", itemId)
    .single();

  if (invError || !inventory) {
    return NextResponse.json({ error: "Item not owned" }, { status: 404 });
  }

  // 2) Fetch the ShopItem to check its type.
  const { data: item, error: itemError } = await admin
    .from("ShopItem")
    .select("id, type")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.type !== "cosmetic") {
    return NextResponse.json(
      { error: "Only cosmetics can be equipped" },
      { status: 400 }
    );
  }

  // 3) Toggle equipped.
  const newEquipped = !inventory.equipped;

  const { error: updateError } = await admin
    .from("Inventory")
    .update({ equipped: newEquipped })
    .eq("userId", user.id)
    .eq("itemId", itemId);

  if (updateError) {
    console.error("Inventory equip toggle failed:", updateError);
    return NextResponse.json({ error: "Failed to update equipped status" }, { status: 500 });
  }

  return NextResponse.json({ itemId, equipped: newEquipped });
}
