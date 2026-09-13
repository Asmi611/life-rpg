-- ============================================================
-- Life RPG — Seed Data (Catalog)
-- ============================================================
-- Inserts the shared ShopItem catalog. These rows have no userId
-- and can be run safely in any environment (local, staging, prod).
--
-- NPC starter quests and starting Building rows are NOT seeded
-- here because they require a userId that only exists once a real
-- user signs up. See supabase/seed-per-user.sql for the per-user
-- starter state template.
-- ============================================================

-- ============================================================
-- SHOP ITEMS
-- ============================================================
-- 3 cosmetics + 3 decorations.
-- One cosmetic (Cosmic Wings) costs gems instead of coins to
-- demonstrate the dual-currency shop in action.
-- ============================================================

INSERT INTO "ShopItem" (id, name, type, "costCoins", "costGems") VALUES
  -- Cosmetics
  ('a0000000-0000-0000-0000-000000000001', 'Golden Cape',      'cosmetic',    100, 0),
  ('a0000000-0000-0000-0000-000000000002', 'Wizard Hat',       'cosmetic',     80, 0),
  ('a0000000-0000-0000-0000-000000000003', 'Cosmic Wings',     'cosmetic',      0, 5),

  -- Decorations
  ('a0000000-0000-0000-0000-000000000004', 'Garden Fence',     'decoration',   60, 0),
  ('a0000000-0000-0000-0000-000000000005', 'Stone Path',       'decoration',   50, 0),
  ('a0000000-0000-0000-0000-000000000006', 'Flower Bed',       'decoration',   40, 0);
