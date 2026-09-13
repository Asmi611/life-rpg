# Life RPG

A full-stack Life RPG web app that turns real tasks into an RPG progression system — a village grows as you build real-life habits and complete quests. Built for [hackathon name] in 24 hours.

**Live app:** https://life-rpg-beryl.vercel.app

## Stack

- **Framework:** Next.js 16 (App Router, JavaScript)
- **Database + Auth:** Supabase (Postgres + built-in email/password auth + Row Level Security)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS

## Architecture

- `app/(game)/` — player-facing screens (welcome, character select, village, quest, shop)
- `app/api/` — server routes (character, quests, shop, buildings). All reward-affecting logic (XP, coins, gems, streaks, village tier) is computed **server-side only** — the client never sends a reward amount, only an action (e.g. "I completed quest 123").
- `lib/client/` — frontend fetch wrappers and Supabase client
- `lib/server/` — XP curve, streak calculation, village tier calculation, rate limiting, and the admin (service-role) Supabase client used for all writes
- `supabase/schema.sql` — full database schema, RLS policies
- `supabase/seed.sql` — shop item catalog
- `supabase/seed-per-user.sql` — reference for the starter NPC quests + buildings created automatically on first character creation

## Setup (run locally)

### 1. Clone and install

```bash
git clone https://github.com/Asmi611/life-rpg.git
cd life-rpg
npm install
```

### 2. Create a Supabase project

- Create a new project at [supabase.com](https://supabase.com) (free tier is enough).
- In the Supabase SQL Editor, run `supabase/schema.sql` to create all tables, indexes, and Row Level Security policies.
- Then run `supabase/seed.sql` to seed the shop item catalog.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in the three values from your Supabase project (**Project Settings → API**):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=          # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # anon / public key
SUPABASE_SERVICE_ROLE_KEY=         # service_role key — server-only, never exposed to the client
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security and is used only inside `app/api/**` routes, after each route has independently verified the caller's session. Never prefix it with `NEXT_PUBLIC_` and never commit it.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Starter NPC quests and buildings are created automatically the first time you create a character in-app — no manual per-user seeding needed.

## Anti-cheat / server-authority model

- Every reward-granting endpoint (`/api/quests/:id/complete`, `/api/shop/purchase`, `/api/buildings/:type/upgrade`) recomputes rewards, balances, and costs from the database on every request — client-sent values for these fields are never trusted.
- Quest completion is race-safe: a status-guarded single `UPDATE` ensures two simultaneous completion requests (e.g. two open tabs) can't both succeed; the second receives a `409`.
- Streaks are evaluated using the server's UTC clock, not client-reported time.
- `CompletionHistory` and `Transaction` tables are append-only (no `UPDATE`/`DELETE` policy exists for any role), providing a full audit trail.
- All three reward-granting routes are additionally rate-limited (10 requests / 10s per user per route, fail-open) as a defense-in-depth layer.

## Known limitations (by design, documented in code)

- Building upgrades are implemented and fully tested on the backend (`GET /api/buildings`, `POST /api/buildings/:type/upgrade`) but do not yet have a dedicated frontend screen — planned for a post-hackathon iteration.
- Focus Mode (ambient timer screen) was scoped as optional for this build and was not implemented, per the project's MVP-first prioritization.
- A few sequential (non-transactional) balance checks — documented inline in `purchase/route.js`, `buildings/[type]/upgrade/route.js`, and `rateLimit.js` — have a narrow theoretical race window under heavy concurrent load; the core reward/completion logic itself remains fully race-safe.