# Strategy: adding students, evaluation metrics, and icons

> **Status update — 2026-09-03:** The goals manager and add-student flow
> described as missing below are now merged on `main`. The local Phase 1
> data-integrity release also changes `data_points` from mutable per-session
> aggregates to immutable observation events with `entry_kind` and an
> idempotent `client_request_id`. The local Phase 2 release also requires a
> structured measurement plan for new goals. Use `STRATEGY-application-improvement.md`
> for the active roadmap. This document remains the detailed reference for
> adding students, metric types, and icon sets.

Prepared 2026-08-30 against `srab2001/student_data_capture`, branch `main`
(HEAD `92755eb`) with reference to the unmerged branch
`claude/student-data-capture-plan-dgb389` (HEAD `cc01887`). This document
is the engineering strategy for three asks: add new students, add new
evaluation metrics, and change icons. It's written to sit alongside
`docs/compliance.md`, which stays the compliance source of truth — this
doc is the *how to build it* companion.

## Resolved historical blocker: goals management

While reviewing the codebase for this strategy, I found that
`/goals/[studentId]` (the per-student goal editor — create, edit, retire a
goal, including picking metric type and icon set) exists only on
`claude/student-data-capture-plan-dgb389`, at commit `cc01887`. It has
**no open pull request** and has not been merged. The previous handoff
note said this screen was live; that was wrong — it was written by reading
the branch's commit log without checking which commits had actually
reached `main`.

This was resolved by PR #9 (merge commit `c24a848`). The in-app goal editor
is now on `main`; the commands below are retained only as historical context.

```
git fetch origin
git checkout -b merge-goals-manager origin/claude/student-data-capture-plan-dgb389
gh pr create --base main --title "Add per-student goal management screen" \
  --body "Merges the /goals/[studentId] screen (commit cc01887) that's been sitting unmerged. See STRATEGY-students-metrics-icons.md."
```

Everything below may assume the goal editor is present.

## How the app is built, in the parts that matter here

Three enums in `lib/db/schema.ts` are the spine of this analysis:

- `metric_type` — the 8 kinds of measurement a goal can use (`accuracy_pct`, `fluency_rate`, `frequency_count`, `duration_seconds`, `prompt_level`, `task_analysis_step`, `icon_scale`, `accommodation_used`).
- `icon_set` — the 4 icon palettes an `icon_scale` goal can render (`smiley_5`, `stars_5`, `thumbs_3`, `zones_4`).
- Each is a real **Postgres enum**, mirrored as a `const` array in `lib/validation.ts` for Zod validation, and consumed directly by the UI.

Students, by contrast, are a plain table (`students`) with no enum
involved — `displayName`, `classroomId`, `isSynthetic`. That difference is
why "add a student" and "add an icon set" are cheap, while "add a new kind
of metric" is the expensive one of the three. The rest of this document
explains why, concretely, file by file.

---

## 1. Add new students

### Current gap

`app/api/students/route.ts` only implements `GET` — it reads the signed-in
staff member's classroom roster. There is no `POST`, and no UI anywhere
that submits one. The only way a student row gets created today is
`scripts/seed.ts`, which is a synthetic-classroom generator, not a
per-student add flow. This is a real, clean gap — not a design problem to
work around, just a feature that was never built.

### What's already in place for this

- The `students` table has everything needed: `displayName`,
  `classroomId` (required, scoped to the signed-in teacher's classroom),
  `isSynthetic` (defaults `true`), soft delete via `deletedAt`.
- `lib/auth/authz.ts` already has `requireStaff` and
  `assertClassroomScope` — the exact primitives a new-student route needs,
  already proven out by every other route.
- The audit log pattern (`recordAudit`) is established and used
  consistently — a new route just needs to follow it.

### Design

**API — `POST /api/students`**, following the shape of
`app/api/goals/route.ts` (not shown above but structurally the closest
existing analog: authz → validate → insert → audit → respond):

```ts
// lib/validation.ts — add
export const createStudentSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
}).strict();
```

The route derives `classroomId` from the signed-in staff member — never
accept it from the request body, the same way every other route in this
codebase avoids taking a scoping field from the client. `isSynthetic`
should not be client-settable either: it's hardcoded `true` in the insert.
Flipping it to `false` is a Track B / Policy 3060 decision, not a feature
of this endpoint — see Compliance note below.

Role: restrict to `teacher`, not `aide`. The compliance doc's access model
gives aides "same classroom scope... can create entries but not edit or
delete another staff member's past entries" — creating a new roster
member is a roster-ownership action, closer to editing than to logging
data, so it should sit with the teacher. `requireStaff` already returns
the role; add a one-line check, matching the existing `AuthzError` pattern.

**UI** — a small "Add student" affordance on `/entry` (`EntryScreen.tsx`
already renders `StudentCard` per roster member; add a form/button above
or below the list, in the same style as the "Manage goals" link already
added to `StudentCard.tsx` in `cc01887`). Given the low frequency of this
action (a handful of times per school year, not per session), a simple
inline name field + submit button is enough — no need for a dedicated
page. On success, refetch the roster the same way `GoalsManager` already
refetches after a mutation.

**New students start with zero goals.** The natural next step after
adding a student is being sent straight to `/goals/[studentId]` (once
merged) to set up their first goals — link the "add student" success
state directly there rather than leaving a goal-less student sitting in
the entry screen.

### Compliance note

`docs/compliance.md` already says the synthetic-data guardrail is
`is_synthetic`, enforced by the seed script and the pre-commit hook. A
teacher-facing "add student" form is exactly the surface most likely to
tempt someone into typing a real name during the pilot, before Policy
3060 sign-off. Two guardrails worth adding at the same time as the
endpoint, not after:

- Server-side: the new route always inserts `isSynthetic: true`, full
  stop, regardless of anything in the request body (as above).
- UI-side: a persistent, impossible-to-miss reminder on the add-student
  form itself — "Synthetic name only — do not enter a real student's
  name" — not just buried in `/help`.

Neither of these replaces the actual sign-off; they're the same class of
safety net as the existing pre-commit hook, applied one layer earlier.

### Effort

Small. One new API route (~40 lines, closely templated on an existing
route), one validation schema, one small UI form, one link. No schema
migration, no enum changes, nothing in `docs/compliance.md`'s "Data
captured" list needs to change (a student's display name isn't a new data
category).

---

## 2. Add new evaluation metrics

This is the one that needs disambiguating first, because "add a new
evaluation metric" has two very different meanings in this codebase, with
about a 10x difference in effort:

### 2a. A new *goal* that reuses an existing metric type — already fully supported

If what's meant is "Maya needs a new IEP goal tracking something new" and
that new thing can be measured with one of the 8 existing metric types
(a tally, an accuracy percentage, an icon-degree rating, etc.), **this
needs zero code changes.** A teacher creates it directly in
`/goals/[studentId]` — domain, goal text, metric type, icon set if applicable,
and the structured measurement plan — through the existing `POST /api/goals`
route. This is the common case and is worth stating
plainly to whoever is asking for this, since it may already be exactly
what they want without any engineering work at all.

### 2b. A genuinely new *kind* of measurement — needs a new metric type

If the ask is a measurement the current 8 types can't express (a
Likert-style multi-question form, a percentage that isn't trial-based, a
duration that isn't a stopwatch, etc.), that's a new value in the
`metric_type` enum, and it touches more of the codebase than anything
else in this document. Concretely, every one of these needs to change
together:

| # | File | What changes |
|---|---|---|
| 1 | `lib/db/schema.ts` | New value added to `metricTypeEnum` |
| 2 | Drizzle migration | `drizzle-kit generate` emits `ALTER TYPE "metric_type" ADD VALUE '...'` |
| 3 | `lib/validation.ts` | New value added to `metricTypeValues`; define and validate an immutable `entryKind` payload in `createDataPointSchema` rather than adding a mutable aggregate PATCH path |
| 4 | `app/goals/[studentId]/GoalsManager.tsx` | Add a key to `METRIC_LABEL` — TypeScript will refuse to compile without this, since it's typed as `Record<(typeof metricTypeValues)[number], string>`. That's a real safety net here, not busywork. |
| 5 | `app/entry/GoalRow.tsx` | New `{goal.metricType === "..." && (...)}` block — the actual input widget a teacher taps during a session |
| 6 | `app/entry/EntryScreen.tsx` | A new `onSet...` handler wired to `upsertDataPoint`, passed down to the new `GoalRow` case |
| 7 | `lib/summary.ts` | New `case` in the `switch (goal.metricType)` that rolls data points up for the PLAAFP-prep summary |
| 8 | `app/summary/SummaryView.tsx` | Only if the new metric needs summary-view-specific formatting beyond what the generic rollup gives it (the existing `accuracy_pct` special-case there is the precedent to check against) |
| 9 | `docs/compliance.md` | **Required, not optional** — the file's own header says "No other fields should be added without updating this document first." Add the new measurement to "Data captured." |

Two things worth flagging to whoever owns this decision, before writing
any code:

- **Postgres enum values can't be cleanly removed.** `ALTER TYPE ... ADD
  VALUE` is easy and safe; there is no `DROP VALUE`. If a new metric type
  turns out to be the wrong call, walking it back means either leaving a
  permanently-unused enum value in the schema or a much more invasive
  migration (new enum, column swap, backfill). Treat adding a metric type
  as a one-way door — worth a short design conversation (what does the
  UI widget look like, what does it roll up to in the summary) before
  it's built, not iterated on after.
- The CSV export (`app/api/export/csv/route.ts`) has **no metric-type
  branching** — it exports raw columns generically. That's one place a
  new metric type doesn't need touching, which is worth knowing so the
  checklist above doesn't get padded unnecessarily.

### Ready-to-paste prompt for 2b, once the specific new metric is defined

```
Add a new metric type "<name>" to the IEP capture pilot, following the
existing pattern for [closest existing type, e.g. frequency_count]:

1. Add "<name>" to metricTypeEnum in lib/db/schema.ts and generate the
   Drizzle migration.
2. Add "<name>" to metricTypeValues in lib/validation.ts, and to
   createDataPointSchema/updateDataPointSchema if it needs new data_points
   fields beyond valueNumeric/valueEnum/trialsTotal/trialsCorrect.
3. Add a METRIC_LABEL entry in app/goals/[studentId]/GoalsManager.tsx.
4. Add the entry-screen widget: a new case in app/entry/GoalRow.tsx and
   the matching onSet... handler in app/entry/EntryScreen.tsx.
5. Add a case in the switch(goal.metricType) in lib/summary.ts for the
   PLAAFP-prep rollup.
6. Update docs/compliance.md's "Data captured" list — this is required
   before merge, per that file's own header.

Describe exactly what "<name>" measures and what the entry-screen
interaction should look like: [describe here].
```

---

## 3. Change icons

Same disambiguation problem as metrics, but the two readings are much
closer in cost here — worth confirming which one is meant, but neither is
expensive.

### 3a. Change what an existing icon set looks like

If this means "swap the glyphs used for `zones_4`" or "the smiley faces
should look different," that's a single-file, no-migration change:
`lib/icon-sets.ts`'s `ICON_SETS` map holds `{ value, glyph, label }` per
icon. The `value` (`"1_of_5"`, `"blue"`, etc.) is what's actually stored
in `data_points.value_enum` — change `glyph` and `label` freely without
touching the database, `metricTypeEnum`, or any existing data, since
historical readings are keyed by `value`, not by which glyph was showing
when they were recorded. `components/IconDegreePicker.tsx` reads from
this map generically, so every place an icon set renders (`GoalRow.tsx`,
`StudentCard.tsx`) updates automatically.

Effort: trivial. One file, no migration, no compliance-doc update (icon
choice isn't a data-category change), safe to ship immediately.

### 3b. Add a new icon set (a 5th option alongside smiley/stars/thumbs/zones)

This is a new `icon_set` enum value, but it's noticeably cheaper than a
new metric type because `icon_scale` already has exactly one generic
rendering path — `IconDegreePicker` — used for every icon set. No new
`GoalRow.tsx` case is needed the way a new metric type needs one.

| # | File | What changes |
|---|---|---|
| 1 | `lib/db/schema.ts` | New value added to `iconSetEnum` |
| 2 | Drizzle migration | `ALTER TYPE "icon_set" ADD VALUE '...'` |
| 3 | `lib/validation.ts` | New value added to `iconSetValues` |
| 4 | `lib/icon-sets.ts` | New key added to `ICON_SETS` with its `{ value, glyph, label }` entries |
| 5 | `app/goals/[studentId]/GoalsManager.tsx` | **Nothing to change** — the icon-set `<select>` already maps over `iconSetValues`, so the new option appears automatically. (Worth a cosmetic follow-up: right now that dropdown shows raw enum values like `zones_4` instead of a friendly label, unlike the metric-type dropdown's `METRIC_LABEL`. Adding an `ICON_SET_LABEL` map at the same time would be a small, unrelated improvement worth bundling in.) |

Same one-way-door caveat as metric types applies to the enum add, though
the blast radius is smaller since removing an icon set only affects goals
that use `icon_scale` with that specific set, not every metric-type
consumer.

### Recommendation

Ask which of 3a/3b is actually wanted before starting — "change icons"
phrased casually usually means 3a (these look wrong / pick different
emoji), which ships same-day, versus 3b (we want a whole new rating
style), which needs the migration-and-checklist above.

---

## Suggested sequencing

1. **Goals management** — ✅ merged in PR #9.
2. **Add students** (§1) — ✅ implemented on `main`.
3. **Icon changes** (§3) — do 3a now if that's what's wanted; treat 3b as
   a normal small feature once actually requested with a specific new
   icon set in mind, rather than speculatively.
4. **New metric types** (§2b) — highest effort and the only one-way-door
   change of the three; hold until a specific, concrete new measurement
   is defined, and route it through the same "update `docs/compliance.md`
   first" discipline the rest of this project already follows. §2a (a new
   goal on an existing metric type) needs no engineering work at all and
   should be tried first in every case where it's sufficient.

## Compliance thread running through all three

Nothing here changes the Track A / Policy 3060 status recorded in
`docs/compliance.md` — it's still not approved, still synthetic data
only. Two places above create new *opportunities* to violate that
boundary that don't exist today (a free-text student name field; new data
fields for a new metric type), so both call out server-side enforcement
(`isSynthetic` hardcoded, not client-settable) and doc discipline (update
"Data captured" before merge) rather than leaving either to convention.
