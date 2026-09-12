# Life RPG — Team Build Guide (Start Here)

This is the entry point. Read this file first, then only read the guide that has your name on it.
The other three files (`01_GIT_WORKFLOW.md`, `02_API_CONTRACT.md`, and your teammate's guide) are
reference material you'll dip into, not something you need to read cover-to-cover.

## 1. Roles

| | **Member A — Frontend / UX / Game-Feel Lead** | **Member B — Backend / Data / Anti-Cheat Lead** |
|---|---|---|
| Owns | Everything the user *sees and touches*: village scene, screens, animations, accessibility, responsive layout, art direction, deployment of the client | Everything that *decides what's true*: database schema, auth, XP/streak/villageTier math, shop validation, anti-cheat, API routes, deployment of the server-side logic |
| Guide file | `MEMBER_A_FRONTEND_GUIDE.md` | `MEMBER_B_BACKEND_GUIDE.md` |
| Git branch | `feature/frontend` | `feature/backend` |
| Folder ownership | `app/(game)/`, `components/`, `styles/`, `public/art/` | `app/api/`, `lib/server/`, `supabase/` |

Both of you read `02_API_CONTRACT.md` together **before writing any code** — it's the contract that
lets you both work independently without blocking each other. Member A builds every screen against
**mocked data that matches this contract**. Member B builds every endpoint to **return exactly this
shape**. When you plug them together in Phase 11, it should just work.

## 2. The stack (100% free, no subscriptions, no credit card)

| Layer | Choice | Why | Free tier |
|---|---|---|---|
| Framework | **Next.js 14 (App Router, JavaScript)** | One repo, one deploy, frontend pages + backend API routes live side by side — this is what makes clean two-person parallel work possible | Free forever |
| Styling | **Tailwind CSS** + **Framer Motion** | Fast, matches the locked design tokens, great micro-interaction support | Free, open source |
| Database + Auth | **Supabase** (hosted Postgres + built-in email/password auth + Row Level Security) | Covers "secure backend + auth" and "real database" requirements out of the box; RLS enforces "users only see their own data" at the DB level, which judges specifically look for | Free tier: 500MB DB, 50k monthly active users — plenty for a hackathon |
| Hosting (frontend + API) | **Vercel** | One-click deploy from GitHub, free SSL, free custom subdomain, serverless functions for the API routes | Free "Hobby" plan |
| Art generation | **Bing Image Creator** (Microsoft Designer, free, DALL·E-based) or **Krita** (free, open source) for touch-ups | No subscription needed, good enough for stylized game backgrounds | Free |
| Design mockups | **Figma** (free plan) | Lock the design system visually before coding | Free |
| Coding agent | **Claude Code** (used by both of you inside the same repo, on your own branch) | Both guides include ready-to-paste prompts | — |
| Testing | Browser DevTools, **Lighthouse** (built into Chrome, free), axe DevTools extension (free) for accessibility | No paid tool needed | Free |
| Video recording | **OBS Studio** (free) or Windows/Mac built-in screen recorder | 90–180s demo video | Free |

You will **not** need Firebase, AWS, Render, Railway, or any card-requiring service. Supabase + Vercel
covers 100% of the hard requirements for free.

## 3. Base repo structure (create this together in Phase 0, then split off)

```
life-rpg/
├── app/
│   ├── (game)/                  # Member A — all player-facing routes
│   │   ├── page.jsx             # Welcome screen
│   │   ├── select-character/
│   │   ├── village/
│   │   ├── quest/[id]/
│   │   ├── shop/
│   │   └── profile/
│   ├── api/                     # Member B — all server routes
│   │   ├── character/route.js
│   │   ├── quests/route.js
│   │   ├── quests/[id]/complete/route.js
│   │   ├── shop/purchase/route.js
│   │   └── buildings/[type]/upgrade/route.js
│   └── layout.jsx
├── components/                  # Member A
│   ├── ui/                      # buttons, cards, HUD, modals
│   └── village/                 # hotspot, NPC dialogue, reward overlay
├── lib/
│   ├── client/                  # Member A — fetch wrappers, mock data
│   └── server/                  # Member B — XP curve, streak calc, tier calc, supabase admin client
├── supabase/
│   ├── schema.sql                # Member B
│   └── seed.sql                  # Member B — NPC quests, shop items, buildings
├── public/art/                  # Member A — village illustrations, icons
├── docs/
│   ├── 00_START_HERE.md
│   ├── 01_GIT_WORKFLOW.md
│   ├── 02_API_CONTRACT.md
│   ├── MEMBER_A_FRONTEND_GUIDE.md
│   └── MEMBER_B_BACKEND_GUIDE.md
├── .env.example
├── README.md
└── package.json
```

Whoever sets up the repo (Phase 0, do this together, in person or on a call) creates this skeleton,
pushes it to `main`, then you both branch off it. See `01_GIT_WORKFLOW.md` for exact commands.

## 4. Golden rules (from the project doc, still true here)

1. **One quest working end-to-end beats five half-built systems.** If you're behind schedule, cut from
   the Optional layer (Focus Mode, 4th village tier, extra cosmetics) — never from the Core MVP.
2. **Server decides, client displays.** Any number that affects XP/coins/gems/streak/tier is calculated
   in `lib/server/` and written by an API route — never trust or calculate a reward on the client.
3. **Commit often, in small chunks, with real messages.** Judges read commit history. See
   `01_GIT_WORKFLOW.md` §3 for the convention — this also happens to be exactly how a real dev works.
4. **Refresh the page after every feature.** If it doesn't survive a refresh, it isn't done.
