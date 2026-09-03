# Compliance record

This file is the source of truth for what this app is allowed to do with
student data. Every later phase should be checked against it — anywhere
the implementation would deviate from what's recorded here, that's a bug,
not a judgment call to make silently.

This is a working record, not legal advice. HCPSS's own data privacy
officer and counsel must review and sign off before any real student data
touches this system, regardless of how complete this document is.

**Full plan and compliance review:**
https://claude.ai/code/artifact/f42a3d9c-ee1a-4b8d-860d-e8a4326da173

## Status

| | |
|---|---|
| **Authorized-systems status (Policy 3060)** | ❌ **Not approved.** Real, identifiable student data is prohibited in this system until HCPSS IT/privacy leadership signs off. |
| **Executive sponsor** | Not yet identified |
| **Data privacy & compliance officer** | Not yet identified |
| **IT / data systems lead** | Not yet identified |
| **Track** | A — prototype on synthetic data only |

## Data captured

- Accuracy/fluency probe results (`accuracy_pct`, `fluency_rate`)
- Behavior frequency & duration tallies (`frequency_count`, `duration_seconds`)
- Icon-degree readings — a configurable alternative to a plain tally
  (5-point smiley scale by default; stars, thumbs, or Zones-of-Regulation
  colors also supported per goal)
- ABC (antecedent-behavior-consequence) notes
- Prompt-level / independence tracking (`prompt_level`)
- Task analysis checklist steps (`task_analysis_step`)
- Accommodation-usage logs, including an effectiveness rating (rendered
  with the same icon-degree control as behavior goals)
- Per-observation event type and timestamp so multiple readings in one session
  remain distinct; client-generated random request IDs prevent duplicate
  records during offline retries
- Explicit observation-window completion markers so zero behavior occurrences
  or zero-duration observations remain valid evidence without manufacturing a
  numeric value
- Goal-version relationships and goal-specific task-analysis step labels so
  historical readings retain the measurement definition used when collected
- Versioned goal measurement plans: baseline description, observable behavior,
  measurement method, mastery criterion, scheduled collection days,
  minimum observations per scheduled day, setting/activity, opportunities or
  observation duration when applicable, responsible collector role, and
  effective start/end dates. These fields describe how an IEP goal is measured;
  they do not expand the student-identifying data collected.

No other fields should be added without updating this document first —
see "Data minimization" in the full compliance review.

## Classification

FERPA education record data. Because it is tied to IEP goals, it is also
IDEA-linked special education data — a category with handling
requirements beyond baseline FERPA.

## Legitimate educational interest

Today: the classroom teacher and their aide(s), scoped to their own
classroom roster only. No one else should have access. Widening this
(a case manager, a related-service provider, an administrator) is a new
access-control decision, not an assumption — see Phase 2/5 of the full
plan.

## State law overlay

Maryland layers state-level student data privacy requirements on top of
FERPA, alongside COMAR's special-education-specific rules. **Not yet
confirmed in detail** — flagged for HCPSS privacy officer/counsel review,
including whether the state's vendor/operator-style obligations reach a
personally-built app (Vercel + Neon) the way they would a purchased
product.

## Consent & notification

**Not yet decided.** Routine IEP progress monitoring is normally covered
by IDEA's existing procedural safeguards, but introducing a new
technology platform that stores this data is the kind of change a
privacy officer typically wants to review and may fold into parent
notification.

## Retention & deletion

**Not yet decided.** Should match HCPSS's records retention schedule for
special education records once the privacy officer confirms it. Every
table holding student-identifiable data uses soft deletes
(`deleted_at`), never hard deletes, so a retention policy can be enforced
later without losing audit history.

## Third-party / vendor exposure

- **Vercel** (hosting) and **Neon** (database) are themselves third
  parties the moment real student data touches them — this is the core
  of the Policy 3060 blocker above, not a separate issue.
- No analytics, error-tracking, or AI/voice-transcription service should
  ever receive real student data without its own explicit review.
- **No voice/audio capture is implemented in this app**, and none should
  be added without a separate sign-off — Maryland requires all-party
  consent to record a conversation, a second legal issue on top of
  everything above.

## Access control

Enforced in a single shared authorization helper (see Phase 2), not
inline checks scattered across routes:

- `teacher` — full access to their own classroom's students only
- `aide` — same classroom scope as their assigned teacher; can create
  entries but not edit or delete another staff member's past entries

Every read and write is audit-logged (`audit_log` table), and that table
is not deletable from the application, including by a future admin role.

## Synthetic data only, until sign-off

- Every student row carries an `is_synthetic` flag.
- Seed scripts refuse to run against anything that looks like a
  production database URL.
- The pre-commit hook (`.githooks/pre-commit`) blocks common PII
  patterns as a safety net.

None of this replaces the actual sign-off recorded in the Status table
above.

## Phase 0 infrastructure log

Provisioned 2026-08-28, on synthetic data only, no Policy 3060 sign-off:

| Piece | Status | Notes |
|---|---|---|
| **Vercel project** | ✅ Deployed | `iep-capture-pilot`, production alias `iep-capture-pilot.vercel.app`. File-based deploy (not git-linked yet). |
| **Neon database** | ✅ Created | Dev branch project `iep-capture-pilot-dev` (`crimson-flower-01823647`, region `us-east-1`). Schema applied in Phase 1 (below). |
| **GitHub repo** | ✅ Pushed | `srab2001/student_data_capture`, branch `claude/student-data-capture-plan-dgb389`. |

## Phase 1–4 build log

Built 2026-08-28, on synthetic data only, no Policy 3060 sign-off (Track A):

| Piece | Status | Notes |
|---|---|---|
| **Schema & migrations** | ✅ Applied | `staff`, `classrooms`, `students`, `goals`, `sessions`, `data_points`, `accommodation_logs`, `audit_log` — see `lib/db/schema.ts` and `drizzle/`. Applied directly to the `iep-capture-pilot-dev` Neon branch. `audit_log` DELETE is blocked by a database trigger (`drizzle/0001_audit_log_no_delete.sql`), not just an app-layer check. |
| **Synthetic seed script** | ⚠️ Written, not yet run | `scripts/seed.ts` (`npm run db:seed`) refuses to run against a non-dev-looking `DATABASE_URL`. This build environment's network policy blocks direct outbound calls to Neon's data API, so the seed script needs to be run from a machine with normal Neon access — see "Known limitation" below. |
| **API layer** | ✅ Built | Route handlers for `goals`, `data_points`, `accommodation_logs`, `students`, `sessions`, `summary`, and export, all behind the shared authorization helper in `lib/auth/authz.ts`. |
| **Sign-in** | ⚠️ Prototype only | `lib/auth/session.ts` is a signed-cookie staff picker (`/login`), explicitly not real authentication. Replaced by HCPSS Google Workspace SSO in Phase 5 (Track B, gated) — do not extend this mechanism. |
| **Entry screen & summary view** | ✅ Built | `/entry` (roster sweep) and `/summary` (PLAAFP-prep rollup, CSV export, print view) — see `app/entry/` and `app/summary/`. |
| **Accessibility pass** | ✅ Done, human check recommended | Touch/click targets ≥44px, `aria-label`/`aria-pressed` on custom controls, native keyboard-navigable elements throughout, no color-only state indicators. Color contrast has not been measured with an automated tool — flagged for a human check before this leaves the prototype phase. |

**Historical limitation — resolved for read-only production use.** The
original build environment could not exercise the Neon-backed app. On
2026-09-03, the production migration ran within Vercel, and authenticated API
and browser smoke tests loaded the synthetic roster and goals successfully.
The write/offline/assistive-technology matrix remains open in
`docs/TEST_PLAN.md`; this resolution does not change the synthetic-data-only
restriction.

## Entry-screen redesign log

Built 2026-08-31, on synthetic data only, no Policy 3060 sign-off (Track A):

| Piece | Status | Notes |
|---|---|---|
| **"Organic" design system** | ✅ Adopted app-wide | Warm cream/terracotta palette, Caprasimo/Figtree type, pill buttons/chips — tokens and component classes in `app/globals.css`, fonts wired via `next/font/google` in `app/layout.tsx`. Source design handoff archived at `docs/design/entry-screen-handoff/`. |
| **Three entry-screen layouts** | ✅ Built | `/entry` now has a Card stack / Grid / Accordion switcher (`app/entry/EntryScreen.tsx`) — all three read and write through the same autosave state (`app/entry/types.ts`'s `EntryActions`), never duplicated per layout. New: `app/entry/GridView.tsx`, `app/entry/AccordionView.tsx`. |
| **Goal-management, home, login screens** | ✅ Restyled | Reskinned to the same tokens for visual consistency; functionality unchanged. |
| **Summary and help screens** | ⚠️ Not yet restyled | Still on the prior look — the design handoff was scoped to the entry screen only. Follow-up task if full app-wide consistency is wanted. |
| **Production deploy** | ✅ Live and verified | The Vercel project is git-linked to `main`; PR #7's merge (commit `eca5c3a`) triggered a real `git clone` build that compiled cleanly, type-checked, and generated all 20 routes. Confirmed live at https://iep-capture-pilot.vercel.app: home/`help`/`login` all serve the Organic redesign with correct styling, `/entry` correctly redirects an unauthenticated request to `/login`, and `/api/auth/staff` returned the real seeded roster (`Synthetic Teacher`, `Synthetic Aide`) — i.e. the production Neon connection works end-to-end, not just the build. |
| **Production deploy — history** | Resolved | Two earlier problems, now both fixed: (1) before Vercel was git-linked, its manual file-upload tool failed twice on this codebase's size (~150KB/56 files) — the transferred tree came back missing most of `lib/`. (2) The first two builds *after* linking Git still failed, oddly, on a single `Module not found: Can't resolve './globals.css'` despite the file being confirmed present on GitHub — diagnosed as stale "Redeploy" actions replaying an old pre-link deployment's file snapshot (no `Cloning github.com/...` line in their logs), not real builds off current code. A genuine webhook-triggered build immediately after showed a proper clone step and succeeded, confirming the git integration itself was fine all along. |

## Add-student log

Built 2026-08-31, on synthetic data only, no Policy 3060 sign-off (Track A):

| Piece | Status | Notes |
|---|---|---|
| **Create a student** | ✅ Built | The design handoff's dashed "+ Add student to roster" card was previously a static placeholder with no API behind it — `POST /api/students` (`lib/validation.ts`'s `createStudentSchema`) now backs it. `classroomId` is always taken from the signed-in staff member's own classroom, never client-supplied, and `isSynthetic` is hard-coded `true` server-side — the endpoint has no way to create a non-synthetic student, matching the Track A guardrail above rather than just documenting it. New goals are added afterward from the student's existing "Manage goals" screen. |

This log will be updated as each piece moves from prototype to reviewed.

## Phase 1 data-integrity release log

Implemented 2026-09-02 and deployed 2026-09-03, on synthetic data only, no
Policy 3060 sign-off:

| Piece | Status | Notes |
|---|---|---|
| **Immutable observations** | ✅ Code complete | New trials, tallies, timer segments, ratings, task steps, goal-level accommodation readings, and note changes are appended as separate `data_points` events. Existing aggregate rows remain readable as `legacy_snapshot`. |
| **Idempotent offline retry** | ✅ Code complete | Each event receives a random `client_request_id` before submission. A unique database index makes reconnect retries idempotent. Pending observations are isolated by signed-in staff ID in browser storage and retry on reconnect/interval. This browser storage is still synthetic-only. |
| **Correction flow** | ✅ Code complete | `Undo last` soft-deletes the signed-in staff member's latest non-legacy event. New events cannot be patched; a correction is an audited removal followed by a replacement observation. |
| **Goal definition integrity** | ✅ Code complete | Editing goal text, metric type, icon set, or task-analysis steps after observations exist creates a linked replacement version and retires the prior definition. Historical versions remain available to summaries. |
| **Task analysis and accommodations** | ✅ Code complete | Task-analysis labels are goal-specific. Accommodation effectiveness can be omitted; no default rating is manufactured. |
| **Migration `0002`** | ✅ Applied to synthetic production | Applied after the migrator verified and journaled the manually created legacy baseline. Do not apply this system to real-student data because Track B remains blocked. |
| **Verification** | ✅ Release smoke passed; full matrix open | Unit tests, ESLint, TypeScript, webpack and Vercel builds, schema metadata, dependency audit, authenticated production API reads, and Chrome UI smoke passed. Write/offline/assistive-technology scenarios remain in `docs/TEST_PLAN.md`. |

## Phase 2 measurement-fidelity release log

Implemented and deployed 2026-09-03, on synthetic data only, no Policy 3060
sign-off:

| Piece | Status | Notes |
|---|---|---|
| **Structured measurement plans** | ✅ Code complete | New goals require a bounded, validated JSON measurement plan containing baseline, observable definition, method, mastery, schedule, minimum evidence, setting, opportunities/window, collector role, and effective dates. |
| **Historical integrity** | ✅ Code complete | Measurement-plan edits are part of goal versioning. Existing goal rows remain null after migration so the app never fabricates baseline or mastery content. |
| **Due/evidence guidance** | ✅ Code complete | The entry screen evaluates local weekday/date, effective range, and signed-in role, then shows the non-note observation count against the plan minimum. |
| **Migration `0003`** | ✅ Applied to synthetic production | Added nullable `goals.measurement_plan` after `0002`; existing goals remain null rather than receiving fabricated plan content. |
| **Migration `0004`** | ✅ Applied to synthetic production | Added the `observation_complete` event kind after `0003`. |
| **Verification** | ✅ Release smoke passed; full matrix open | Measurement-plan and due/evidence unit tests passed. Production API reads exposed the migrated field, and Chrome showed legacy-plan warnings, due summaries, accessible controls, layout switching, and the complete plan editor without changing student records. |

## Phase 1–2 production deployment log

Released 2026-09-03 to the existing synthetic-data Vercel/Neon pilot:

| Piece | Status | Notes |
|---|---|---|
| **Preflight data check** | ✅ Synthetic only | Prototype staff contained only Synthetic Teacher and Synthetic Aide. The authenticated roster contained eight students, all marked synthetic. |
| **First migration-first deploy** | ❌ Stopped safely | Deployment `dpl_GKP6QhUSyaCjm6AyiJGyXuAusd23` found an empty Drizzle journal beside the manually applied legacy schema and failed before alias promotion. The prior production deployment remained live. |
| **Legacy migration reconciliation** | ✅ Guarded | `scripts/migrate.ts` leaves a genuinely empty database for normal migration, and records baseline migrations `0000`–`0001` only when the journal is empty and all eight expected tables plus the append-only audit trigger are present; a partial baseline causes a hard failure. |
| **Production deployment** | ✅ Live | Deployment `dpl_6DWUEXX1wJw1spUgAb6sSY4oPXiA` applied migrations `0002`–`0004`, completed the Next.js build, reached `READY`, and received the `iep-capture-pilot.vercel.app` alias. |
| **Production verification** | ✅ Read-only smoke passed | Public pages, prototype teacher login, scoped roster/goals APIs, Card/Grid layouts, accessible control names, legacy plan warnings, and the measurement-plan editor passed. Runtime-log inspection was blocked by the managed approval service; full write/offline/assistive-technology testing remains open. |
