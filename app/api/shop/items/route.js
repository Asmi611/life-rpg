import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";

// ============================================================
// GET /api/shop/items
// ============================================================
// Returns the full shop catalog annotated with ownership + equipped
// status for the authenticated user.
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

  // 1) Fetch all shop items.
  const { data: items, error: itemError } = await admin
    .from("ShopItem")
    .select("id, name, type, costCoins, costGems")
    .order("id", { ascending: true });

  if (itemError) {
    console.error("ShopItem fetch failed:", itemError);
    return NextResponse.json({ error: "Failed to fetch shop items" }, { status: 500 });
  }

  // 2) Fetch all inventory rows for this user.
  const { data: inventory, error: invError } = await admin
    .from("Inventory")
    .select("itemId, equipped")
    .eq("userId", user.id);

  if (invError) {
    console.error("Inventory fetch failed:", invError);
    // Non-fatal — the shop is still readable; just report everything as unowned.
    console.warn("Proceeding with empty inventory state despite fetch error.");
  }

  // Build a Set of owned itemIds and a map of itemId → equipped for quick lookup.
  const ownedItemIds = new Set();
  const equippedMap = new Map();

  if (inventory) {
    for (const row of inventory) {
      ownedItemIds.add(row.itemId);
      equippedMap.set(row.itemId, row.equipped);
    }
  }

  // 3) Annotate each shop item.
  const itemsResponse = (items || []).map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    costCoins: item.costCoins,
    costGems: item.costGems,
    owned: ownedItemIds.has(item.id),
    equipped: ownedItemIds.has(item.id) && equippedMap.get(item.id) === true,
  }));

  return NextResponse.json({ items: itemsResponse });
}
