-- ============================================================
-- Life RPG — Per-User Starter State (Template)
-- ============================================================
-- ⚠️  This is NOT run as a standalone migration. It documents
-- the exact starter state that should be inserted the moment
-- a new Character is created via POST /api/character.
--
-- In practice, this logic lives in the POST /api/character
-- route handler, using the service-role client (supabaseAdmin.js)
-- to insert these rows right after character creation. The route
-- inserts all 10 rows in a single transaction so a partial write
-- never leaves a user in an inconsistent starting state.
--
-- For manual testing, replace :user_id with a real auth.users id
-- and paste this into the Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- STARTER QUESTS (5 NPC quests, one per hotspot)
-- ============================================================
-- Each new user receives these as their initial available quests.
-- All are source='npc', status='available', rewardGems=0.
-- Quest titles and descriptions match the master doc's Part 3.3.
-- ============================================================

INSERT INTO "Quest"
  ("userId", title, description, category, source, "npcName", hotspot, status, "rewardXP", "rewardCoins", "rewardGems")
VALUES
  -- Academy — Scholar — Intelligence
  (
    :user_id,
    'Read 10 Pages',
    'The Scholar asks you to read 10 pages from an ancient tome. Knowledge is power.',
    'Intelligence', 'npc', 'Scholar', 'academy',
    'available', 40, 15, 0
  ),

  -- Training Ground — Trainer — Strength
  (
    :user_id,
    'Complete 20 Push-ups',
    'The Trainer wants to see your determination. Do 20 push-ups without stopping.',
    'Strength', 'npc', 'Trainer', 'trainingGround',
    'available', 35, 12, 0
  ),

  -- Farm-Garden — Farmer — Discipline
  (
    :user_id,
    'Water the Garden',
    'The Farmer needs help keeping the village garden alive. Water every plant today.',
    'Discipline', 'npc', 'Farmer', 'farm',
    'available', 30, 10, 0
  ),

  -- Library — Librarian — Intelligence
  (
    :user_id,
    'Organize the Bookshelf',
    'The Librarian is overwhelmed. Sort the returned books back onto the shelves.',
    'Intelligence', 'npc', 'Librarian', 'library',
    'available', 45, 18, 0
  ),

  -- Workshop — Mentor — Discipline
  (
    :user_id,
    'Sharpen Your Focus',
    'The Mentor challenges you to sit in silence for 5 minutes and clear your mind.',
    'Discipline', 'npc', 'Mentor', 'workshop',
    'available', 50, 20, 0
  );


-- ============================================================
-- STARTER BUILDINGS (all level 1)
-- ============================================================
-- Every new user begins with all 5 village buildings at level 1.
-- upgradedAt is NULL since no upgrade has occurred yet.
-- ============================================================

INSERT INTO "Building" ("userId", type, level, "upgradedAt")
VALUES
  (:user_id, 'Academy',        1, NULL),
  (:user_id, 'TrainingGround', 1, NULL),
  (:user_id, 'Farm',           1, NULL),
  (:user_id, 'Library',        1, NULL),
  (:user_id, 'Workshop',       1, NULL);
