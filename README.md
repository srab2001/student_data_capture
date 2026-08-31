# IEP Capture Pilot

A single-classroom prototype for Howard County Public Schools (HCPSS) special
education IEP progress-data capture — replacing spreadsheet entry with fast,
in-classroom logging so teachers and aides spend more time with students.

Built independently by a teacher using [Claude Code](https://claude.com/claude-code),
**not yet reviewed by HCPSS IT or the district's data privacy office.**

Full plan, compliance review, and phase-by-phase build instructions:
[IEP Capture Pilot — artifact](https://claude.ai/code/artifact/f42a3d9c-ee1a-4b8d-860d-e8a4326da173)

**Live demo (synthetic data only):** https://iep-capture-pilot-stus-projects-458dd35a.vercel.app
— see `docs/compliance.md`'s build logs for current deployment status. The
Vercel project is not yet git-linked, so it doesn't auto-deploy on push;
see "Deploying" below.

## ⚠️ FERPA / student data notice

This repo is designed to eventually hold data protected by FERPA and IDEA
(IEP progress data on identifiable students). **During this prototype
phase, it must only ever contain synthetic/fake data.**

Do not commit, seed, or log real student names, IDs, or any other
identifying details until:

1. HCPSS's data privacy officer has reviewed and signed off, and
2. HCPSS IT/privacy leadership has confirmed this system satisfies
   Board Policy 3060's "Authorized Systems Only" requirement.

See [`docs/compliance.md`](./docs/compliance.md) for the full data
classification, open compliance questions, and current sign-off status.
A pre-commit hook (`.githooks/pre-commit`) blocks commits that match
common PII patterns as a safety net — it is not a substitute for the
sign-off above.

## Two tracks

- **Track A (now):** build and test everything against synthetic data.
  No sign-off needed.
- **Track B (gated):** flipping on real student data. Requires a named
  executive sponsor and privacy officer sign-off — see the compliance
  doc and the personnel roster in the full plan.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your dev Neon connection string
git config core.hooksPath .githooks
npm run db:migrate                 # applies drizzle/*.sql to your dev branch
npm run db:seed                    # generates a synthetic classroom
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then `/login` to pick
a synthetic staff member to sign in as. Click "? Take the tour" on `/entry`
or `/summary` for a guided walkthrough, or read the full [user
guide](http://localhost:3000/help) (`app/help/page.tsx`).

## Deploying

The Vercel project (`iep-capture-pilot`) currently deploys via manual file
upload, not a git integration — pushing to this branch does **not**
auto-deploy. To switch to auto-deploy-on-push (recommended once you're past
the pure-prototype phase): Vercel dashboard → project → Settings → Git →
**Connect Git Repository** → this repo, production branch
`claude/student-data-capture-plan-dgb389`. That's a one-time manual step;
there's no API/CLI path that reconnects an *existing* unlinked project to a
repo without risking a duplicate project, so it isn't automated here.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Neon](https://neon.tech) (serverless Postgres) — dev branch only during
  the prototype phase
- [Drizzle ORM](https://orm.drizzle.team) — schema & migrations (`lib/db/`, `drizzle/`)
- [Vercel](https://vercel.com) — deployment
- "Organic" design system (Caprasimo/Figtree, warm terracotta palette) —
  tokens and component classes in `app/globals.css`; see
  `docs/design/entry-screen-handoff/` for the source design handoff

## Where things live

- `app/entry` — the roster-sweep data-entry screen: Card stack, Grid, and
  Accordion layouts, all sharing one autosave state (Phase 3; layouts added
  in the Organic redesign — see `app/entry/types.ts`'s `EntryActions`)
- `app/goals/[studentId]` — add/edit/retire a student's goals
- `app/summary` — the PLAAFP-prep progress view, CSV export, print view (Phase 3/4)
- `app/help` — the user guide; `components/Walkthrough.tsx` + `lib/tour-steps.ts` — the guided in-app tour
- `app/api` — Route Handlers, all scoped through `lib/auth/authz.ts`
- `lib/db/schema.ts` — the schema; check against `docs/compliance.md` before adding a field
- `lib/auth/session.ts` — **prototype-only** sign-in, replaced by SSO in Phase 5
