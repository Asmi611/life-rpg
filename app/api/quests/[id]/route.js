import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";

// ============================================================
// PATCH  /api/quests/:id  — partial update a quest
// DELETE /api/quests/:id  — delete a custom quest (NPC forbidden)
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

const VALID_CATEGORIES = ["Intelligence", "Strength", "Discipline"];
const VALID_STATUSES = [
  "available",
  "accepted",
  "in_progress",
  "paused",
  "completed",
];

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

export async function PATCH(request, { params }) {
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  const { id: questId } = await params;

  const admin = createAdminClient();

  // Look up the quest — ADMIN client can read any row, so we verify userId ourselves.
  // Select userId for the ownership check, plus the public fields for the
  // response. userId is never included in toQuestResponse so it stays internal.
  const { data: quest, error: fetchError } = await admin
    .from("Quest")
    .select(QUEST_FIELDS.join(", ") + ", userId")
    .eq("id", questId)
    .single();

  if (fetchError || !quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.userId !== user.id) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // Parse body (may be partial).
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates = {};
  let updateNeeded = false;

  // --- title (partial, re-validated) ---
  if ("title" in body) {
    const title = body.title;
    if (title == null || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const trimmed = title.trim();
    if (trimmed.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or fewer" },
        { status: 400 }
      );
    }
    updates.title = trimmed;
    updateNeeded = true;
  }

  // --- description (partial, optional) ---
  if ("description" in body) {
    const description = body.description;
    if (description == null) {
      updates.description = null;
      updateNeeded = true;
    } else if (typeof description === "string") {
      const trimmed = description.trim();
      if (trimmed.length > 2000) {
        return NextResponse.json(
          { error: "Description must be 2000 characters or fewer" },
          { status: 400 }
        );
      }
      updates.description = trimmed.length > 0 ? trimmed : null;
      updateNeeded = true;
    }
  }

  // --- category (partial, validated) ---
  if ("category" in body) {
    const category = body.category;
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    updates.category = category;
    updateNeeded = true;
  }

  // --- status (partial, restricted) ---
  if ("status" in body) {
    const status = body.status;
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Block direct completion via PATCH — only /complete can do that.
    if (status === "completed") {
      return NextResponse.json(
        { error: "Use the complete endpoint to mark a quest completed" },
        { status: 400 }
      );
    }

    // Only allow the available → accepted transition for the 'accepted' status.
    // All other non-completed transitions (accepted→in_progress, in_progress→paused,
    // paused→in_progress, etc.) are allowed here.
    if (status === "accepted" && quest.status !== "available") {
      return NextResponse.json(
        { error: "Only available quests can be accepted" },
        { status: 400 }
      );
    }

    updates.status = status;
    updateNeeded = true;
  }

  if (!updateNeeded) {
    // Nothing to update — return the current state unchanged.
    return NextResponse.json(toQuestResponse(quest));
  }

  const { data: updated, error: updateError } = await admin
    .from("Quest")
    .update(updates)
    .eq("id", questId)
    .select(QUEST_FIELDS.join(", "))
    .single();

  if (updateError) {
    console.error("Quest update failed:", updateError);
    return NextResponse.json({ error: "Failed to update quest" }, { status: 500 });
  }

  return NextResponse.json(toQuestResponse(updated));
}

export async function DELETE(request, { params }) {
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  const { id: questId } = await params;

  const admin = createAdminClient();

  // Select userId for the ownership check, plus the public fields for the
  // response. userId is never included in toQuestResponse so it stays internal.
  const { data: quest, error: fetchError } = await admin
    .from("Quest")
    .select(QUEST_FIELDS.join(", ") + ", userId")
    .eq("id", questId)
    .single();

  if (fetchError || !quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.userId !== user.id) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // NPC quests cannot be deleted.
  if (quest.source === "npc") {
    return NextResponse.json(
      { error: "NPC quests cannot be deleted" },
      { status: 403 }
    );
  }

  const { error: deleteError } = await admin.from("Quest").delete().eq("id", questId);

  if (deleteError) {
    console.error("Quest delete failed:", deleteError);
    return NextResponse.json({ error: "Failed to delete quest" }, { status: 500 });
  }

  // 200 with a small success body (rather than 204 no-content) so the response
  // shape is consistent and testable in tools like Postman / Thunder Client.
  return NextResponse.json({ success: true });
}
