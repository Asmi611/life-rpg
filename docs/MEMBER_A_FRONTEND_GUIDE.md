# Life RPG — Member A Guide (Frontend / UX / Game-Feel Lead)

Read `00_START_HERE.md` first if you haven't. You shouldn't need Member B's guide except at the six
**Sync Points** called out below — everything else here is self-contained. You own:

```
app/(game)/    components/    styles/    public/art/    lib/client/
```

You never touch `app/api/`, `lib/server/`, or `supabase/` — not because you can't, but because
touching them is how two people end up resolving merge conflicts in database logic at 3am. If a
screen needs a number you don't have yet, use mock data shaped like `02_API_CONTRACT.md` and move on.

---

## 0. Before hour zero: the honest version of "free tools only"

Everything below is genuinely free — except one thing worth being upfront about.

**Claude Code (the terminal tool) is not part of Claude's free plan.** It needs a Pro/Max
subscription or a pay-as-you-go Console (API) account — confirmed on Anthropic's own support site,
not a rumor. Here's the realistic path, cheapest first:

1. **Ask your hackathon organizers before paying anything.** Sponsor API credits (Anthropic, OpenAI,
   etc.) are extremely common at hackathons and often go unused because nobody asks.
2. **A brand-new Anthropic Console account** (console.anthropic.com / platform.claude.com) gets a
   one-time small free trial credit — no card, just phone verification. It's enough for a handful of
   real coding sessions if you spend it on the hard phases (Phase 3, 8, 9 below) rather than boilerplate.
3. **If either of you can get a Claude Pro plan** for the month, Claude Code is included in that
   subscription at no extra charge, sharing the same usage pool as the chat app. Smoothest option if
   it's on the table.
4. **Zero budget left? Use "Manual Mode."** Claude.ai's free chat tier costs nothing, no card, resets
   every few hours. Every "Ask Claude Code" prompt in this guide works pasted into that chat window —
   you just copy the code it gives you into your files by hand instead of it editing them for you.
   Slower, not worse.

Whichever mode you're in, install once you have access:

```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | bash
# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex
```

Then `cd` into the repo and run `claude`. Log in with your Claude credentials (not an API key) if
you're on Pro/Max, so usage draws from your subscription instead of billing per token.

---

## 1. Your tools (all free tiers, no card required)

| Tool | For | Notes |
|---|---|---|
| **Node.js 20+ LTS** | Running everything | `node -v` to check. Use [nvm](https://github.com/nvm-sh/nvm) if you need to switch versions. |
| **VS Code** | Editor | Free. Install the Tailwind CSS IntelliSense extension. |
| **Claude Code / Claude.ai** | Generating your components | See §0 above. |
| **Figma (free plan)** | Locking the design system + wireframes | Free plan covers everything you need for one project. |
| **Microsoft Designer** (designer.microsoft.com) | Village art, icons | Replaced Bing Image Creator — same DALL·E-3 engine, free tier gives **15 image credits/month**. Treat these as precious (§Phase 3). |
| **Krita** | Touch-ups, compositing tiers from one base image | Free, open source. This is how you stretch 15 credits across 3 village tiers. |
| **Squoosh.app** | Converting art to WebP | Free, browser-based, no upload-and-wait — drag, compress, download. Satisfies the "village art as WebP" performance requirement. |
| **Google Fonts via `next/font/google`** | Fraunces/Cinzel Decorative + Nunito/Quicksand | Next.js self-hosts and sets `font-display: swap` automatically — zero manual config needed for that performance requirement. |
| **Chrome DevTools + Lighthouse** | Perf/SEO/accessibility audit | Built into Chrome, free. |
| **axe DevTools** (Chrome extension) | Accessibility scanning | Free. |
| **WebAIM Contrast Checker** (webaim.org/resources/contrastchecker) | WCAG AA contrast checks | Free, no signup. |
| **Vercel (Hobby plan)** | Hosting | Free forever for personal/non-commercial use — a hackathon submission qualifies. 100GB bandwidth/month, single dev seat. |
| **OBS Studio** or your OS's built-in recorder | Demo video | Free. |

---

## 2. Working with Claude Code: your house-style preamble

Paste this as your first message in any new session (or save it as `CLAUDE.md` in the repo root —
Claude Code auto-loads that file, so you stop re-explaining context every session):

```
You're working on "Life RPG," a hackathon web app: Next.js (App Router, JavaScript), Tailwind CSS,
the `motion` package for animation, Supabase for auth/DB. I'm the frontend/UX developer on a
2-person team. My teammate owns app/api/, lib/server/, and supabase/ — I never touch those. I own
app/(game)/, components/, styles/, public/art/, and lib/client/.

Design tokens — use ONLY these, no arbitrary hex or px values:
- Colors: parchment #F5EAD8 (bg), dusk #2B2440 (optional dark/Focus Mode), xp-amber #F2B84B,
  intelligence-teal #5FB0A6, strength-coral #E8785A, discipline-sage #8FA66B, coin-gold #D9A441,
  gem-violet #8C6FD1, streak-rust #B95C4A (bad-news color — stays in-theme, never a harsh system red).
- Type scale: 12/14/16/20/28/40px only.
- Spacing: 4px base unit (4/8/12/16/24/32/48).
- Radius: 12px cards/panels, 24px buttons/pills, 999px avatars/coin icons.
- Motion: 120ms ease-out micro-interactions, 400ms spring reward pops (slight overshoot), 250ms
  ease-in-out screen transitions, 800–1200ms level-up/tier celebrations. Everything respects
  prefers-reduced-motion — provide a reduced variant, don't just disable it silently.

Every screen is built against mock data shaped EXACTLY like docs/02_API_CONTRACT.md. Never invent a
different response shape — my teammate's real endpoints will return this shape and I don't want to
rewire the whole component when we plug them in.

Every interactive element is a real <button> or <a>, never a bare <div onClick>. Every one needs a
visible focus-visible ring and, where it's not obvious from visible text, a descriptive aria-label
(e.g. "Academy — Intelligence quests, 2 available", not "Building 1"). Nothing below 44×44px as a
touch target. Test everything down to a 360px viewport — that's our highest responsive risk.

I never calculate XP, coins, gems, streaks, or villageTier anywhere in my code — that's server-side,
my teammate's job. I only ever render numbers that came back from an API response, or for now, a
mock object shaped like one.

Ask me before assuming anything not covered above.
```

**Prompting habits that keep the output reviewable:**
- Ask for one screen or one component per prompt, not "build the whole game." You need to read every
  diff before committing — partly for the demo Q&A, mostly because judges can tell when nobody
  understands their own code.
- If output drifts from the API contract shape, quote the exact contract field back at it rather than
  saying "fix it."
- Explicitly ask it to justify accessibility choices (aria-label wording, focus order, tab sequence)
  instead of accepting them silently — this is where hackathon teams quietly lose Accessibility points.

---

## 3. Phase-by-phase

### Phase 0 — Project Setup (shared, then your slice)
**Do:** Run the scaffold commands from `01_GIT_WORKFLOW.md §2` together with Member B. Once the repo
exists and you're on `feature/frontend`:
- Extend `tailwind.config.js` with the design tokens above (colors, spacing, radius, font families as
  theme extensions, not new utility classes — keeps Claude Code's output consistent later).
- Set up fonts via `next/font/google` in `app/layout.jsx` (Fraunces or Cinzel Decorative for display;
  Nunito or Quicksand for body).
- `npm install motion lucide-react` (animation + icons — see §Note below on the package name).
- Create the Vercel project: log into vercel.com with GitHub, import the repo, confirm the default
  Next.js page deploys. This becomes your `main`-branch auto-deploy target for the rest of the build.
- Install Claude Code or set up your Claude.ai account per §0.
- Draft the top half of `CLAUDE.md` at the repo root (your preamble from §2) — leave a `---` and a
  note for Member B to append their half.

> **Note on `motion`:** Framer Motion was renamed — the package is now `motion`, imported from
> `motion/react` (e.g. `import { motion, AnimatePresence } from "motion/react"`). The old
> `framer-motion` package still installs and still works, but isn't actively maintained anymore, so
> use `motion` from the start.

> **Note on Next.js version:** the scaffold command in `01_GIT_WORKFLOW.md` uses
> `create-next-app@latest`, which today installs Next 16.x, not literally "14" as the stack table
> says (14 is past its support window). This is fine — the App Router APIs this whole plan is built
> on (`page.jsx`, `route.js` handlers, `layout.jsx`) are unchanged across 14→16. Don't chase a
> specific version number; just don't manually pin back to 14.

**Tools:** Node, VS Code, Vercel, Claude Code/Claude.ai.
**Done when:** Repo runs locally with `npm run dev`, default page is live on a Vercel URL, `CLAUDE.md`
exists with your section filled in.
**Commit:**
`chore: scaffold Next.js app with Tailwind` (shared)
`feat(config): add design tokens to tailwind config`
`chore: connect vercel deployment`
`docs: add CLAUDE.md project memory`

---

### Phase 1 — Design Reference & Direction
**Do:** Open Figma (free plan). Build one page of token specimens (color swatches with hex labels,
type scale samples, spacing ruler, corner-radius examples, button states: default/hover/focus-visible/
active/disabled/loading). Then low-fidelity wireframe all 9 Core screens from the master doc's Part 5
using those tokens. If you're not confident sketching layouts cold, ask Claude (chat is fine, this
isn't a coding task) to describe 2–3 layout directions for a "cozy village RPG hub screen" in words —
translate whichever resonates into Figma yourself.
**Tools:** Figma, optionally Claude.ai chat for layout inspiration.
**Done when:** All 9 Core screens have a defined visual direction using the locked tokens.
**Commit:** Figma isn't part of the repo, but export 2–3 key screens as PNG into
`docs/design-reference/` and commit those — gives judges (and Claude Code, later, as a visual
reference you can literally paste in) something concrete in the repo history.
`docs(design): add Figma exports for welcome, village, and shop screens`

---

### Phase 2 — Static UI Prototype (all 9 Core screens, mock data)
**Do:** Build every Core screen from Part 5 as a real route with fake data — no backend yet. Create
`lib/client/mockData.js` as the single source of mock objects, shaped exactly like
`GET /api/character` and `GET /api/quests` in the contract. Design every interactive element's
`default/hover/focus-visible/active/disabled/loading` states now, not later — retrofitting states
after Phase 8 is much slower than building them in from the start.

**Ask Claude Code:**
```
Using the house-style preamble context, scaffold these routes with realistic mock data and basic
navigation between them (no backend calls yet):

1. app/(game)/page.jsx — Welcome screen: title, one-line promise, a hero illustration placeholder
   (I'll swap in real art later), a "Start Journey" button linking to /select-character.
2. app/(game)/select-character/page.jsx — gender toggle (male/female) + name text input + "Begin"
   button. For now, "Begin" just stores the choice in local component state and routes to /village.
3. app/(game)/village/page.jsx — leave this mostly empty for now, just a HUD placeholder bar (level,
   XP bar, coins, gems, streak, village tier) reading from lib/client/mockData.js — full village
   scene comes in Phase 3.
4. app/(game)/quest/[id]/page.jsx — Active Quest screen: quest title/description from mock data,
   "Start" and "Mark Complete" buttons (no-ops for now).
5. app/(game)/shop/page.jsx — grid of item cards from mock shop data (name, cost, owned/equipped
   badge), no purchase logic yet.
6. app/(game)/profile/page.jsx — level, XP, three attribute bars (Intelligence/Strength/Discipline),
   streak, village tier, from mock character data.

Also build a reusable components/village/QuestPanel.jsx (NPC name, quest description, reward
preview, Accept button) and components/ui/RewardOverlay.jsx (empty shell for now — XP/coins/gems/
level-up display comes in Phase 8).

Every button is a real <button>/<a>, every one has visible focus-visible styling. Use the Tailwind
tokens from the config, nothing arbitrary.
```

**Tools:** Claude Code, VS Code.
**Done when:** Every Core screen is navigable end-to-end with fake data and looks visually coherent.
**Commit:** one commit per screen keeps history readable and gives you real checkpoints —
`feat(welcome): build welcome screen with mock hero art`
`feat(character-select): build gender + name selection screen`
`feat(village): add HUD placeholder with mock character stats`
`feat(quest): build active quest screen with start/complete actions`
`feat(shop): build shop grid from mock item data`
`feat(profile): build profile screen with attribute bars`

---

### Phase 3 — Village Scene & Hotspots
**Do:** Generate the Tier-1 (Hamlet) village background in Microsoft Designer. Since the free tier
gives only 15 credits/month, spend the first few on **one strong base scene** rather than many
variations — pick your favorite of the 4 results per generation and refine the prompt rather than
regenerating from scratch. Save the raw output, then open it in Krita to clean up (fix any obvious AI
artifacts, add transparent regions if you want hotspot props to layer separately). Export as WebP via
Squoosh, sized reasonably for both mobile and desktop (don't ship a 4000px source image).

Build the Village screen for real: 5 clickable hotspots as `<button>` elements positioned over the
background, each opening the `QuestPanel` from Phase 2. Test the 360px width immediately — this is
called out in the master doc as the highest responsive-risk element, and it's much cheaper to fix now
than after Phase 9 adds two more background images on top of a broken layout.

**Ask Claude Code:**
```
Build the real app/(game)/village/page.jsx using public/art/village-tier-1.webp as the background
(I've added this file myself). Position 5 hotspots as absolutely-positioned real <button> elements
over the image, using percentage coordinates so they scale with the image:
- Academy (Intelligence) — top:20%, left:15%
- Training Ground (Strength) — top:30%, left:70%
- Farm/Garden (Discipline) — top:65%, left:20%
- Library (Intelligence) — top:15%, left:55%
- Workshop (Discipline) — top:70%, left:75%
(Treat these as starting placeholders — I'll fine-tune the exact coordinates once I see it rendered.)

Each hotspot needs: a minimum 44×44px hit area, a visible focus-visible ring, an aria-label like
"Academy — Intelligence quests, 2 available" (read the count from mock quest data for now), and on
click, opens the QuestPanel component from components/village/QuestPanel.jsx with a 250ms
ease-in-out transition using the motion package.

Add the HUD bar across the top (level, XP progress bar, coins, gems, streak, village tier) from mock
data. Respect prefers-reduced-motion for any hover/entrance animation on the hotspots.

Make sure this renders cleanly at 360px width — test breakpoints at 360/768/1024/1440px.
```

**Tools:** Microsoft Designer, Krita, Squoosh, Claude Code.
**Done when:** Clicking any hotspot opens the correct quest panel; renders cleanly at all four
breakpoints, verified at 360px specifically.
**Commit:**
`feat(village): add tier-1 hamlet background art`
`feat(village): add 5 accessible hotspot buttons`
`fix(village): correct hotspot layout at 360px breakpoint`

---

### Phase 4 — Character Setup
**Do:** Build the real Character Select flow. Call `supabase.auth.signUp` directly from this screen
(per `02_API_CONTRACT.md`, auth has no custom API route — you call the Supabase JS client straight
from the frontend). After signup succeeds, call `POST /api/character` with the chosen name/gender.

**Check your sync point:** by this hour, Member B's Character API should be live in `dev` (see
§Sync Points). If it is, wire this for real. If it isn't yet, keep the Phase 2 mock and note a
`// TODO: swap to real POST /api/character` comment — you are never blocked waiting on them.

**Ask Claude Code:**
```
Update app/(game)/select-character/page.jsx: on "Begin," call supabase.auth.signUp with an
email/password form (add those two fields to the screen) if the user isn't logged in yet, then POST
to /api/character with { name, gender } per docs/02_API_CONTRACT.md. Show a loading state on the
button while both calls are in flight, and a toast-style error message using the contract's
{ "error": "..." } shape if either fails. On success, route to /village. Keep this behind a feature
flag / easy revert — I want to be able to fall back to the Phase 2 mock instantly if the backend
isn't ready yet: use a constant like USE_MOCK_AUTH at the top of the file.
```

**Tools:** Claude Code, Supabase JS client (already a dependency once installed in Phase 0).
**Done when:** A new player's chosen name/gender persists across a refresh (once wired for real) or
behaves identically with mocks (if not yet wired).
**Commit:**
`feat(character-select): wire signup and character creation to API`
`chore(character-select): add mock/real data toggle`

---

### Phase 5 — NPC Dialogue / Quest Flow
**Do:** Wire the `QuestPanel` component to `GET /api/quests` (or mock, per your sync-point check) and
implement "Accept" calling `PATCH /api/quests/:id` with `{ status: "accepted" }`.

**Ask Claude Code:**
```
Wire components/village/QuestPanel.jsx to fetch real quest data from GET /api/quests (fall back to
mock data behind the same USE_MOCK_AUTH-style flag if the endpoint isn't live yet). "Accept" calls
PATCH /api/quests/:id with { status: "accepted" } and then routes to /quest/[id]. Handle the
{ "error": "..." } shape from the contract in a toast, never a raw error dump.
```

**Tools:** Claude Code.
**Done when:** Clicking a hotspot shows that NPC's real (or realistically mocked) quest, and Accept
routes into the Active Quest screen.
**Commit:** `feat(village): wire quest panel to accept flow`

---

### Phase 6 — Task CRUD (frontend)
**Do:** Build the custom-task creation form, task list, edit, and delete UI. Add empty-title
validation on the client (in addition to the server-side check Member B is building) so the person
gets instant feedback instead of a round trip.

**Ask Claude Code:**
```
Build a task creation form (title, description, category select: Intelligence/Strength/Discipline)
somewhere reachable from the village screen (a "+" button in the HUD is fine). Client-side: reject
empty or whitespace-only titles with an inline error, no request sent. On submit, POST to
/api/quests per the contract. Build a simple task list (could live on the profile screen or its own
section) showing the user's custom quests with edit and delete actions, wired to PATCH and DELETE
/api/quests/:id. Deleting an NPC-sourced quest should be impossible from the UI (hide the delete
button when source === "npc") since the backend rejects it with 403 anyway — no point showing a
button that always fails.
```

**Tools:** Claude Code.
**Done when:** Tasks survive a refresh (once wired) and can be edited/deleted; empty-title is caught
before any request fires.
**Commit:**
`feat(tasks): add custom task creation form with client validation`
`feat(tasks): add task list with edit and delete`

---

### Phase 7 — Focus Mode (Optional — build the lightweight version, stop there unless way ahead)
**Do:** Per the master doc, this is genuinely optional. Build **only**: one static themed
illustration for the active quest, and a single "Mark Complete" button. No pause/resume/switch, no
Wake Lock, no ambient audio unless you're significantly ahead of schedule — and if you do add audio,
it's one looping track with a mute toggle, nothing more.

**Ask Claude Code:**
```
Add a lightweight Focus view inside app/(game)/quest/[id]/page.jsx (a toggled state, not a new
route): when the user clicks "Start," swap to a full-screen static illustration for that quest's
category with a single "Mark Complete" button. That's it — no timer, no pause, no session state.
"Mark Complete" calls POST /api/quests/:id/complete per the contract and shows the reward overlay
(stub is fine for now — real version comes in Phase 8).
```

**Tools:** Claude Code, Microsoft Designer (if you want a themed illustration — otherwise reuse
existing village art cropped/recolored in Krita to save credits).
**Done when:** A quest can be marked complete from this screen without breaking the core loop if you
skip it entirely.
**Commit:** `feat(focus): add lightweight focus screen with mark-complete action`
**If you're behind schedule:** skip this phase completely and move to Phase 8. The core loop works
identically without it — the master doc is explicit that this trades against Core MVP hours and isn't
worth it if you're not ahead.

---

### Phase 8 — Reward Overlay, HUD, Level-Up Celebration
**Do:** This is where the game starts feeling like a game. Build the real `RewardOverlay`: XP gain,
coin/gem gain, the relevant attribute bar animating up, streak counter, and — conditionally — a
level-up or village-tier-change celebration sequence. All values come from the response of
`POST /api/quests/:id/complete`, never computed client-side.

**Ask Claude Code:**
```
Build the real components/ui/RewardOverlay.jsx driven entirely by the response shape from
POST /api/quests/:id/complete in docs/02_API_CONTRACT.md (rewards.xp/coins/gems, character.level,
character.leveledUp, character.currentStreak, character.villageTierChanged, etc.). Sequence:
1. Reward pop-in (400ms spring with slight overshoot) showing +XP / +coins / +gems.
2. The relevant attribute bar (Intelligence/Strength/Discipline, based on the completed quest's
   category) animates to its new value.
3. If character.leveledUp is true, play a level-up celebration (800–1200ms sequenced) before
   dismissing.
4. If character.villageTierChanged is true, chain a second celebration beat announcing the village
   upgraded (or, on a streak break, that it reverted to Hamlet — same rust-colored but still
   in-theme, not alarming).
Update the HUD bar (level/XP/coins/gems/streak/tier) live from the same response — don't require a
page refresh to see new values. Add a polite aria-live region that announces the reward and any
streak/tier change for screen reader users. Everything respects prefers-reduced-motion — provide a
simple fade/instant-update fallback, don't just skip the update.
```

**Tools:** Claude Code.
**Done when:** Completing a quest (real or mocked) visibly updates XP/attributes/coins/gems/streak
and correctly triggers level-up and tier-change celebrations when applicable.
**Commit:**
`feat(rewards): build reward overlay with animated XP/coin/gem gains`
`feat(hud): live-update HUD from quest completion response`
`feat(a11y): add aria-live announcements for rewards and streak changes`

---

### Phase 9 — Village Tier Visual Swap
**Do:** Generate Tier 2 and Tier 3 backgrounds. **Don't burn fresh Designer credits on full
regenerations** — duplicate your Tier-1 Krita file and paint in the additional decorations/upgraded
building layer/prop density called for in the master doc's Part 3.4 table. This guarantees visual
continuity (same art style, same building placement) across tiers, which three independent
generations can't reliably guarantee, and it costs zero extra credits. Wire the village background
to swap based on `character.villageTier` from the API (or mock).

**Ask Claude Code:**
```
Update app/(game)/village/page.jsx to pick the background image based on villageTier: 1 →
village-tier-1.webp, 2 → village-tier-2.webp, 3 → village-tier-3.webp. Cross-fade between them
(respecting prefers-reduced-motion — instant swap if so) when the tier changes, driven by the
villageTierChanged flag from a completion response, not by polling. Lazy-load tiers that aren't
currently shown, per the perf notes in the master doc.
```

**Tools:** Krita, Squoosh, Claude Code.
**Done when:** Reaching streak 3 and streak 7 visibly changes the village scene; breaking a streak
visibly reverts it to Hamlet.
**Commit:**
`feat(village): add tier-2 and tier-3 village art`
`feat(village): wire background swap to villageTier`

---

### Phase 10 — Shop & Building Upgrade UI
**Do:** Build the shop grid for real (3 cosmetics + 3 decorations), purchase and equip actions, and
the one building-upgrade card (Academy Lv.1 → Lv.2).

**Ask Claude Code:**
```
Wire app/(game)/shop/page.jsx to GET /api/shop/items. Each card shows name, cost (coins or gems
icon), and owned/equipped state. "Purchase" calls POST /api/shop/purchase with { itemId } — on the
{ "error": "Not enough coins" } response, show that message in a toast, don't just fail silently.
"Equip" (only shown for owned cosmetics) calls POST /api/shop/equip. Add a small
components/village/BuildingUpgradeModal.jsx, opened from the village screen when clicking an
upgradeable building, showing GET /api/buildings data (current level, next upgrade cost) with an
Upgrade button calling POST /api/buildings/:type/upgrade, same error-toast pattern.
```

**Tools:** Claude Code.
**Done when:** A purchased/equipped item and the building upgrade both persist after a refresh.
**Commit:**
`feat(shop): wire purchase and equip to real API`
`feat(village): add building upgrade modal`

---

### Phase 11 — Auth Screens, Full Wiring, Integration Test
**Do:** Build login/logout, protect the game routes (redirect to login if there's no session), and
handle token expiry gracefully (redirect to login, not a blank screen — this is a "must test" edge
case in the master doc). This is also your **hard deadline** for swapping any remaining mock data to
real endpoints — by now Member B's full API surface should be live.

**Ask Claude Code:**
```
Add a login screen (email/password via supabase.auth.signInWithPassword) and a logout action
(supabase.auth.signOut) somewhere reachable from the profile screen. Add a client-side guard (a
layout-level check or middleware) that redirects to /login if there's no active Supabase session for
any route under app/(game)/ except the welcome and login screens themselves. On any API call that
returns a 401 (session expired), redirect to /login with a "please log in again" message instead of
showing a blank or broken screen.
```

Then: **merge with Member B** (see Sync Point 5) and walk through the full demo flow from the master
doc's Part 13, together, on the actual deployed `dev`/`main` build — not localhost. Fix whatever
breaks. This is the single most valuable hour of the whole build.

**Tools:** Claude Code, Supabase JS client.
**Done when:** A user can only see their own data, a tampered/expired session redirects cleanly, and
the full Part 13 demo flow works end-to-end on the real deployment.
**Commit:**
`feat(auth): add login and logout screens`
`feat(auth): protect game routes and handle session expiry`

---

### Phase 12 — Polish & Accessibility
**Do:** This is cheap to do right at this stage and expensive to retrofit later — the master doc says
so and it's correct. Work through:
- Contrast: run every text/background pair through WebAIM's checker against your **final** hex
  values (not the ones in this doc — check what actually shipped).
- Full keyboard pass: tab through every screen, confirm nothing is unreachable, confirm focus order
  is logical.
- Run axe DevTools on every Core screen, fix what it flags.
- Add the "Skip to main content" link as the first focusable element on every screen.
- Confirm `prefers-reduced-motion` is respected everywhere you added motion (Phases 3, 8, 9).
- Responsive pass at 360/768/1024/1440px on every screen, not just the village scene this time.
- Run Lighthouse on the Welcome screen specifically (it's the only public, non-auth-gated screen —
  that's where SEO is judged). Target Performance ≥75, Accessibility ≥90, SEO ≥80 — a full 90+ across
  the board is a nice-to-have, not worth spending your last hours chasing.

**Ask Claude Code:**
```
Audit app/(game)/ for accessibility: confirm every interactive element is a real button/link with a
visible focus-visible ring, every image has meaningful alt text (or empty alt="" if purely
decorative), the skip-link is the first focusable element on every page, and heading levels are
sequential (one h1 per page) rather than skipped or duplicated. Flag anything that doesn't meet WCAG
AA contrast at these final colors: [paste your final hex values here]. Don't fix silently — tell me
what you found and why, then I'll approve the fixes.
```

**Tools:** WebAIM Contrast Checker, axe DevTools, Chrome Lighthouse, Claude Code.
**Done when:** The app feels finished on mobile and desktop and is fully operable by keyboard alone;
Lighthouse targets met on Welcome.
**Commit:**
`fix(a11y): add skip link and fix focus order`
`fix(a11y): correct contrast on streak-rust text over parchment`
`style: responsive polish pass at 360/768/1024/1440px`

---

### Phase 13 — Deploy Verification & Demo Video
**Do:** Confirm the `main` branch (auto-deployed by Vercel per the git workflow) works end-to-end in
an **incognito window** — this catches "works on my machine because I'm still logged in" bugs.
Record the 90–180 second demo covering the master doc's Part 13 flow. Whoever's more comfortable
narrating the UX should drive, but both of you should be visible in commit history either way.

**Steps:**
1. Open the live Vercel URL in an incognito/private window.
2. Walk the full Part 13 flow once, silently, to confirm nothing's broken.
3. Set up OBS Studio (or your OS recorder) — screen capture + mic.
4. Record: sign up → create hero → enter village (Hamlet, streak 0) → accept an Academy quest →
   complete it → reward overlay → level up → (simulate streak 3 by completing quests across
   sessions, or note this is sped up for the demo) → village upgrades to Tier 2 → shop purchase +
   equip → building upgrade → refresh the page to prove persistence.
5. Keep it under 180 seconds. Trim in OBS or any free editor if you run long.

**Tools:** Vercel, OBS Studio, incognito browser window.
**Done when:** Live URL verified working in incognito; demo video recorded, 90–180s, covers the full
Part 13 flow.
**Commit:** (this phase is mostly verification, not new code, but if you find last-minute bugs)
`fix: [whatever broke in the incognito walkthrough]`

---

### Phase 14 — Stretch (only if everything above is done and stable)
**Do (pick based on leftover time, cheapest first):** extra cosmetic variety, the 6th hotspot/Forest
NPC if you have Figma+art time left, richer Focus Mode if Phase 7 was simplified earlier and you now
have hours to spare. A stable Core MVP beats a half-finished stretch feature — don't start something
here you can't finish.
**Commit:** `feat(stretch): [whatever you added]`

---

## 4. Your hour-by-hour schedule

| Hour | Phase | Focus |
|---|---|---|
| 0–1 | 0 | Together: scaffold repo. You: Tailwind tokens, fonts, Vercel project, Claude Code setup, `CLAUDE.md`. |
| 1–3 | 1 | Figma: lock tokens + wireframe all 9 Core screens. |
| 3–6 | 2 | Static UI prototype: all 9 screens against mock data. |
| 6–9 | 3 | Village scene: Tier-1 art, hotspots, HUD, 360px test. |
| 9–10 | 4 | Character Select: real signup + character creation (or mock if B's not ready). |
| 10–12 | 5 | Quest panel wired to accept flow. |
| 12–14 | 6 | Task CRUD UI: create/list/edit/delete. |
| 14–16 | 7 | Focus Mode (lightweight) — or skip if behind. |
| 16–18 | 8 | Reward overlay, live HUD, level-up celebration. |
| 18–19:30 | 9 | Village tier art (2 & 3) + tier-swap logic. |
| 19:30–21 | 10 | Shop UI + building upgrade modal. |
| 21–22 | 11 | Auth screens, full real-data wiring, integration test with B. |
| 22–23 | 12 | Accessibility & responsive polish pass. |
| 23–23:30 | 13 | Deploy verification + record demo. |
| 23:30–24 | 14 | Stretch, only if stable. |

**Default plan:** stay on mock data through your own phases exactly as scheduled above — you're never
blocked waiting on Member B this way. **If you're both ahead of schedule:** swap to the real endpoint
the moment B confirms it's live in `dev` (check the sync points below every couple hours). Either
way, Phase 11 is the hard deadline where everything must be wired for real.

---

## 5. Sync points with Member B

| Hour | What to check together |
|---|---|
| ~10 | Character creation works end-to-end (real or confirm both still mocking) — 15-minute check-in. |
| ~14 | Task/Quest CRUD fully working both sides. **Merge `dev` → `main`** (milestone per `01_GIT_WORKFLOW.md`). |
| ~18–19:30 | Full reward loop: complete a quest, watch XP/attributes/coins/streak/tier all update correctly. This is the core gameplay loop — don't skip testing it together. |
| ~21 | Shop + building upgrade both working. **Merge `dev` → `main`.** |
| ~23–23:30 | Final walkthrough on the real deployment. **Merge `dev` → `main`.** Record demo. |

---

## 6. Git commit cheat sheet (your scope)

```
feat(village): add 5 clickable hotspots with aria-labels
feat(shop): wire purchase and equip to real API
feat(rewards): build reward overlay with animated XP/coin/gem gains
fix(a11y): correct contrast on streak-rust text over parchment
style(hud): adjust spacing on level/xp bar per design tokens
refactor(village): extract hotspot into its own component
docs(design): add Figma exports for welcome, village, and shop screens
chore: connect vercel deployment
test(edge-cases): verify empty task title shows inline error without a request
```
Scope = the area touched (`village`, `shop`, `hud`, `auth`, `a11y`, `rewards`, `focus`, `profile`).
Commit after every screen, component, or fix — not one giant commit at the end of a phase.

---

## 7. If something breaks

| Symptom | Likely cause |
|---|---|
| Vercel build fails but `npm run dev` works locally | Check the Vercel build log for a missing env var — Supabase keys need to be in Vercel's Project Settings → Environment Variables, not just your local `.env.local`. |
| Fonts flash unstyled then swap | Expected with `font-display: swap` — this is the correct tradeoff for performance, not a bug. |
| A component that worked against mock data breaks against real data | Almost always a shape mismatch — diff the real response against `02_API_CONTRACT.md` field by field. |
| Village art looks huge on mobile / tiny on desktop | You're likely sizing the container in px instead of using the image's intrinsic aspect ratio with percentage-based hotspot coordinates — revisit the Phase 3 prompt. |
| Designer says you're out of credits | Switch to Krita compositing on your existing base image (Phase 9's approach) rather than generating anything new. |

---

## 8. Pre-submission checklist (your slice)

- [ ] Village scene loads without crashes; hotspots functional and accessible
- [ ] Character creation works and persists
- [ ] Custom task CRUD works and persists; empty-title validation in place client-side
- [ ] Reward overlay correctly shows XP/attributes/coins/gems and triggers level-up/tier celebrations
- [ ] Village Tier art swaps correctly at streak 3 / streak 7, and reverts on a missed day
- [ ] Shop purchases and the building upgrade persist after refresh
- [ ] Responsive at 360/768/1024/1440px, village scene specifically tested at 360px
- [ ] Contrast checked (WCAG AA) against final hex values, full keyboard navigation, skip link,
      focus-visible rings, `aria-live` reward announcements
- [ ] Basic Lighthouse pass on Welcome screen (Performance ≥75, Accessibility ≥90, SEO ≥80)
- [ ] Login/logout work; expired session redirects cleanly instead of a blank screen
- [ ] Demo video recorded, 90–180s, covers the full Part 13 flow
- [ ] *(Optional)* Lightweight Focus Mode works without breaking anything else
