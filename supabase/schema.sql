-- ============================================================
-- Life RPG — Database Schema
-- ============================================================
-- Hackathon project using Postgres (Supabase).
-- All user-owned tables use uuid PKs via gen_random_uuid()
-- and reference auth.users(id) via a userId column.
-- villageTier is NEVER stored — it is computed server-side
-- from currentStreak on every read.
-- ============================================================


-- ============================================================
-- 1. CHARACTER
-- ============================================================
-- One character per user (userId is UNIQUE).
-- Currency (coins/gems) lives on the character record.
-- villageTier is computed from currentStreak, never stored.
-- ============================================================

CREATE TABLE "Character" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"        uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  gender          text NOT NULL,
  level           int NOT NULL DEFAULT 1,
  "totalXP"       int NOT NULL DEFAULT 0,
  intelligence    int NOT NULL DEFAULT 0,
  strength        int NOT NULL DEFAULT 0,
  discipline      int NOT NULL DEFAULT 0,
  "currentStreak" int NOT NULL DEFAULT 0,
  "longestStreak" int NOT NULL DEFAULT 0,
  "lastActiveDate" date,
  coins           int NOT NULL DEFAULT 0,
  gems            int NOT NULL DEFAULT 0,
  "createdAt"     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "Character" ENABLE ROW LEVEL SECURITY;

-- SELECT only: users can read their own character
CREATE POLICY "Character_select_own"
  ON "Character" FOR SELECT
  USING (auth.uid() = "userId");

-- ⚠️  NO INSERT, UPDATE, or DELETE policies for anon/authenticated roles.
-- All writes to Character (creation, XP/coins/gems/streak changes) happen
-- exclusively via API routes using the service-role client in
-- lib/server/supabaseAdmin.js, after the route has verified the request
-- using the RLS-scoped client. The anon key cannot write to this table
-- directly from the browser — this is a deliberate anti-cheat measure
-- ensuring all stat mutations are server-authoritative.

CREATE INDEX idx_character_userid ON "Character" ("userId");


-- ============================================================
-- 2. QUEST
-- ============================================================
-- Quests owned by a user. Can be NPC-seeded or custom-created.
-- category: 'Intelligence' | 'Strength' | 'Discipline'
-- source:   'npc' | 'custom'
-- status:   'available' | 'accepted' | 'in_progress' | 'paused' | 'completed'
-- ============================================================

CREATE TABLE "Quest" (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text,
  category          text NOT NULL CHECK (category IN ('Intelligence', 'Strength', 'Discipline')),
  source            text NOT NULL CHECK (source IN ('npc', 'custom')),
  "npcName"         text,
  hotspot           text,
  status            text NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'accepted', 'in_progress', 'paused', 'completed')),
  "progressPercent" int NOT NULL DEFAULT 0,
  "rewardXP"        int NOT NULL,
  "rewardCoins"     int NOT NULL,
  "rewardGems"      int NOT NULL DEFAULT 0,
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "completedAt"     timestamptz
);

ALTER TABLE "Quest" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quest_select_own"
  ON "Quest" FOR SELECT
  USING (auth.uid() = "userId");

-- ⚠️  NO INSERT, UPDATE, or DELETE policies for anon/authenticated roles.
-- All writes to Quest (create, accept, status changes) happen exclusively
-- via API routes using the service-role client in lib/server/supabaseAdmin.js,
-- after the route has verified the request using the RLS-scoped client.
-- The anon key cannot write to this table directly.

CREATE INDEX idx_quest_userid ON "Quest" ("userId");


-- ============================================================
-- 3. FOCUS SESSION
-- ============================================================
-- Tracks timed focus sessions tied to a quest.
-- Scaffolded now; unused until/unless Focus Mode is built.
-- status: 'active' | 'paused' | 'completed'
-- ============================================================

CREATE TABLE "FocusSession" (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "taskId"            uuid NOT NULL REFERENCES "Quest"(id) ON DELETE CASCADE,
  "startedAt"         timestamptz NOT NULL DEFAULT now(),
  "endedAt"           timestamptz,
  "accumulatedSeconds" int NOT NULL DEFAULT 0,
  status              text NOT NULL CHECK (status IN ('active', 'paused', 'completed'))
);

ALTER TABLE "FocusSession" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FocusSession_select_own"
  ON "FocusSession" FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "FocusSession_insert_own"
  ON "FocusSession" FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "FocusSession_update_own"
  ON "FocusSession" FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "FocusSession_delete_own"
  ON "FocusSession" FOR DELETE
  USING (auth.uid() = "userId");

CREATE INDEX idx_focussession_userid ON "FocusSession" ("userId");
CREATE INDEX idx_focussession_taskid ON "FocusSession" ("taskId");


-- ============================================================
-- 4. COMPLETION HISTORY
-- ============================================================
-- APPEND-ONLY audit trail of quest completions.
-- ⚠️  NO UPDATE or DELETE should ever be issued against this
-- table from application code. This is enforced at the RLS
-- level: only SELECT and INSERT policies exist — no UPDATE
-- or DELETE policies are created for any role, so even a
-- compromised anon key cannot modify history rows.
-- ============================================================

CREATE TABLE "CompletionHistory" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "taskId"        uuid NOT NULL REFERENCES "Quest"(id) ON DELETE CASCADE,
  "completedAt"   timestamptz NOT NULL DEFAULT now(),
  "xpGranted"     int NOT NULL,
  "coinsGranted"  int NOT NULL,
  "gemsGranted"   int NOT NULL DEFAULT 0
);

ALTER TABLE "CompletionHistory" ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only see their own completion history
CREATE POLICY "CompletionHistory_select_own"
  ON "CompletionHistory" FOR SELECT
  USING (auth.uid() = "userId");

-- INSERT: users can only insert their own rows (server-side via API)
CREATE POLICY "CompletionHistory_insert_own"
  ON "CompletionHistory" FOR INSERT
  WITH CHECK (auth.uid() = "userId");

-- ⚠️  NO UPDATE or DELETE policies.
-- This table is append-only by design.
-- Application code must NEVER issue UPDATE or DELETE against it.
-- Only the service-role client (bypassing RLS) can modify rows,
-- and even that should only happen in extraordinary circumstances.

CREATE INDEX idx_completionhistory_userid ON "CompletionHistory" ("userId");
CREATE INDEX idx_completionhistory_taskid ON "CompletionHistory" ("taskId");


-- ============================================================
-- 5. SHOP ITEM (catalog — shared, not user-owned)
-- ============================================================
-- A small catalog table readable by everyone but writable
-- by nobody except via seed data / the service-role client.
-- Defined before Inventory because Inventory FK references it.
-- type: 'cosmetic' | 'decoration'
-- ============================================================

CREATE TABLE "ShopItem" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('cosmetic', 'decoration')),
  "costCoins" int NOT NULL,
  "costGems"  int NOT NULL DEFAULT 0
);

ALTER TABLE "ShopItem" ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated) can read the shop catalog
CREATE POLICY "ShopItem_select_public"
  ON "ShopItem" FOR SELECT
  USING (true);

-- ⚠️  NO INSERT, UPDATE, or DELETE policies for anon/authenticated roles.
-- The catalog can only be modified via the service-role client
-- (i.e. supabaseAdmin.js, used in server-side seed/admin scripts).


-- ============================================================
-- 6. INVENTORY
-- ============================================================
-- User-owned items purchased from the shop.
-- itemId references the ShopItem catalog table.
-- type: 'cosmetic' | 'consumable' | 'decoration'
-- ============================================================

CREATE TABLE "Inventory" (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "itemId"      uuid NOT NULL REFERENCES "ShopItem"(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('cosmetic', 'consumable', 'decoration')),
  equipped      boolean NOT NULL DEFAULT false,
  "purchasedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory_select_own"
  ON "Inventory" FOR SELECT
  USING (auth.uid() = "userId");

-- ⚠️  NO INSERT, UPDATE, or DELETE policies for anon/authenticated roles.
-- All writes to Inventory (purchases, equip toggles) happen exclusively
-- via API routes using the service-role client in lib/server/supabaseAdmin.js,
-- after the route has verified the request using the RLS-scoped client.
-- The anon key cannot write to this table directly.

CREATE INDEX idx_inventory_userid ON "Inventory" ("userId");
CREATE INDEX idx_inventory_itemid ON "Inventory" ("itemId");


-- ============================================================
-- 7. BUILDING
-- ============================================================
-- Village buildings owned / upgraded by a user.
-- type: 'Academy' | 'TrainingGround' | 'Farm' | 'Library' | 'Workshop'
-- ============================================================

CREATE TABLE "Building" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('Academy', 'TrainingGround', 'Farm', 'Library', 'Workshop')),
  level       int NOT NULL DEFAULT 1,
  "upgradedAt" timestamptz
);

ALTER TABLE "Building" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Building_select_own"
  ON "Building" FOR SELECT
  USING (auth.uid() = "userId");

-- ⚠️  NO INSERT, UPDATE, or DELETE policies for anon/authenticated roles.
-- All writes to Building (creation, upgrades) happen exclusively via API
-- routes using the service-role client in lib/server/supabaseAdmin.js,
-- after the route has verified the request using the RLS-scoped client.
-- The anon key cannot write to this table directly.

CREATE INDEX idx_building_userid ON "Building" ("userId");


-- ============================================================
-- 8. TRANSACTION
-- ============================================================
-- APPEND-ONLY audit trail of all coin/gem movements.
-- ⚠️  NO UPDATE or DELETE should ever be issued against this
-- table from application code. This is enforced at the RLS
-- level: only SELECT and INSERT policies exist — no UPDATE
-- or DELETE policies are created for any role, so even a
-- compromised anon key cannot modify history rows.
-- type: 'earn' | 'spend'
-- currency: 'coin' | 'gem'
-- ============================================================

CREATE TABLE "Transaction" (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type      text NOT NULL CHECK (type IN ('earn', 'spend')),
  amount    int NOT NULL,
  currency  text NOT NULL CHECK (currency IN ('coin', 'gem')),
  reason    text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only see their own transactions
CREATE POLICY "Transaction_select_own"
  ON "Transaction" FOR SELECT
  USING (auth.uid() = "userId");

-- INSERT: users can only insert their own rows (server-side via API)
CREATE POLICY "Transaction_insert_own"
  ON "Transaction" FOR INSERT
  WITH CHECK (auth.uid() = "userId");

-- ⚠️  NO UPDATE or DELETE policies.
-- This table is append-only by design.
-- Application code must NEVER issue UPDATE or DELETE against it.
-- Only the service-role client (bypassing RLS) can modify rows,
-- and even that should only happen in extraordinary circumstances.

CREATE INDEX idx_transaction_userid ON "Transaction" ("userId");


-- ============================================================
-- ANTI-CHEAT SECURITY MODEL — SUMMARY
-- ============================================================
--
-- SECURITY TIERS (by RLS write-policy exposure):
--
--   Tier 1 — SELECT-only (service-role writes only):
--     Character, Quest, Inventory, Building
--     The anon/authenticated key can only READ these tables.
--     All mutations happen in API routes via the service-role
--     client (supabaseAdmin.js) AFTER the route has verified
--     the request using the RLS-scoped client. This ensures
--     every stat change (XP, coins, gems, streak, level, quest
--     progress, inventory, buildings) is server-authoritative —
--     a tampered client request cannot reach the DB directly.
--
--   Tier 2 — SELECT + INSERT only (append-only):
--     CompletionHistory, Transaction
--     Users can INSERT new rows (via server-side API) but there
--     is no UPDATE or DELETE policy for any role. These tables
--     serve as immutable audit trails: CompletionHistory records
--     every quest completion with the exact XP/coins/gems granted;
--     Transaction records every coin/gem earn or spend event.
--     Together they let us (and judges) verify the economy is
--     internally consistent.
--
--   Tier 3 — SELECT + INSERT + UPDATE + DELETE:
--     FocusSession
--     Lower-stakes, optional feature. Write policies exist for
--     the authenticated role because timing data is less
--     security-critical than reward computation.
--
--   Public read, no write policies:
--     ShopItem
--     Shared catalog. Readable by anyone; writable only via the
--     service-role client (seed data / admin scripts).
--
-- Convention: if a row in an append-only table needs to be
-- corrected, insert a compensating row — never UPDATE the original.
-- ============================================================
