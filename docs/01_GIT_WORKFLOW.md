# Git & Repo Workflow

## 1. Branch model

```
main                 ← always deployable, protected, judges see this
 └── dev              ← daily integration branch, both merge here first
      ├── feature/frontend   ← Member A works here almost exclusively
      └── feature/backend    ← Member B works here almost exclusively
```

- Nobody commits directly to `main`. `main` only receives merges from `dev` at milestones
  (end of Phase 6, end of Phase 10, end of Phase 13).
- `dev` receives frequent merges from both feature branches (every 1–2 hours of work, not once a day).
- If you want to split your own work further (e.g. Member A wants a `feature/frontend-shop` sub-branch
  for a couple hours), that's fine — just branch off and merge back into `feature/frontend`, then into
  `dev` as normal. Don't over-engineer this; two branches is enough for a 24h build.

## 2. Setup (do together, once, in Phase 0)

```bash
# Person who creates the repo:
mkdir life-rpg && cd life-rpg
npx create-next-app@latest . --js --tailwind --eslint --app --no-src-dir --import-alias "@/*"
git init
git add .
git commit -m "chore: scaffold Next.js app with Tailwind"
git branch -M main
gh repo create life-rpg --public --source=. --remote=origin --push
# (or create the repo on github.com first, then: git remote add origin <url> && git push -u origin main)

git checkout -b dev
git push -u origin dev

git checkout -b feature/frontend
git push -u origin feature/frontend

git checkout dev
git checkout -b feature/backend
git push -u origin feature/backend
```

Second person then just clones and checks out their branch:
```bash
git clone <repo-url>
cd life-rpg
git checkout feature/backend   # or feature/frontend
npm install
```

## 3. Commit message convention (Conventional Commits — looks professional, judges notice this)

```
<type>(<scope>): <short description>

feat(village): add 5 clickable hotspots with aria-labels
feat(api): add server-authoritative quest completion endpoint
fix(streak): correct day-boundary calculation to use server date
style(hud): adjust spacing on level/xp bar per design tokens
refactor(shop): extract purchase validation into lib/server
docs(readme): add setup + env var instructions
test(edge-cases): verify double-completion is rejected server-side
chore: seed NPC quests and shop items
```

Types to use: `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `chore`.
Scope = the area you touched (`village`, `api`, `shop`, `streak`, `auth`, `hud`, etc.)

**Commit after every meaningfully complete unit of work** — a working hotspot, a passing endpoint, a
fixed bug — not one giant commit at the end of a phase. Aim for roughly 20–35 commits per person over
the 24 hours, spread across the actual hours you worked (not backdated, not batched at 11pm). This is
both what a real developer's history looks like and what avoids the "thin/fake commit history"
disqualification rule.

## 4. Avoiding merge conflicts (folder ownership keeps this almost a non-issue)

- Member A only edits: `app/(game)/**`, `components/**`, `styles/**`, `public/art/**`, `lib/client/**`
- Member B only edits: `app/api/**`, `lib/server/**`, `supabase/**`
- Shared files (edit carefully, small diffs, communicate before touching): `docs/02_API_CONTRACT.md`,
  `package.json`, `.env.example`, `README.md`. If you both need to add a dependency, do it in separate
  commits and pull before you push.
- If the API contract needs to change mid-build, whoever needs the change edits
  `docs/02_API_CONTRACT.md` first, pings the other person, then both update their side. This avoids the
  classic "frontend expects `xp`, backend sends `xpTotal`" bug at merge time.

## 5. Daily/hourly sync routine

```bash
# before starting a work session:
git checkout feature/frontend   # or feature/backend
git pull origin dev             # bring in the other person's latest merged work
git merge dev                   # resolve any conflicts now, while context is fresh

# after finishing a chunk of work:
git add .
git commit -m "feat(scope): description"
git push origin feature/frontend

# when a phase milestone is done:
git checkout dev
git pull origin dev
git merge feature/frontend --no-ff
git push origin dev
```

## 6. Milestone merges to `main`

At the end of Phase 6 (Task CRUD working), Phase 10 (Shop + buildings working), and Phase 13
(everything tested and deployed):

```bash
git checkout main
git pull origin main
git merge dev --no-ff -m "merge: milestone — core loop functional end to end"
git push origin main
```

Vercel auto-deploys `main` on every push (set this up in Phase 0 — see Member B's guide §Deployment).
This means `main` is always the live judged URL, and you never manually "deploy" — you just merge.

## 7. Pre-submission checklist for the repo itself

- [ ] Repo is **public**
- [ ] `main` branch has ≥ 3 chronological commits (you'll have far more) and includes both frontend
      and backend code
- [ ] `README.md` has setup instructions a stranger could follow, plus `.env.example`
- [ ] No `.env` file with real secrets committed (check `.gitignore` includes `.env*.local`)
- [ ] Squash/force-push is never used on `main` or `dev` — real, unedited history only
