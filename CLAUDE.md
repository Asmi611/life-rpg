@AGENTS.md

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

Ask me before assuming anything not covered above.Paste this as your first message in any new session (or save it as `CLAUDE.md` in the repo root —
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