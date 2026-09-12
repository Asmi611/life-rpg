# API Contract (agree on this together in Phase 0, before splitting off)

Member A builds every screen against mock data shaped exactly like this. Member B builds every route
to return exactly this. All routes are under `/api/`, all require a logged-in Supabase session
(read from the request cookie server-side) except where noted, and all mutations are
**server-authoritative** — the client never sends a reward amount, only an action ("I completed quest 123").

## Auth
Handled directly by the Supabase JS client (`supabase.auth.signUp`, `signInWithPassword`, `signOut`)
from the frontend — no custom `/api/auth/*` routes needed. Member A calls these directly;
Member B's job is to write the Row Level Security policies that make every other table safe once
a `session.user.id` exists.

## GET /api/character
Returns the logged-in user's character. 404 if none created yet.
```json
{
  "id": "uuid",
  "name": "Aria",
  "gender": "female",
  "level": 4,
  "totalXP": 1280,
  "xpForNextLevel": 1600,
  "intelligence": 12,
  "strength": 5,
  "discipline": 9,
  "currentStreak": 3,
  "longestStreak": 6,
  "villageTier": 2,
  "coins": 240,
  "gems": 3
}
```

## POST /api/character
Body: `{ "name": "Aria", "gender": "female" }` → creates the character once. Returns same shape as GET.

## GET /api/quests
Returns available/accepted/in_progress quests for the hub + any NPC starter quests not yet accepted.
```json
{
  "quests": [
    {
      "id": "uuid",
      "title": "Read 10 pages",
      "description": "The Librarian wants you to read.",
      "category": "Intelligence",
      "source": "npc",
      "npcName": "Librarian",
      "hotspot": "library",
      "status": "available",
      "rewardXP": 40,
      "rewardCoins": 15,
      "rewardGems": 0
    }
  ]
}
```

## POST /api/quests
Body: `{ "title": "...", "description": "...", "category": "Discipline" }` → creates a custom quest.
Server rejects empty/whitespace-only `title` with `400 { "error": "Title is required" }`.

## PATCH /api/quests/:id
Body: any subset of `{ title, description, category, status }`. Used to accept a quest
(`status: "accepted"`) or edit a custom one.

## DELETE /api/quests/:id
Deletes a custom quest. NPC quests cannot be deleted (`403`).

## POST /api/quests/:id/complete
**No body needed.** The server looks up the quest, checks it belongs to the caller and isn't already
`completed`, then computes and applies rewards. This is the single most important endpoint for the
anti-cheat requirement — see Member B's guide.

Success `200`:
```json
{
  "quest": { "id": "uuid", "status": "completed" },
  "rewards": { "xp": 40, "coins": 15, "gems": 0 },
  "character": {
    "level": 5,
    "totalXP": 1320,
    "xpForNextLevel": 1650,
    "leveledUp": true,
    "intelligence": 13,
    "currentStreak": 4,
    "villageTier": 2,
    "villageTierChanged": false,
    "coins": 255,
    "gems": 3
  }
}
```
Already-completed quest → `409 { "error": "Quest already completed" }` (this is what makes the
"double-click / two tabs" edge case safe).

## GET /api/shop/items
```json
{
  "items": [
    { "id": "uuid", "name": "Golden Cape", "type": "cosmetic", "costCoins": 100, "costGems": 0, "owned": false, "equipped": false },
    { "id": "uuid", "name": "Garden Fence", "type": "decoration", "costCoins": 60, "costGems": 0, "owned": true, "equipped": true }
  ]
}
```

## POST /api/shop/purchase
Body: `{ "itemId": "uuid" }` → validates against the **server-side** coin/gem balance at the moment of
purchase, not a cached client balance. Returns updated `coins`/`gems` and the item marked `owned: true`.
Insufficient balance → `400 { "error": "Not enough coins" }`.

## POST /api/shop/equip
Body: `{ "itemId": "uuid" }` → toggles `equipped` for a cosmetic the user owns.

## GET /api/buildings
```json
{ "buildings": [ { "type": "Academy", "level": 1, "nextUpgradeCost": 150 } ] }
```

## POST /api/buildings/:type/upgrade
Validates coin balance and current level server-side, increments `level`, deducts coins.

## Error shape (all endpoints)
```json
{ "error": "Human readable message" }
```
Frontend shows this message in a toast; never a raw stack trace.

## Notes for both of you
- All numeric reward/currency/streak/tier fields are **only ever set by the server**. If you ever find
  yourself writing `character.xp += 40` in a component, stop — that calculation belongs in
  `lib/server/` and the component should just re-fetch or use the response above.
- Dates/streak logic always use the server's clock (`new Date()` inside the API route), never
  `Date.now()` read from the client and sent in a request body.
