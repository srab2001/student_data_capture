# IEP Capture Pilot

A single-classroom prototype for Howard County Public Schools (HCPSS) special
education IEP progress-data capture — replacing spreadsheet entry with fast,
in-classroom logging so teachers and aides spend more time with students.

Built independently by a teacher using [Claude Code](https://claude.com/claude-code),
**not yet reviewed by HCPSS IT or the district's data privacy office.**

Full plan, compliance review, and phase-by-phase build instructions:
[IEP Capture Pilot — artifact](https://claude.ai/code/artifact/f42a3d9c-ee1a-4b8d-860d-e8a4326da173)

**Live synthetic-data pilot:** https://iep-capture-pilot.vercel.app — Phases
1–4, classroom administration, expanded student data plans, and data-readiness
analytics were deployed and verified on 2026-09-03. Production deployment
`dpl_91TrcdW5EkVYRr5gaQq4vcSNvizL` was built from `main` commit `a44997f`.
The production migration journal contains eight entries through
`0007_superb_tiger_shark.sql`, and all eight active student records remain
explicitly synthetic. The guarded live admin suite and rendered browser smoke
passed; Vercel returned no error-level logs after testing. Native 200% zoom, a
real screen-reader session, offline/reconnect, and broader district-governance
review remain follow-ups.

**Phase 4 and administration status:** live for synthetic-data evaluation.
Decision-support reporting includes explicit quantitative aim lines,
collection-plan compliance, evidence-depth labels, metric-appropriate charts,
and teacher-owned intervention annotations. `/admin` provides classroom-scoped
user/access administration, six explicit permissions, synthetic student
creation/rename/soft-retirement, goal management, data-readiness queues,
historical accommodation reconciliation, audit history, and a configurable
color guide whose explanations work on hover and keyboard focus.

**Student data-plan expansion:** deployed and verified for synthetic data.
Administrators can configure accuracy, fluency, frequency, duration, latency,
rubric-scored work samples, structured ABC observations, student-specific
prompt hierarchies, task analyses, accommodations, and session-through-quarterly
cadence from each student's data plan.

**Data-readiness and contextual analytics:** deployed and verified for
synthetic data. Admin inventories incomplete measurement plans and historical
accommodations that require confirmation. Entry defaults to goals due today
while keeping optional/off-schedule goals available. Reports use direction-aware
recent-window comparisons with sample size and observed range, temporal prompt/
task-analysis views, and per-support accommodation summaries. Actual behavior-
observation exposure and optional accommodation session/goal/context fields are
stored without rewriting legacy evidence.

**AI-assisted features:** deployed to the synthetic pilot 2026-09-04
(production deployment `dpl_385Hq9VGKYVDutbcJ23FLBRQmigg`, commit `33c07cb`).
An "AI-assisted setup" panel on the new-goal form and an "Ask for a
suggestion" chat panel on the Accommodations section call the Anthropic API
to propose a measurement plan or an accommodation — see "AI-assisted
features" below. The home page, the synthetic staff roster API, and the
build/runtime logs were confirmed working post-deploy; the authenticated
end-to-end AI call itself has not yet been exercised against production from
an automated check — see `docs/compliance.md`'s implementation log.

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
The repository copy is [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md); test scope
and observed results are in [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) and
[`docs/TEST_RESULTS.md`](./docs/TEST_RESULTS.md).

Before running this branch against an existing database, apply all pending
migrations with `npm run db:migrate`. Migration `0002` converts future data
entry to immutable observation events while preserving prototype history;
migration `0003` adds versioned measurement plans to goals; migration `0004`
adds an explicit completed-observation event for valid zero-occurrence data;
migration `0005` adds roster groups and staff entry preferences.
Migration `0006_melted_nomad.sql` adds the initial per-student accommodation
configuration table. Migration `0007_superb_tiger_shark.sql` is the consolidated
post-`0006` release: it adds decision-support targets and interventions, the
`admin` role and explicit permissions, classroom color meanings, structured
rubric/ABC/latency support, prompt and rubric configuration, behavior exposure,
and contextual accommodation links and constraints. Legacy support rows may
temporarily lack setting/directions; reconcile them in Admin before staff log
new use.

## Deploying

The Vercel project (`iep-capture-pilot`) is git-linked, with **`main` as
the production branch**. Merging a PR into `main` triggers a real
`git clone`-based build and deploys it to
https://iep-capture-pilot.vercel.app automatically — confirmed working via
PR #7. Pushing to this feature branch alone only produces a preview
deployment (its own branch-specific URL), not production; open a PR into
`main` to ship.

This wasn't always the setup — earlier in this project's history, Vercel
deployed via a manual file-upload tool that reliably failed on this
codebase's size (~150KB/56 files), and even the first couple of builds
right after connecting Git failed too (turned out to be stale "Redeploy"
actions replaying an old pre-link snapshot, not real failures of the git
integration). See `docs/compliance.md`'s build log for the full story if
deploys ever regress and this history is useful context again.

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

- `app/entry` — Roster, Focus, and Timers workflows, with Card stack, Grid,
  and Accordion roster layouts, all sharing one event-based autosave/offline queue
  (see `app/entry/types.ts`'s `EntryActions`)
- `app/goals/[studentId]` — add/edit/retire a student's goals
- `app/admin` — configure classroom users, access, permissions, students,
  goals, and the accessible color guide
- `app/summary` — evidence-aware PLAAFP-prep reporting, metric-appropriate
  charts, intervention annotations, CSV export, and print view
- `app/help` — the user guide; `components/Walkthrough.tsx` + `lib/tour-steps.ts` — the guided in-app tour
- `app/api` — Route Handlers, including user/color administration, all scoped
  through `lib/auth/authz.ts`
- `lib/db/schema.ts` — the schema; check against `docs/compliance.md` before adding a field
- `lib/auth/session.ts` — **prototype-only** sign-in, replaced by SSO in Phase 5
- `lib/ai/` — the Anthropic client, the data-minimization layer (`redact.ts`), and the goal-wizard/accommodation-chat logic; `app/api/ai/` — their Route Handlers, both proposal-only (see "AI-assisted features" below)

## Phase 1 data-integrity behavior

- Every trial, tally, rating, task step, timer segment, and note change is an
  immutable observation event. Session totals and summaries are derived from
  those events instead of overwriting the last reading.
- Each event gets a client-generated request ID. Retries are idempotent, so a
  reconnect cannot duplicate a tap.
- Network failures remain in a staff-specific browser queue and retry on
  reconnect and every 15 seconds. Each goal announces `Saving`, `Saved`,
  `Queued`, or `Failed` through an accessible status region.
- `Undo last` removes the most recent event entered by the signed-in staff
  member. Server-side authorization and the audit log still apply.
- Measurement-definition edits to a goal with observations create a new goal
  version and retire the old version, preserving historical interpretation.
- Task-analysis goals use teacher-defined step labels. Accommodation
  effectiveness may be left unrated; the app no longer invents a default.

The browser queue is a resilience feature, not approved storage for real
student data. This repository remains synthetic-data-only until the governance
gates in `docs/compliance.md` are complete.

## Phase 2 measurement-fidelity behavior

- Every new goal requires a structured measurement plan: baseline, observable
  definition, method, mastery criterion, setting, collection days, minimum evidence,
  responsible role, effective dates, and either opportunities or a timed
  observation window.
- The entry screen evaluates that plan for the signed-in teacher or aide. Each
  goal says whether it is scheduled today and shows `N/required` evidence;
  student headers summarize completion across due goals only.
- Accuracy evidence is counted in configured opportunity sets. Frequency
  tallies remain occurrences; staff select `Window complete` when the planned
  observation ends, including when the count is zero. Duration goals offer
  `No occurrence` so a valid zero-duration observation is not lost.
- Card and Accordion views include collapsed collection directions. Grid keeps
  the due/evidence status visible while preserving its dense layout.
- Editing a measurement plan after observations exist creates a replacement
  goal version, preserving the plan that governed historical evidence.
- Pre-Phase-2 goals remain usable and are labeled `Measurement plan incomplete`
  until a teacher supplies the real baseline and criteria. The migration never
  fabricates educational data.

## Phase 3 classroom-workflow behavior

- Roster mode retains Card stack, Grid, and Accordion layouts. Focus mode keeps
  one student on screen with Previous/Next navigation. Timers mode gathers
  duration goals into large start/stop controls.
- A roster-group filter narrows any mode without changing classroom enrollment.
  Teachers create, edit, and retire shared groups; aides can use but not manage
  them.
- Workflow mode, roster layout, and selected group are stored per staff member.
  The currently focused student is deliberately not persisted.
- All modes reuse the same observation queue, timers, save states, undo, and
  measurement-plan calculations.

## Phase 4 decision-support behavior

- The summary calculates scheduled-versus-collected evidence from each goal's
  measurement plan and labels the number of distinct observation days. A
  descriptive trend requires at least three days; this label does not declare
  mastery or statistical significance.
- Quantitative metrics use dated numeric plots. Teachers can explicitly add a
  baseline, target, dates, and direction to show an aim line. Existing narrative
  criteria remain untouched and display `Aim line not configured`.
- Prompt levels, icon ratings, and accommodation-used goals display category
  counts instead of a misleading numeric line.
- Staff with goal-management permission can add or soft-retire dated
  intervention annotations. Configuration and entry/report access are now
  controlled by explicit classroom-scoped permissions rather than role alone.
- Summary filters are strictly validated and limited to 366 days. CSV and print
  output include collection, evidence-depth, aim, and intervention context.

## Classroom administration behavior

- A role selection applies a teacher, aide, or admin permission preset. Admins
  can then adjust user, student, goal, color, entry, and report capabilities
  individually.
- Disabled and retired users cannot sign in; existing prototype cookies stop
  resolving on the next request. Self-retirement, self-removal of user-manager
  access, and removal of the final active user manager are blocked.
- Admins can add synthetic students and use the existing complete, version-safe
  goal editor to add, edit, or retire goals.
- Named classroom colors can be added, edited, ordered, and retired. Their
  explanation is available on pointer hover, keyboard focus, and to assistive
  technology, with a visible text label so meaning never depends on color.

## AI-assisted features (goal wizard, accommodation chat)

Full strategy and compliance review: `STRATEGY-ai-goal-accommodation-assistant.md`.

- An **AI-assisted setup** panel on the new-goal form (`/goals/[studentId]`)
  proposes a structured measurement plan from a domain, entry control, and a
  short skill/behavior description. An **Ask for a suggestion** chat panel on
  the Accommodations section runs a bounded (max 5-exchange) conversation
  that ends in one proposed accommodation.
- Both call the Anthropic API (`lib/ai/client.ts`) and force structured
  tool-use output, re-validated against the same Zod schemas manual entry
  uses, before returning a proposal — neither route writes to the database.
  A teacher must review and save through the existing goals/accommodations
  API, exactly as if they had typed it themselves.
- `lib/ai/redact.ts` builds, by construction, the only payloads either
  feature may send: no student name or ID, and no narrative note — only
  domain, metric type, a teacher-typed description, and (for the
  accommodation chat) structured accommodation names/settings/effectiveness
  ratings. If the AI call fails or times out, the UI falls back to the
  existing manual form with a plain error message.
- Anthropic becomes a new third-party data processor the moment either
  feature is used with real student data — this is a new finding on top of
  the existing Vercel/Neon third-party status, and both features remain
  gated to synthetic data until the AI-specific blockers in
  `docs/compliance.md` clear (no compliance-officer review of this vendor
  yet, no data-processing agreement on file), independent of the base app's
  own Track B gate.
