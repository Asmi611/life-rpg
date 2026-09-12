# Life RPG — Member B Guide (Backend / Data / Anti-Cheat Lead)

Read `00_START_HERE.md` first if you haven't. You shouldn't need Member A's guide except at the six
**Sync Points** called out below — everything else here is self-contained. You own:

```
app/api/    lib/server/    supabase/
```

You never touch `app/(game)/`, `components/`, `styles/`, or `public/art/` — not because you can't,
but because touching them is how two people end up resolving merge conflicts in JSX at 3am. Your job
is to make every number in this game true and tamper-proof: XP, coins, gems, streaks, villageTier. If
Member A's screen needs a field you haven't built yet, they're rendering mock data shaped like
`02_API_CONTRACT.md` — your job is to make the real thing return exactly that shape, on schedule.

---

## 0. Before hour zero: the honest version of "free tools only"

Everything below is genuinely free — including the one thing worth being upfront about, same as
Member A's note: **Claude Code (terminal tool) needs a Pro/Max subscription or a pay-as-you-go
Console account** — it is not on Claude's free chat plan. Realistic path, cheapest first:

1. **Ask your hackathon organizers before paying anything.** Sponsor API credits are common and
   often go unused because nobody asks.
2. **A brand-new Anthropic Console account** (console.anthropic.com) gets a one-time small free trial
   credit, no card, just phone verification — enough for a handful of real sessions if you spend it on
   the hard phases (8, 9, 11 below) rather than boilerplate.
3. **A Claude Pro plan** (either of you) includes Claude Code in the same subscription — smoothest
   option if it's on the table.
4. **Zero budget left? "Manual Mode."** Claude.ai's free chat tier costs nothing, resets every few
   hours. Every "Ask Claude Code" prompt below works pasted into that chat window — you paste the
   code it gives you into your files by hand instead of it editing them for you. Slower, not worse.
   (You mentioned you already have an alternative access path for Claude Code — great, everything
   below still applies exactly the same either way.)

Install once you have access:
```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | bash
# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex
```
Then `cd` into the repo and run `claude`.

---

## 1. Your tools (all free tiers, no card required)

| Tool | For | Notes |
|---|---|---|
| **Node.js 20+ LTS** | Running everything | Same runtime as Member A — you share the repo. |
| **VS Code** | Editor | Install the "Postgres" or "SQLTools" extension if you want inline schema browsing. |
| **Claude Code / Claude.ai** | Generating your API routes + SQL | See §0 above. |
| **Supabase (free tier)** | Postgres DB + Auth + Row Level Security | 500MB DB, 50k monthly active users, unlimited API requests on the free tier — plenty for a hackathon. One project, created at supabase.com with a GitHub login, no card. |
| **Supabase SQL Editor** (in-browser) | Running schema/seed SQL, inspecting tables | Built into the Supabase dashboard — this is your primary DB tool, you don't need a separate Postgres client. |
| **Thunder Client** (VS Code extension) or **Postman (free)** | Testing your own API routes before Member A wires the frontend to them | Free, lets you fire a `POST /api/quests/:id/complete` without needing a UI yet. |
| **Vercel (Hobby plan)** | Hosting the API routes (same deploy as the frontend, since Next.js keeps them in one repo) | Free forever for this use case. Environment variables (Supabase URL/keys) get set in Vercel's dashboard, not just `.env.local`. |
| **`.env.local` (git-ignored)** | Local Supabase keys | Never commit real keys — `.env.example` holds placeholder names only. |

---

## 2. Working with Claude Code: your house-style preamble

Paste this as your first message in a new session, or append it to the shared `CLAUDE.md` at the repo
root under Member A's half (separated by a `---`):

```
You're working on "Life RPG," a hackathon web app: Next.js (App Router, JavaScript) API routes,
Supabase (Postgres + Auth + Row Level Security). I'm the backend/data/anti-cheat developer on a
2-person team. My teammate owns app/(game)/, components/, styles/, and public/art/ — I never touch
those. I own app/api/, lib/server/, and supabase/.

Every route matches docs/02_API_CONTRACT.md exactly — same field names, same casing, same nesting.
If a route needs to diverge from the contract, I edit the contract file first and tell my teammate,
never silently change a response shape.

Non-negotiable server-authority rules (from the project doc, Part 7) — apply these to every route
that touches XP/coins/gems/streak/tier, no exceptions:
1. The client only ever sends an action ("I completed quest 123"), never a reward amount. Rewards are
   looked up from the quest record and computed server-side.
2. villageTier is never a stored, client-editable column — it's computed from currentStreak on every
   read.
3. Streak increments are evaluated using the server's `new Date()`, once per real calendar day, never
   a client-sent timestamp.
4. Currency purchases are validated against the current server-side balance at the moment of
   purchase, not a value passed in the request body.
5. CompletionHistory and Transaction tables are append-only — never UPDATE or DELETE those rows.
6. Every query is scoped to the logged-in user via Supabase Row Level Security, not just an
   application-level `WHERE userId = ...` check — RLS is the actual security boundary judges look for.

Ask me before assuming anything not covered above.
```

**Prompting habits that keep the output reviewable:**
- Ask for one table, one route, or one function per prompt — not "build the whole backend." You need
  to be able to explain the anti-cheat logic in the demo Q&A.
- When asking for SQL, explicitly ask for the RLS policy in the same prompt as the table — it's easy
  to generate a table and forget the policy, and an unprotected table is a disqualifying-adjacent bug.
- If a generated route trusts anything from the request body that should be server-computed, quote
  the exact rule from your preamble back at it rather than saying "fix it."

---

## 3. Phase-by-phase

### Phase 0 — Project Setup (shared, then your slice)
**Do:** Run the scaffold commands from `01_GIT_WORKFLOW.md §2` together with Member A. Once the repo
exists and you're on `feature/backend`:
- Create a Supabase project at supabase.com (free tier, GitHub login, no card). Note the Project URL,
  `anon` key, and `service_role` key.
- Create `.env.local` (git-ignored) with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  and `SUPABASE_SERVICE_ROLE_KEY`. Mirror the variable *names* (not values) into `.env.example`.
- In Vercel's dashboard (Project Settings → Environment Variables), add the same three variables so
  production builds have them — a build that works locally but fails on Vercel is almost always a
  missing env var here.
- `npm install @supabase/supabase-js @supabase/ssr` for the client + server-side Supabase clients.
- Create `lib/server/supabaseAdmin.js` (uses the service-role key, server-only, never imported into
  any client component) and `lib/server/supabaseServer.js` (reads the user's session from cookies for
  RLS-scoped queries).
- Draft the bottom half of `CLAUDE.md` at the repo root (your preamble from §2), under Member A's half.

**Ask Claude Code:**
```
Create lib/server/supabaseAdmin.js exporting a Supabase client built with the service-role key
(server-only — add a comment warning this must never be imported into a "use client" component) and
lib/server/supabaseServer.js exporting a helper that builds a Supabase client scoped to the logged-in
user by reading the session from cookies, for use inside app/api/ route handlers.
```

**Tools:** Supabase dashboard, Vercel dashboard, VS Code, Claude Code.
**Done when:** Both Supabase clients exist and import without errors; env vars are set in both
`.env.local` and Vercel; `CLAUDE.md` has your section filled in.
**Commit:**
`chore: scaffold Next.js app with Tailwind` (shared)
`chore(supabase): add admin and server supabase clients`
`docs: add backend section to CLAUDE.md`

---

### Phase 1 — Schema Design (parallel to Member A's Figma phase)
**Do:** While Member A is in Figma, write the full schema from the master doc's Part 6 as real SQL —
even the tables the Core MVP won't populate yet (`FocusSession`), so there's no migration later if
Focus Mode gets built. Write it directly in `supabase/schema.sql`, then run it in the Supabase SQL
Editor.

**Ask Claude Code:**
```
Write supabase/schema.sql implementing this data model as Postgres tables with proper foreign keys,
NOT NULL constraints where they make sense, sensible defaults (level starts at 1, totalXP/coins/gems
start at 0, currentStreak/longestStreak start at 0), and a CHECK constraint on Task.status limiting it
to ('available','accepted','in_progress','paused','completed'):

User (id, email, passwordHash, createdAt)   -- actually: use Supabase's built-in auth.users, don't
  create a custom User table — reference auth.users(id) as the foreign key everywhere else instead.
Character (id, userId -> auth.users, name, gender, level, totalXP, intelligence, strength,
  discipline, currentStreak, longestStreak, lastActiveDate, createdAt)
  -- note: NO villageTier column — it's computed on read, never stored.
Quest (id, userId, title, description, category, source, npcName, hotspot, status, progressPercent,
  rewardXP, rewardCoins, rewardGems, createdAt, completedAt)
FocusSession (id, userId, taskId -> Quest, startedAt, endedAt, accumulatedSeconds, status)
  -- scaffolded now, unused until/unless Focus Mode is built
CompletionHistory (id, userId, taskId -> Quest, completedAt, xpGranted, coinsGranted, gemsGranted)
  -- append-only: no UPDATE/DELETE should ever target this table
Inventory (id, userId, itemId -> ShopItem, type, equipped, purchasedAt)
ShopItem (id, name, type, costCoins, costGems)  -- a catalog table, not user-owned
Building (id, userId, type, level, upgradedAt)
Transaction (id, userId, type, amount, currency, reason, timestamp)  -- append-only audit trail

Add indexes on every userId foreign key column, since every query in this app filters by the logged-
in user.
```

Then write the seed data:
```
Write supabase/seed.sql inserting: the 5 NPC starter quests (one per hotspot — Academy/Scholar,
Training Ground/Trainer, Farm-Garden/Farmer, Library/Librarian, Workshop/Mentor — matching the
master doc's Part 3.3 table, source='npc', reasonable rewardXP/Coins for a first quest), and the
shop catalog: 3 cosmetics + 3 village decorations + the Academy Lv.1→Lv.2 upgrade cost, matching
Part 3.5 and Part 5's Building Upgrade screen.
```

**Tools:** Supabase SQL Editor, Claude Code.
**Done when:** Both files run in the SQL Editor without errors; tables are visible in Supabase's
Table Editor with the seed rows present.
**Commit:**
`feat(schema): add full data model per master doc part 6`
`feat(seed): add NPC starter quests and shop catalog`

---

### Phase 2 — Row Level Security (parallel to Member A's static prototype phase)
**Do:** This is the single most judge-visible security requirement in the whole brief ("users only
see/edit their own data," enforced at the DB level). Write RLS policies for every user-owned table
before writing a single API route — routes should be a thin layer on top of policies that already
make the database safe by default, not the only line of defense.

**Ask Claude Code:**
```
Write supabase/policies.sql. Enable Row Level Security on Character, Quest, FocusSession,
CompletionHistory, Inventory, Building, and Transaction. For each, add policies so that
auth.uid() = userId is required for SELECT, INSERT, UPDATE, and DELETE — a user can only ever see or
modify their own rows. ShopItem is a public catalog table: enable RLS but allow SELECT to any
authenticated user, no INSERT/UPDATE/DELETE policy for regular users at all (only the service-role
key, used server-side, can modify the catalog).

Add a comment above CompletionHistory and Transaction's policies explicitly noting: no UPDATE or
DELETE policy is created for these two tables under any role except service_role — they are
append-only by design, this enforces the audit-trail requirement at the database level, not just in
application code.
```

**Tools:** Supabase SQL Editor, Claude Code.
**Done when:** With RLS on, a quick manual test in the SQL Editor (query as a different user's
session) returns zero rows for another user's data; the anon/authenticated role cannot write to
`ShopItem`.
**Commit:**
`feat(security): add row level security policies for all user tables`
`test(security): verify cross-user data isolation manually`

---

### Phase 3 — Character API
**Do:** Build `GET /api/character` and `POST /api/character`, matching the contract exactly,
including `xpForNextLevel` (which means the non-linear XP curve needs to exist now, even in a simple
form — you'll refine it in Phase 8, but the shape has to be right today so Member A isn't blocked).

**Ask Claude Code:**
```
Create lib/server/xpCurve.js exporting getXpForLevel(level) using a non-linear curve — something like
xpForLevel(n) = round(100 * n^1.5) so each level costs meaningfully more than the last, and
getLevelForTotalXp(totalXp) which walks the curve to find the current level and remaining XP toward
the next one. Keep this pure and easily unit-testable — no DB calls inside it.

Then create app/api/character/route.js with GET and POST handlers per docs/02_API_CONTRACT.md,
using lib/server/supabaseServer.js for the session-scoped client. GET returns 404 with
{ "error": "Character not found" } if none exists yet. POST creates one only if none exists (return
409 if called again). Both compute villageTier server-side from currentStreak using a
getVillageTier(streak) helper in lib/server/villageTier.js (0-2 days -> 1, 3-6 -> 2, 7+ -> 3) and
include it in the response even though it's not a stored column.
```

**Tools:** Claude Code, Thunder Client/Postman for manual testing.
**Done when:** `POST /api/character` creates a character once and is idempotent on retry; `GET`
returns the exact shape in the contract, tested manually with Thunder Client before Member A ever
calls it.
**Commit:**
`feat(server): add non-linear xp curve helper`
`feat(server): add village tier computation helper`
`feat(api): add character GET/POST endpoints`

---

### Phase 4 — (buffer / get ahead)
**Do:** The master doc's schedule gives Member A a dedicated Character Setup hour here; your
Character API is already done from Phase 3. Use this hour to get ahead: start the Quest API (Phase 5
below) early, or double back and write a few Thunder Client test requests you can re-run quickly
after every future change (empty title, duplicate completion, wrong user's quest ID) — building this
test collection now means Part 10's "must test" edge cases are mostly pre-verified before Phase 13.
**Tools:** Thunder Client, Claude Code.
**Done when:** You're not blocked or idle — either the Quest API has a head start, or your manual test
collection covers the Part 10 "must test" rows.
**Commit:** `test(api): add manual request collection for character and quest edge cases`

---

### Phase 5 — Quest API (CRUD + accept flow)
**Do:** Build `GET/POST /api/quests`, `PATCH /api/quests/:id`, `DELETE /api/quests/:id` per the
contract. This is also where the empty-title validation from Part 10 lives.

**Ask Claude Code:**
```
Create app/api/quests/route.js (GET: return the user's available/accepted/in_progress quests plus
unaccepted NPC starter quests; POST: create a custom quest, rejecting an empty or whitespace-only
title with 400 { "error": "Title is required" } before touching the DB) and
app/api/quests/[id]/route.js (PATCH: update a subset of fields including accepting a quest via
status: "accepted", scoped so a user can only patch their own quest; DELETE: remove a custom quest,
returning 403 { "error": "NPC quests cannot be deleted" } if source is "npc"). All per
docs/02_API_CONTRACT.md field names exactly.
```

**Tools:** Claude Code, Thunder Client.
**Done when:** A quest can be created, accepted, edited, and deleted through raw API calls (no
frontend needed yet); empty title is rejected with no DB write.
**Commit:**
`feat(api): add quest list and create endpoints`
`feat(api): add quest patch and delete endpoints`
`fix(api): reject empty/whitespace quest titles`

---

### Phase 6 — Task CRUD hardening + Sync Point with Member A
**Do:** By now Member A is wiring their Task CRUD UI to your Phase 5 routes. Sit together for the
~14h sync point: walk through create/edit/delete/list together with real requests, fix any field-name
mismatches against the contract immediately (whoever needs the change edits
`docs/02_API_CONTRACT.md` first, per the git workflow doc). Also implement the length cap on
title/description from Part 10's "time-permitting" row while you're both looking at the same form.

**Ask Claude Code:**
```
Add a max length constraint (title: 100 chars, description: 500 chars) to the quest create/update
handlers, returning 400 { "error": "Title too long" } / { "error": "Description too long" } rather
than silently truncating server-side — Member A's form will also cap input length client-side, but
the server check is the one that actually matters.
```

**Tools:** Claude Code, Thunder Client, 15-minute call/in-person sync with Member A.
**Done when:** Tasks survive a refresh through the real UI, not just raw API calls. **Merge
`dev` → `main`** per the git workflow (Phase 6 is a named milestone merge).
**Commit:**
`fix(api): cap title/description length server-side`
`merge: milestone — task crud functional end to end` (the merge commit itself)

---

### Phase 7 — Focus Mode backend (OPTIONAL — build if on schedule, skip if behind)
**Do:** Only touch this if Phases 0–6 are solid. Build the lightweight version first: a single
`POST /api/quests/:id/complete`-adjacent action is often enough (see Phase 8 — Focus Mode's "Mark
Complete" can just call the same completion endpoint you're about to build there). If you have real
time to spare, add `FocusSession` start/pause/resume endpoints with server-side elapsed-time clamping.

**Ask Claude Code (only if attempting the full version):**
```
Add app/api/focus/start/route.js, app/api/focus/pause/route.js, app/api/focus/resume/route.js, and
app/api/focus/complete/route.js. Each recalculates accumulatedSeconds server-side from
wall-clock timestamps (now() minus startedAt, or resume timestamp minus pause timestamp) rather than
trusting any duration value sent by the client. Reject a resume/complete call with implausible deltas
(e.g. a paused session claiming more elapsed time than actually passed) with
400 { "error": "Invalid session state" }.
```

**Tools:** Claude Code, Thunder Client.
**Done when:** Either you've skipped this phase entirely (fine — the lightweight "Mark Complete" loop
from Phase 8 covers it), or full session timing survives a pause/resume/refresh cycle with tampered
client timestamps rejected.
**Commit (only if attempted):**
`feat(focus): add session start/pause/resume/complete endpoints with server-side time clamping`
**Commit (if skipped):** nothing needed — just move on, this is expected and fine per the master doc.

---

### Phase 8 — Rewards, XP, Attributes, Streak (the core anti-cheat endpoint)
**Do:** This is the most important phase in your whole guide — `POST /api/quests/:id/complete`.
Everything in Part 7 of the master doc converges here: look up the quest by ID, confirm it belongs to
the caller and isn't already completed, compute rewards from the quest's own stored reward fields
(never from anything the client sends), apply them, evaluate the streak using server date logic, and
write an append-only `CompletionHistory` + `Transaction` row in the same operation.

**Ask Claude Code:**
```
Create app/api/quests/[id]/complete/route.js implementing docs/02_API_CONTRACT.md's
POST /api/quests/:id/complete exactly:

1. Load the quest by id, scoped to the logged-in user via RLS. If it doesn't exist or isn't theirs,
   404. If quest.status === 'completed' already, return 409 { "error": "Quest already completed" }
   without touching anything else — this is what makes double-submission from two tabs safe.
2. Compute rewards ONLY from quest.rewardXP / rewardCoins / rewardGems as already stored in the DB —
   never accept or read a reward amount from the request body.
3. Update the Character: add rewardXP to totalXP, recompute level via lib/server/xpCurve.js
   (leveledUp = true if level increased), add the category-matched attribute point
   (Intelligence/Strength/Discipline based on quest.category), add coins/gems.
4. Evaluate the streak using the SERVER's current date (new Date(), not anything from the request):
   if character.lastActiveDate was yesterday (server time), increment currentStreak; if it was today
   already, leave currentStreak unchanged; if it's more than one day ago, reset currentStreak to 1.
   Update longestStreak if currentStreak exceeds it. Update lastActiveDate to today.
5. Recompute villageTier from the new currentStreak via lib/server/villageTier.js and report
   villageTierChanged (true if it differs from what it would've been before this update).
6. Mark the quest status = 'completed', completedAt = now().
7. Insert one CompletionHistory row and one Transaction row (type: 'earn') — never update these
   tables anywhere else in the codebase.
8. Return the exact response shape from the contract, including leveledUp and villageTierChanged as
   booleans so the frontend knows when to trigger a celebration animation.

Wrap steps 3–7 so they either all succeed or none do (a Postgres transaction, or a single RPC/
stored procedure if that's cleaner) — a partial write here (e.g. XP granted but quest not marked
completed) would let a refresh re-trigger the reward.
```

**Tools:** Claude Code, Thunder Client (fire the same completion request twice in a row to confirm the
409 works — this is Part 10's "two tabs, same quest" edge case, test it here before Phase 13).
**Done when:** Completing a quest once updates XP/level/attributes/coins/gems/streak/tier correctly
and persists; completing the same quest again is rejected with 409 and changes nothing.
**Commit:**
`feat(api): add server-authoritative quest completion endpoint`
`feat(server): implement streak evaluation using server date`
`test(edge-cases): verify double-completion is rejected server-side`

---

### Phase 9 — Village Tier Engine + Decay Logic
**Do:** `getVillageTier()` already exists from Phase 3; this phase is about the decay rule from Part
3.4 — missing a day resets `currentStreak` to 0 (and therefore `villageTier` back to 1) without
touching Level/XP/Attributes/Inventory. This needs to be evaluated lazily on read (when `GET
/api/character` is called) rather than needing a scheduled job, since a free-tier hackathon project
shouldn't depend on a cron worker.

**Ask Claude Code:**
```
Update app/api/character/route.js's GET handler: before returning the character, check if
lastActiveDate is more than one calendar day before the server's current date (server time zone,
date-only comparison, not a raw timestamp diff that could be thrown off by time-of-day). If so, reset
currentStreak to 0 in the same request (persist this to the DB) — do NOT touch level, totalXP,
intelligence, strength, discipline, coins, gems, or inventory. Recompute villageTier from the
now-zeroed streak before returning. Add a code comment explaining this is intentionally evaluated
lazily on read rather than via a scheduled job, since the free tier doesn't include one.
```

**Tools:** Claude Code, Thunder Client (manually set `lastActiveDate` a few days back in the Supabase
Table Editor to test decay without waiting real days).
**Done when:** Advancing `lastActiveDate`/`currentStreak` via the completion endpoint changes tier at
the 3/7-day thresholds; manually backdating `lastActiveDate` and calling `GET /api/character` reverts
tier to 1 while everything else stays untouched.
**Commit:**
`feat(streak): implement lazy decay evaluation on character read`
`fix(streak): correct day-boundary calculation to use server date`

---

### Phase 10 — Shop & Building Upgrade APIs + Sync Point
**Do:** Build `GET /api/shop/items`, `POST /api/shop/purchase`, `POST /api/shop/equip`, `GET
/api/buildings`, `POST /api/buildings/:type/upgrade`. Every purchase/upgrade re-reads the character's
current balance inside the same request before deciding pass/fail — never trust a balance the client
displays.

**Ask Claude Code:**
```
Create app/api/shop/items/route.js (GET: join ShopItem catalog with the user's Inventory to mark
owned/equipped per docs/02_API_CONTRACT.md), app/api/shop/purchase/route.js (POST: re-fetch the
character's current coins/gems from the DB inside this request, compare against the item's cost,
400 { "error": "Not enough coins" } if insufficient, otherwise deduct currency, insert an Inventory
row, insert a Transaction row type:'spend', return updated balances), app/api/shop/equip/route.js
(POST: toggle equipped on an owned cosmetic, unequip any other cosmetic of the same type first if
your Inventory model only allows one equipped item per slot), and
app/api/buildings/[type]/upgrade/route.js (POST: re-fetch current building level and coin balance
server-side, validate against the stored nextUpgradeCost, increment level, deduct coins, insert a
Transaction row).

Cosmetics and decorations never write to XP/coin/attribute fields beyond the currency deduction at
purchase time — they're display/animation flags only, per the master doc's economy rules.
```

**Sync point (~21h):** Test the full purchase → equip → refresh loop and the building upgrade with
Member A live, on real data. **Merge `dev` → `main`** per the git workflow (named milestone).
**Tools:** Claude Code, Thunder Client, sync call with Member A.
**Done when:** A purchase correctly rejects when underfunded, succeeds and persists when affordable,
and the building upgrade persists after refresh.
**Commit:**
`feat(api): add shop items, purchase, and equip endpoints`
`feat(api): add building upgrade endpoint with server-side balance check`

---

### Phase 11 — Auth & Security Hardening
**Do:** Confirm every route is actually protected (a request with no session should 401, not 500 or
leak data), add basic rate limiting to the reward-granting endpoints (completion, purchase, upgrade)
so rapid repeated clicks can't be abused even before the frontend's debounce kicks in, and handle
expired sessions gracefully (a clear 401 the frontend can catch and redirect on, never a raw stack
trace per the contract's error shape).

**Ask Claude Code:**
```
Audit every file in app/api/ and confirm each handler checks for a valid session before doing
anything else, returning 401 { "error": "Not authenticated" } immediately if not (don't rely on RLS
alone to fail silently into an empty result — an explicit check gives the frontend a real status code
to redirect on). Add a simple in-memory or Supabase-backed rate limit (e.g. max 10 requests per 10
seconds per user) specifically on the quest completion, shop purchase, and building upgrade routes.
Tell me which approach you used and why, since I want to be able to explain this in a demo Q&A.
```

**Tools:** Claude Code, Thunder Client (send a request with a stripped/expired auth cookie and confirm
a clean 401, not a crash), sync call with Member A.
**Done when:** A user can only see/modify their own data (re-verify this manually once more here, not
just in Phase 2); a tampered client request claiming extra XP is rejected server-side; expired
sessions produce a 401 the frontend can redirect on cleanly.
**Commit:**
`feat(security): add explicit auth checks to all api routes`
`feat(security): add basic rate limiting to reward-granting endpoints`
`fix(api): return clean 401 on expired session instead of 500`

---

### Phase 12 — Robustness Pass (Part 10 edge cases, your side)
**Do:** Work through the "must test" and "time-permitting" rows from Part 10 that are backend-owned:
network-drop-mid-completion (your 409/atomic-transaction work from Phase 8 already covers this —
re-verify), two-tabs-same-quest (already covered, re-verify), manually edited client request to
inflate XP (re-verify the completion endpoint ignores any reward field in the body), rapid repeated
clicks (covered by Phase 11's rate limit + your idempotent 409 check), session expiry (covered by
Phase 11).

**Ask Claude Code:**
```
Write a short test checklist (as a markdown file, docs/backend-test-checklist.md) I can walk through
manually with Thunder Client covering: empty task title, double quest completion, tampered reward
payload in a completion request body, insufficient-balance purchase, expired session on a protected
route, and a request for another user's quest ID. For each, note the expected status code and
response shape from docs/02_API_CONTRACT.md.
```
Then actually run through it and fix anything that fails.

**Tools:** Claude Code, Thunder Client.
**Done when:** Every "must test" backend-relevant row from Part 10 passes; the checklist file exists
in the repo as evidence of the process for judges/your own reference.
**Commit:**
`docs(testing): add backend edge case test checklist`
`fix(api): [whatever the checklist walkthrough caught, if anything]`

---

### Phase 13 — Deploy Verification & Demo Support
**Do:** Confirm the production Supabase connection works from the deployed Vercel URL (not just
locally) — this is the #1 disqualifying-adjacent failure mode ("backend/DB not connected in
production"). Double check env vars are set in Vercel, RLS is on for every table, and the seed data
(NPC quests, shop catalog) exists in the production DB, not just wherever you were testing locally.

**Steps:**
1. Open the live Vercel URL in an incognito window (same as Member A's verification step) and
   complete one full quest end-to-end for real — this exercises the entire chain: auth → RLS →
   completion endpoint → streak → tier → DB write → persisted read.
2. In the Supabase dashboard, confirm `CompletionHistory` and `Transaction` both have a new row after
   that test completion, and that RLS is enabled (green toggle) on every user-owned table.
3. Be available while Member A records the demo in case anything in the live flow needs a fast fix —
   this hour is verification/support, not new feature work.

**Tools:** Vercel dashboard, Supabase dashboard, incognito browser window.
**Done when:** Live URL's full reward loop works end-to-end against the production database; RLS
confirmed on for every table in production, not just locally.
**Commit:** (verification phase, but if something breaks)
`fix: [whatever broke in the production incognito walkthrough]`

---

### Phase 14 — Stretch (only if everything above is done and stable)
**Do (pick based on leftover time, cheapest first):** a 4th village tier's threshold logic (art is
Member A's job, but the `getVillageTier()` threshold change is yours), richer Focus Mode endpoints if
Phase 7 was skipped earlier and you now have hours to spare, or a small transaction-history read
endpoint if Member A wants to surface one in the profile screen. A stable Core MVP beats a
half-finished stretch feature — don't start something here you can't finish.
**Commit:** `feat(stretch): [whatever you added]`

---

## 4. Your hour-by-hour schedule

| Hour | Phase | Focus |
|---|---|---|
| 0–1 | 0 | Together: scaffold repo. You: Supabase project, env vars (local + Vercel), supabase clients, `CLAUDE.md`. |
| 1–3 | 1 | Full schema.sql + seed.sql, run in Supabase SQL Editor. |
| 3–6 | 2 | RLS policies for every user-owned table; manually verify cross-user isolation. |
| 6–9 | 3 | XP curve helper, village tier helper, Character GET/POST API. |
| 9–10 | 4 | Buffer: get ahead on Quest API, or build your Thunder Client test collection. |
| 10–12 | 5 | Quest CRUD + accept flow API. |
| 12–14 | 6 | Harden Task CRUD, length caps, **sync + merge `dev`→`main`**. |
| 14–16 | 7 | Focus Mode backend (optional; skip if behind). |
| 16–18 | 8 | **The big one:** server-authoritative quest completion — XP/attributes/coins/gems/streak/tier, atomic write. |
| 18–19:30 | 9 | Village tier decay logic (lazy evaluation on read). |
| 19:30–21 | 10 | Shop + building upgrade APIs, **sync + merge `dev`→`main`**. |
| 21–22 | 11 | Auth hardening, rate limiting, session expiry handling. |
| 22–23 | 12 | Backend robustness pass against Part 10 edge cases. |
| 23–23:30 | 13 | Production verification, support live demo recording, **merge `dev`→`main`**. |
| 23:30–24 | 14 | Stretch, only if stable. |

**Default plan:** you're rarely blocked on Member A — most of your phases are pure API/DB work they
consume once ready. The one place you *are* dependent on them is nothing structural; if you finish a
phase early, pull from Phase 14's stretch list or reinforce your Phase 12 test checklist rather than
sitting idle.

---

## 5. Sync points with Member A

| Hour | What to check together |
|---|---|
| ~10 | Character creation works end-to-end (real or confirm both still mocking) — 15-minute check-in. |
| ~14 | Task/Quest CRUD fully working both sides. **Merge `dev` → `main`.** |
| ~18–19:30 | Full reward loop: complete a quest, watch XP/attributes/coins/streak/tier all update correctly in the real UI. This is the core gameplay loop — don't skip testing it together. |
| ~21 | Shop + building upgrade both working. **Merge `dev` → `main`.** |
| ~23–23:30 | Final walkthrough on the real deployment. **Merge `dev` → `main`.** Support demo recording. |

---

## 6. Git commit cheat sheet (your scope)

```
feat(schema): add full data model per master doc part 6
feat(security): add row level security policies for all user tables
feat(api): add server-authoritative quest completion endpoint
feat(server): implement streak evaluation using server date
fix(streak): correct day-boundary calculation to use server date
feat(api): add shop purchase endpoint with server-side balance check
refactor(shop): extract purchase validation into lib/server
docs(testing): add backend edge case test checklist
test(edge-cases): verify double-completion is rejected server-side
chore(supabase): add admin and server supabase clients
```
Scope = the area touched (`api`, `schema`, `security`, `streak`, `shop`, `auth`, `focus`, `server`).
Commit after every route, table, or fix — not one giant commit at the end of a phase. Aim for roughly
20–35 commits over the 24 hours, spread across the hours you actually worked.

---

## 7. If something breaks

| Symptom | Likely cause |
|---|---|
| Works locally, 500s in production | Missing env var in Vercel's Project Settings, not just `.env.local`. Check the Vercel function logs. |
| A route returns data for the wrong user | RLS policy missing or malformed on that table — re-check Phase 2, don't just patch it with an application-level `WHERE` clause. |
| Double-completion sneaks through | The 409 check and the reward write aren't in the same atomic transaction — a race between two near-simultaneous requests can slip past a check-then-write done as two separate steps. |
| Streak doesn't reset after a missed day | Date comparison is using a raw timestamp diff instead of a calendar-date diff in server time — a completion at 11:58pm and a check at 12:02am the "next" day are less than 24 hours apart but should still count as different days. |
| Frontend says a field is `undefined` | Response shape drifted from `02_API_CONTRACT.md` — diff your actual JSON response against the contract field by field before assuming it's a frontend bug. |
| Purchase succeeds but coins don't deduct (or vice versa) | Balance check and balance write aren't wrapped in the same transaction — same class of bug as the double-completion race above. |

---

## 8. Pre-submission checklist (your slice)

- [ ] Public GitHub repo — `supabase/` folder present with `schema.sql`, `seed.sql`, `policies.sql`
- [ ] Signup/login functional and scoped per-user (RLS confirmed in production, not just locally)
- [ ] Character creation persists via `POST /api/character`, idempotent on retry
- [ ] Quest CRUD persists; empty-title validation rejects before any DB write
- [ ] Quest completion is server-authoritative: rewards come only from the stored quest record, never
      the request body; a manually tampered request is rejected
- [ ] Leveling is non-linear (`lib/server/xpCurve.js`)
- [ ] Streak evaluated using server time; resets correctly on a missed day; village tier computed
      server-side from streak, never a stored client-editable value
- [ ] Character Level/XP/Attributes/Inventory never lost on a streak reset
- [ ] Shop purchases and building upgrades validated against the server-side balance at request time
- [ ] `CompletionHistory` and `Transaction` are append-only (no UPDATE/DELETE anywhere in the codebase)
- [ ] Double-completion (two tabs) rejected with `409`, no double reward
- [ ] Basic rate limiting on completion/purchase/upgrade endpoints
- [ ] Expired session returns a clean `401`, never a raw stack trace
- [ ] Everything above survives a full page refresh and a fresh production deploy
- [ ] Backend edge-case test checklist (`docs/backend-test-checklist.md`) completed
- [ ] *(Optional, only if attempted)* Focus Mode session timing is clamped against real wall-clock
      time and rejects implausible deltas
