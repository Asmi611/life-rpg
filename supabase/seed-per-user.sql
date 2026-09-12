-- ============================================================
-- Life RPG — Per-User Starter State (Template)
-- ============================================================
-- This is NOT run as a standalone migration. It documents the
-- exact starter state inserted the moment a new Character is
-- created via POST /api/character.
--
-- In practice this logic lives in the POST /api/character route
-- handler, using the service-role client (supabaseAdmin.js) to
-- insert all rows after character creation in a single
-- transaction, so a partial write never leaves a user in an
-- inconsistent starting state.
--
-- For manual testing, replace every occurrence of the string
-- 'PLACEHOLDER_USER_ID' with a real auth.users uuid and paste
-- this into the Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- STARTER QUESTS (5 NPC quests, one per hotspot)
-- ============================================================

INSERT INTO "Quest"
  ("userId", title, description, category, source, "npcName", hotspot, status, "rewardXP", "rewardCoins", "rewardGems")
VALUES
  ('PLACEHOLDER_USER_ID', 'Read 10 Pages',       'The Scholar asks you to read 10 pages from an ancient tome.',         'Intelligence', 'npc', 'Scholar', 'academy',         'available', 40, 15, 0),
  ('PLACEHOLDER_USER_ID', 'Complete 20 Push-ups', 'The Trainer wants to see your determination. Do 20 push-ups.',       'Strength',     'npc', 'Trainer', 'trainingGround', 'available', 35, 12, 0),
  ('PLACEHOLDER_USER_ID', 'Water the Garden',     'The Farmer needs help keeping the village garden alive.',            'Discipline',   'npc', 'Farmer',  'farm',            'available', 30, 10, 0),
  ('PLACEHOLDER_USER_ID', 'Organize the Bookshelf', 'The Librarian is overwhelmed. Sort the returned books.',           'Intelligence', 'npc', 'Librarian', 'library',       'available', 45, 18, 0),
  ('PLACEHOLDER_USER_ID', 'Sharpen Your Focus',   'The Mentor challenges you to sit in silence for 5 minutes.',         'Discipline',   'npc', 'Mentor',  'workshop',        'available', 50, 20, 0);


-- ============================================================
-- STARTER BUILDINGS (all level 1)
-- ============================================================

INSERT INTO "Building" ("userId", type, level, "upgradedAt")
VALUES
  ('PLACEHOLDER_USER_ID', 'Academy',        1, NULL),
  ('PLACEHOLDER_USER_ID', 'TrainingGround', 1, NULL),
  ('PLACEHOLDER_USER_ID', 'Farm',           1, NULL),
  ('PLACEHOLDER_USER_ID', 'Library',        1, NULL),
  ('PLACEHOLDER_USER_ID', 'Workshop',       1, NULL);
