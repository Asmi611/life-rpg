import { NextResponse } from "next/server";
import {
  createClient,
  getAuthenticatedUser,
} from "@/lib/server/supabaseServer";
import { createAdminClient } from "@/lib/server/supabaseAdmin";
import { getLevelForTotalXp } from "@/lib/server/xpCurve";
import { getVillageTier } from "@/lib/server/villageTier";

// ============================================================
// GET /api/character
// ============================================================
// Returns the logged-in user's character with computed fields.
// 401 if no session, 404 if no character yet.
//
// Authentication: tries the cookie session first (real browser logins),
// then falls back to an "Authorization: Bearer <token>" header for direct
// API testing with tools like Postman / Thunder Client.
// ============================================================

export async function GET(request) {
  const { user, error: authError, supabase } = await getAuthenticatedUser(request);

  if (authError || !user || !supabase) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  // RLS-scoped query — the returned client is scoped to this user either
  // via cookies (browser session) or via the Bearer token Authorization
  // header (direct API testing).
  const { data: character, error } = await supabase
    .from("Character")
    .select("*")
    .eq("userId", user.id)
    .single();

  if (error || !character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  // Compute fields that are never stored
  const { level, xpForNextLevel } = getLevelForTotalXp(character.totalXP);
  const villageTier = getVillageTier(character.currentStreak);

  return NextResponse.json({
    id: character.id,
    name: character.name,
    gender: character.gender,
    level,
    totalXP: character.totalXP,
    xpForNextLevel,
    intelligence: character.intelligence,
    strength: character.strength,
    discipline: character.discipline,
    currentStreak: character.currentStreak,
    longestStreak: character.longestStreak,
    villageTier,
    coins: character.coins,
    gems: character.gems,
  });
}

// ============================================================
// POST /api/character
// ============================================================
// Creates a new character for the logged-in user, plus starter
// quests and buildings. Idempotent — returns 409 if one already
// exists.
//
// Authentication: tries the cookie session first (real browser logins),
// then falls back to an "Authorization: Bearer <token>" header for direct
// API testing with tools like Postman / Thunder Client.
// ============================================================

export async function POST(request) {
  const { user, error: authError } = await getAuthenticatedUser(request);

  if (authError || !user) {
    return NextResponse.json(
      { error: authError ? authError.message : "Not authenticated" },
      { status: 401 }
    );
  }

  // Parse and validate the request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, gender } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!gender || typeof gender !== "string" || gender.trim().length === 0) {
    return NextResponse.json({ error: "Gender is required" }, { status: 400 });
  }

  // Use the service-role client for writes — the authenticated role has no
  // INSERT/UPDATE/DELETE policies on Character, Quest, or Building (see
  // schema.sql). Only the admin client, which bypasses RLS, can insert rows.
  // This is a deliberate anti-cheat measure: all mutations go through server-
  // side API routes that have already verified the user's session above.
  const admin = createAdminClient();

  // Check for existing character (idempotent)
  const { data: existing } = await admin
    .from("Character")
    .select("id")
    .eq("userId", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Character already exists" },
      { status: 409 }
    );
  }

  // Insert the character
  const { data: character, error: insertError } = await admin
    .from("Character")
    .insert({
      userId: user.id,
      name: name.trim(),
      gender: gender.trim(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("Character insert failed:", insertError);
    return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  }

  // ------------------------------------------------------------------
  // Starter state: insert 5 NPC quests + 5 starter buildings.
  // These use the same data as supabase/seed-per-user.sql.
  // If these inserts fail we log the error but don't block character
  // creation — the character existing is the priority.
  // ------------------------------------------------------------------

  const starterQuests = [
    {
      userId: user.id,
      title: "Read 10 Pages",
      description: "The Scholar asks you to read 10 pages from an ancient tome.",
      category: "Intelligence",
      source: "npc",
      npcName: "Scholar",
      hotspot: "academy",
      status: "available",
      rewardXP: 40,
      rewardCoins: 15,
      rewardGems: 0,
    },
    {
      userId: user.id,
      title: "Complete 20 Push-ups",
      description: "The Trainer wants to see your determination. Do 20 push-ups.",
      category: "Strength",
      source: "npc",
      npcName: "Trainer",
      hotspot: "trainingGround",
      status: "available",
      rewardXP: 35,
      rewardCoins: 12,
      rewardGems: 0,
    },
    {
      userId: user.id,
      title: "Water the Garden",
      description: "The Farmer needs help keeping the village garden alive.",
      category: "Discipline",
      source: "npc",
      npcName: "Farmer",
      hotspot: "farm",
      status: "available",
      rewardXP: 30,
      rewardCoins: 10,
      rewardGems: 0,
    },
    {
      userId: user.id,
      title: "Organize the Bookshelf",
      description: "The Librarian is overwhelmed. Sort the returned books.",
      category: "Intelligence",
      source: "npc",
      npcName: "Librarian",
      hotspot: "library",
      status: "available",
      rewardXP: 45,
      rewardCoins: 18,
      rewardGems: 0,
    },
    {
      userId: user.id,
      title: "Sharpen Your Focus",
      description: "The Mentor challenges you to sit in silence for 5 minutes.",
      category: "Discipline",
      source: "npc",
      npcName: "Mentor",
      hotspot: "workshop",
      status: "available",
      rewardXP: 50,
      rewardCoins: 20,
      rewardGems: 0,
    },
  ];

  const starterBuildings = [
    { userId: user.id, type: "Academy", level: 1 },
    { userId: user.id, type: "TrainingGround", level: 1 },
    { userId: user.id, type: "Farm", level: 1 },
    { userId: user.id, type: "Library", level: 1 },
    { userId: user.id, type: "Workshop", level: 1 },
  ];

  // Fire-and-forget: log failures but don't block the response
  const { error: questError } = await admin.from("Quest").insert(starterQuests);
  if (questError) {
    console.error("Starter quests insert failed:", questError);
  }

  const { error: buildingError } = await admin
    .from("Building")
    .insert(starterBuildings);
  if (buildingError) {
    console.error("Starter buildings insert failed:", buildingError);
  }

  // Return the character in the same shape as GET, plus a flag showing
  // whether both starter-data inserts succeeded (for testing visibility).
  const { level, xpForNextLevel } = getLevelForTotalXp(character.totalXP);
  const villageTier = getVillageTier(character.currentStreak);

  return NextResponse.json({
    id: character.id,
    name: character.name,
    gender: character.gender,
    level,
    totalXP: character.totalXP,
    xpForNextLevel,
    intelligence: character.intelligence,
    strength: character.strength,
    discipline: character.discipline,
    currentStreak: character.currentStreak,
    longestStreak: character.longestStreak,
    villageTier,
    coins: character.coins,
    gems: character.gems,
    starterDataSeeded: !questError && !buildingError,
  });
}
