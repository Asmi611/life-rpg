import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";
import { getLevelForTotalXp } from "@/lib/server/xpCurve";
import { getVillageTier } from "@/lib/server/villageTier";
import { computeStreakUpdate } from "@/lib/server/streak";

// ============================================================
// POST /api/quests/:id/complete
// ============================================================
// No request body — the server trusts only the quest ID from the URL.
// All reward amounts come from the quest row in the DB. The ADMIN client
// (service-role, bypasses RLS) is used for every DB write after the route
// has verified the user via getAuthenticatedUser.
//
// Atomicity note:
//   The Supabase JS client does not expose a lightweight multi-statement
//   transaction API for Postgres (the Realtime/Broadcast channels are not
//   a substitute for ACID). We therefore run the mutation sequence
//   sequentially in a single function — quest status UPDATE (with a
//   status guard to be race-safe), character UPDATE, CompletionHistory
//   INSERT, and Transaction INSERTs. In the unlikely event of a failure
//   partway through (e.g. the character UPDATE succeeds but a later
//   Transaction INSERT fails), the quest would be marked completed without
//   the corresponding audit rows. For a hackathon build this is acceptable,
//   but the bulletproof approach would be to wrap the whole sequence in a
//   Postgres function call via rpc() so the DB itself guarantees atomicity.
//   If that becomes important later, replace the sequential calls with a
//   single `admin.rpc('complete_quest', { ... })` that does everything in
//   one transactional function.
// ============================================================

// Map quest category → character attribute to increment.
const CATEGORY_ATTRIBUTE_MAP = {
  Intelligence: "intelligence",
  Strength: "strength",
  Discipline: "discipline",
};

export async function POST(request, { params }) {
  // 1) Authenticate
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  const { id: questId } = await params;

  // 2) Use the ADMIN client for all DB operations (service-role bypasses RLS).
  const admin = createAdminClient();

  // 3) Look up the quest by ID. The ADMIN client can read any row, so we
  //    manually check that userId matches the authenticated user ourselves.
  const { data: quest, error: fetchError } = await admin
    .from("Quest")
    .select("*")
    .eq("id", questId)
    .single();

  if (fetchError || !quest) {
    // Quest doesn't exist at all — return 404 without leaking why.
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.userId !== user.id) {
    // Quest exists but belongs to another user — same 404 to avoid leaking.
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // 4) Race-safe completion: UPDATE with a status guard so two near-simultaneous
  //    requests can't both succeed. If the UPDATE affects 0 rows, another request
  //    already completed it.
  //
  //    We use .select() without .single() here deliberately: Supabase's .single()
  //    returns a PGRST116 error ("no rows returned") when the UPDATE's WHERE
  //    matches zero rows — which is exactly the "someone else completed it first"
  //    condition we want to distinguish from a real DB error. By reading the raw
  //    array we can branch: zero rows -> 409, real error -> 500.
  const NOT_COMPLETED_STATUSES = [
    "available",
    "accepted",
    "in_progress",
    "paused",
  ];

  const { data: updatedQuests, error: updateError } = await admin
    .from("Quest")
    .update({
      status: "completed",
      completedAt: new Date().toISOString(),
    })
    .eq("id", questId)
    .in("status", NOT_COMPLETED_STATUSES)
    .select();

  if (updateError) {
    console.error("Quest status update failed:", updateError);
    return NextResponse.json({ error: "Failed to complete quest" }, { status: 500 });
  }

  // No rows were updated — the quest was already 'completed' (or its status
  // changed between our initial SELECT and this UPDATE). Return 409 so the
  // caller knows it was a duplicate completion, not a DB failure.
  if (!updatedQuests || updatedQuests.length === 0) {
    return NextResponse.json(
      { error: "Quest already completed" },
      { status: 409 }
    );
  }

  // Use the single updated row for any further logic that needs the new state.
  const updatedQuest = updatedQuests[0];

  // 5) Compute and apply rewards.
  const { rewardXP, rewardCoins, rewardGems, category } = quest;

  // Fetch the user's character (ADMIN client, since anon can't read Character
  // via RLS — but we already verified the user, so this is safe).
  const { data: character, error: charFetchError } = await admin
    .from("Character")
    .select("*")
    .eq("userId", user.id)
    .single();

  if (charFetchError || !character) {
    console.error("Character fetch failed:", charFetchError);
    return NextResponse.json({ error: "Character not found" }, { status: 500 });
  }

  // XP + level
  const newTotalXP = character.totalXP + rewardXP;
  const { level: newLevel, xpForNextLevel } = getLevelForTotalXp(newTotalXP);
  const leveledUp = newLevel > character.level;

  // Attribute bump: flat +1 per completion, mapped from category.
  const attributeKey = CATEGORY_ATTRIBUTE_MAP[category];
  const newAttributeValue =
    attributeKey != null
      ? character[attributeKey] + 1
      : character[attributeKey];

  const newIntelligence =
    attributeKey === "intelligence" ? newAttributeValue : character.intelligence;
  const newStrength =
    attributeKey === "strength" ? newAttributeValue : character.strength;
  const newDiscipline =
    attributeKey === "discipline" ? newAttributeValue : character.discipline;

  // Currency
  const newCoins = character.coins + rewardCoins;
  const newGems = character.gems + rewardGems;

  // Streak: compute before and after so we can detect villageTier changes.
  const serverNow = new Date();
  const tierBefore = getVillageTier(character.currentStreak);

  const streakUpdate = computeStreakUpdate(
    character.lastActiveDate,
    character.currentStreak,
    character.longestStreak,
    serverNow
  );

  const tierAfter = getVillageTier(streakUpdate.currentStreak);
  const villageTierChanged = tierBefore !== tierAfter;

  // Update the Character row in one call.
  const { error: charUpdateError } = await admin
    .from("Character")
    .update({
      totalXP: newTotalXP,
      level: newLevel,
      intelligence: newIntelligence,
      strength: newStrength,
      discipline: newDiscipline,
      coins: newCoins,
      gems: newGems,
      currentStreak: streakUpdate.currentStreak,
      longestStreak: streakUpdate.longestStreak,
      lastActiveDate: streakUpdate.lastActiveDate,
    })
    .eq("userId", user.id);

  if (charUpdateError) {
    console.error("Character update failed:", charUpdateError);
    return NextResponse.json({ error: "Failed to update character" }, { status: 500 });
  }

  // 6) Append-only audit: CompletionHistory.
  const { error: historyError } = await admin.from("CompletionHistory").insert({
    userId: user.id,
    taskId: questId,
    xpGranted: rewardXP,
    coinsGranted: rewardCoins,
    gemsGranted: rewardGems,
  });

  if (historyError) {
    console.error("CompletionHistory insert failed:", historyError);
    // Non-fatal for the response — the completion already happened — but log it.
  }

  // 7) Append-only audit: Transaction rows.
  const { error: coinTxError } = await admin.from("Transaction").insert({
    userId: user.id,
    type: "earn",
    currency: "coin",
    amount: rewardCoins,
    reason: `Quest completed: ${quest.title}`,
  });

  if (coinTxError) {
    console.error("Transaction (coins) insert failed:", coinTxError);
  }

  if (rewardGems > 0) {
    const { error: gemTxError } = await admin.from("Transaction").insert({
      userId: user.id,
      type: "earn",
      currency: "gem",
      amount: rewardGems,
      reason: `Quest completed: ${quest.title}`,
    });

    if (gemTxError) {
      console.error("Transaction (gems) insert failed:", gemTxError);
    }
  }

  // 8) Return the contract shape.
  return NextResponse.json({
    quest: { id: quest.id, status: "completed" },
    rewards: { xp: rewardXP, coins: rewardCoins, gems: rewardGems },
    character: {
      level: newLevel,
      totalXP: newTotalXP,
      xpForNextLevel,
      leveledUp,
      intelligence: newIntelligence,
      strength: newStrength,
      discipline: newDiscipline,
      currentStreak: streakUpdate.currentStreak,
      villageTier: tierAfter,
      villageTierChanged,
      coins: newCoins,
      gems: newGems,
    },
  });
}
