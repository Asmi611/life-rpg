import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";

// ============================================================
// GET    /api/quests      — list the authenticated user's quests
// POST   /api/quests      — create a custom quest
// ============================================================

const QUEST_FIELDS = [
  "id",
  "title",
  "description",
  "category",
  "source",
  "npcName",
  "hotspot",
  "status",
  "rewardXP",
  "rewardCoins",
  "rewardGems",
];

const LIST_STATUSES = ["available", "accepted", "in_progress"];

// Map for building the response shape from a raw DB row.
function toQuestResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    source: row.source,
    npcName: row.npcName,
    hotspot: row.hotspot,
    status: row.status,
    rewardXP: row.rewardXP,
    rewardCoins: row.rewardCoins,
    rewardGems: row.rewardGems,
  };
}

export async function GET(request) {
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("Quest")
    .select(QUEST_FIELDS.join(", "))
    .eq("userId", user.id)
    .in("status", LIST_STATUSES)
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("Quest list fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch quests" }, { status: 500 });
  }

  return NextResponse.json({ quests: (rows || []).map(toQuestResponse) });
}

export async function POST(request) {
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, category } = body || {};

  // --- Validation ---

  // title: must be present and non-empty after trimming.
  if (title == null || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const trimmedTitle = title.trim();

  // Cap title length. Reject gracefully rather than crashing on huge inputs.
  if (trimmedTitle.length > 200) {
    return NextResponse.json(
      { error: "Title must be 200 characters or fewer" },
      { status: 400 }
    );
  }

  // category: must be one of the three allowed values.
  const VALID_CATEGORIES = ["Intelligence", "Strength", "Discipline"];
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  // description: optional; cap length if provided.
  let trimmedDescription = null;
  if (description != null && typeof description === "string") {
    const trimmed = description.trim();
    if (trimmed.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or fewer" },
        { status: 400 }
      );
    }
    trimmedDescription = trimmed.length > 0 ? trimmed : null;
  }

  // --- Insert ---
  const admin = createAdminClient();

  const { data: created, error: insertError } = await admin
    .from("Quest")
    .insert({
      userId: user.id,
      title: trimmedTitle,
      description: trimmedDescription,
      category,
      source: "custom",
      status: "available",
      rewardXP: 20,
      rewardCoins: 8,
      rewardGems: 0,
    })
    .select(QUEST_FIELDS.join(", "))
    .single();

  if (insertError) {
    console.error("Quest insert failed:", insertError);
    return NextResponse.json({ error: "Failed to create quest" }, { status: 500 });
  }

  return NextResponse.json(toQuestResponse(created), { status: 201 });
}
