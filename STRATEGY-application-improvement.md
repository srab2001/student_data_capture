# Application improvement strategy

Updated 2026-09-03 for deployed Phases 1–3 and locally implemented Phase 4,
classroom administration, student data plans, and data-readiness analytics.
The product goal is:

> A teacher or aide records a valid observation in under two seconds, with
> minimal attention diverted from instruction, and can later turn those
> observations into defensible IEP progress evidence without re-entering data.

The compliance source of truth remains `docs/compliance.md`. This repository
is synthetic-data-only until HCPSS governance and technology approvals are
recorded there.

## Roadmap status

| Phase | Outcome | Status |
|---|---|---|
| 1 — Data integrity | Immutable observations, undo, resilient saving, accurate task/accommodation behavior, goal versioning | Deployed to the synthetic pilot; automated and read-only production smoke checks pass; full write/offline/assistive-technology matrix remains |
| 2 — Measurement fidelity | Structured measurement plans, baseline/mastery criteria, setting, schedule, responsible collector, due/evidence guidance | Deployed to the synthetic pilot; migrations and plan-form/API smoke checks pass; populated-plan write/version scenarios remain |
| 3 — Classroom workflow | Roster/focus/timer modes, grouping and staff preferences | Deployed to the synthetic pilot; migration, teacher/aide API flows, preference recovery, Chrome smoke, and runtime error scan pass; full timer/accessibility matrix remains |
| 4 — Decision support | Aim lines, data sufficiency, frequency compliance, intervention annotations, appropriate categorical graphs | Code complete locally; upgrade/fresh migrations, credentialed API, true cross-classroom/audit, keyboard, chart, and reflow checks pass; production migration prepared but not applied; native zoom/screen reader remain manual |
| 4A — Classroom administration | Classroom-scoped users/access, explicit permissions, student lifecycle/goal setup, safe audit oversight, and accessible configurable color meanings | Code complete locally; migration `0007`, prior API lifecycle/isolation, build, and keyboard-focus color checks pass; student retire/audit credentialed checks remain; not deployed |
| 4B — Data readiness | Plan-completion/reconciliation queues, due-first collection, normalized behavior exposure, direction-aware recent trends, temporal prompt/task views, and contextual accommodation reporting | Code complete locally; migrations `0009`–`0010`, 79 tests, lint, types, webpack build, disposable schema rehearsal, and public browser smoke pass; authenticated preview/browser gates remain; not deployed |
| 5 — District readiness | District SSO, governance, vendor/security/accessibility review, retention and incident procedures | Gated |

## Phase 1 delivered requirements

### FR1 — Preserve observations

Every trial, tally, rating, timer segment, task step, accommodation-used goal
reading, and note change is stored as a separate event. Existing aggregate
rows are retained as `legacy_snapshot` records.

Acceptance: three prompt ratings in one session create three database rows;
the latest rating is displayed, and all three remain available for future
analysis.

### FR2 — Idempotent retry

The Chromebook assigns each event a random request ID before submitting it.
The API and unique database index return the original event when that request
is retried.

Acceptance: resubmitting the same request ID does not create a second row.

### FR3 — Offline resilience and save state

Retryable failures remain in a staff-specific browser queue. The app retries
on `online` and every 15 seconds. Each goal exposes an accessible `Saving`,
`Saved`, `Queued`, or `Failed` status.

Acceptance: a simulated network failure leaves the observation visible and
queued; reconnecting stores it once.

### FR4 — Correction

The signed-in staff member can undo their latest non-legacy event. New events
are immutable; correction is a soft delete followed by a new observation.

Acceptance: undo updates the displayed aggregate and creates a `soft_delete`
audit entry.

### FR5 — Preserve measurement meaning

Changing goal text, metric type, icon set, or task-analysis steps after data
exists creates a linked replacement goal and retires the old definition.

Acceptance: historical observations remain associated with the definition
under which they were collected and remain present in summaries.

### FR6 — Correct known validity defects

- A zero fluency score counts as collected data.
- Task analysis uses goal-specific named steps.
- An omitted accommodation-effectiveness rating remains null.
- Session dates use the Chromebook's local calendar date rather than UTC.

## Phase 1 validation matrix

The synthetic pilot is deployed. Before any broader pilot decision, complete:

1. Migration `0002` is applied to a disposable development database and its
   backfill/rollback procedure is reviewed.
2. API integration tests verify idempotency, authorization, immutable PATCH
   rejection, undo auditing, and goal-version transactions.
3. Browser tests simulate offline/reconnect, rapid taps, mistaken taps, a
   running timer, task steps, and staff switching on a Chromebook-sized
   viewport.
4. A teacher and aide complete a synthetic eight-to-ten-student roster sweep;
   median routine capture is under two seconds and the sweep is under three
   minutes.

## Phase 2 delivered requirements

### FR7 — Version the full measurement plan

Every new goal has a structured plan containing baseline, observable
definition, measurement method, mastery criterion, scheduled collection days,
minimum observations, setting/activity, opportunities or observation window,
responsible collector role, and effective dates. A plan edit after data exists
uses the same replacement-version transaction as other definition changes.

Acceptance: historical observations remain connected to the plan in effect
when they were collected; a migration never invents baseline or mastery data
for an existing goal.

### FR8 — Show assignment and evidence sufficiency

The entry screen evaluates the plan against the Chromebook's local date and
the signed-in staff role. Each goal reports not scheduled, not yet active,
ended, assigned to the other role, observations due, or evidence collected.
Student headers count only goals due for that staff member that day.

Evidence units are metric-aware: accuracy trials are grouped by the plan's
required opportunities; frequency goals require an explicit completed window;
and duration goals accept either a stopped duration or an explicit no-occurrence
completion. This prevents a behavior occurrence from being mistaken for a
completed observation and preserves defensible zero-occurrence evidence.

Acceptance: a Wednesday plan requiring two observations moves from `0/2
observations due` to `2/2 collected`; it is not counted as due on Thursday or
for a role not assigned to collect it.

### FR9 — Keep the procedure available during instruction

Card and Accordion goal rows expose collapsed collection directions with the
observable definition, method, mastery criterion, and configured opportunities
or observation window. Grid retains a compact due/evidence label.

Acceptance: staff can confirm what counts without leaving the roster sweep.

## Phase 1–2 remaining validation

The Phase 1 matrix above also applies to Phase 2. Migrations `0002`–`0004`,
automated checks, authenticated API reads, and a Chrome UI smoke test passed
on 2026-09-03. The remaining high-fidelity checks are:

1. Rehearse migrations `0002`–`0004` on a disposable development database and
   retain the rollback/discard evidence.
2. Verify new-goal and existing-goal plan validation through write APIs and UI.
3. Test weekday, effective-date, role assignment, and live evidence-count changes
   in Chrome/ChromeOS, including keyboard-only and screen-reader use.
4. Confirm a plan edit on a populated goal creates a new version and retains
   the prior plan in historical summary/API data.

## Phase 3 delivered requirements

### FR10 — Match the active classroom workflow

The entry screen offers three workflow modes over one observation state:
Roster for a whole-group sweep, Focus for one student with Previous/Next
navigation, and Timers for large-control access to duration goals.

Acceptance: switching modes does not reset running timers, queued observations,
session aggregates, undo state, or due/evidence calculations.

### FR11 — Share instructional roster groups safely

Teachers can create, edit, and retire named groups containing students from
their classroom. Aides can filter by those groups but cannot mutate them.
Groups never change classroom enrollment, and retirement is a soft delete.

Acceptance: cross-classroom membership is rejected server-side; an aide write
returns 403; retiring a selected group returns the user to All students without
removing students or observations.

### FR12 — Resume each staff member's preferred entry setup

Roster layout, workflow mode, and selected group are stored on the signed-in
staff record. Writes are validated, classroom-scoped, rate-limited, and
serialized in the client so rapid switches cannot arrive out of order. The
currently focused student is not persisted.

Acceptance: teacher and aide preferences remain independent and restore after
reload on another Chromebook.

## Phase 3 release validation

Completed for the synthetic production pilot on 2026-09-03: migration `0005`,
teacher group create/update/retire and duplicate rejection, aide read/403
authorization, independent preferences, Focus navigation/wrapping, Timers
empty state, stale-group recovery, and a clean post-test runtime error scan.

Before any broader pilot decision:

1. Rehearse `0005_colorful_clea.sql` on a disposable synthetic database after
   `0004`, including fresh, upgrade, and rollback/discard paths.
2. Exercise cross-classroom rejection and inspect the resulting audit rows
   directly; the single-classroom production fixture cannot cover that scope.
3. Add a duration-goal fixture and test Roster, Focus, and Timers at 1366×768
   and 200% zoom with keyboard and
   screen reader, including active timers while switching modes/groups.
4. Stress rapid preference changes and confirm the final selection on a second
   device/browser session.

## Phase 4 delivered requirements (local, not deployed)

### FR13 — Report evidence collection separately from student performance

For each reporting range, Summary intersects scheduled weekdays with the
measurement plan's effective dates, counts metric-aware evidence on those days,
and caps each day's contribution at its planned requirement. A separate label
reports zero, one/two, or three-plus distinct observation days.

Acceptance: extra trials cannot raise compliance above 100%; one high score on
one day remains labeled limited evidence and never becomes a mastery decision.

### FR14 — Use only explicit, versioned quantitative targets

Quantitative goals may add baseline value/date, target value/date, and desired
direction. The app interpolates an aim value between those dates and clamps it
outside the interval. Existing narrative mastery criteria are not parsed, and
categorical goals reject numeric targets. Target edits use the existing goal-
version replacement path when observations exist.

Acceptance: increasing and decreasing targets produce direction-aware status;
an existing goal with no target says `Aim line not configured` without warning
or fabricated content.

### FR15 — Match the graph to the measurement scale

Accuracy, fluency, frequency, duration, and task-step metrics use dated numeric
plots. Prompt, icon, and accommodation-used metrics use labeled category
counts. Charts retain an exact-value table and text/line-style legend, and do
not depend on color alone.

Acceptance: no numeric position or slope is assigned to a prompt/icon category,
and every displayed value is recoverable without reading the visual chart.

### FR16 — Preserve intervention context without automating decisions

Teachers can add and soft-retire short dated intervention annotations within
their classroom. Aides can review but not manage them. Markers appear in
numeric charts and in CSV/print output; writes are validated, rate-limited, and
audited.

Acceptance: teacher write/read/retire and aide read/403 paths pass on a
disposable synthetic database, including cross-classroom denial and audit-row
inspection.

## Phase 4 release validation

The local suite passes 58 unit tests, ESLint, strict TypeScript, webpack
production compilation, migration metadata, whitespace, and the production
dependency audit. On 2026-09-03, an upgrade rehearsal of `0006` on a disposable
clone of the 26-goal synthetic database passed. Credentialed teacher/aide API
flows and a browser smoke test also passed, including target versioning,
idempotent retry, collection/aim/evidence output, CSV/print context, intervention
lifecycle, role denials, the accessible chart description, and direct aide page
guarding. A second fresh database then ran migrations `0000`–`0006`, accepted
synthetic seed data, passed six true cross-classroom denials, and exposed the
expected audit rows. Keyboard login and Timers start/stop/undo, quantitative and
categorical chart activation, 1366×768 layout, and half-width reflow equivalent
to 200% effective CSS pixels passed. Production was not changed. Before release:

1. Obtain the required explicit confirmation, apply the already-tested `0006`
   and `0007` migrations in order to the synthetic production parent, and
   remove disposable branches.
2. Commit and push the verified source, confirm the Git-linked production build,
   and run authenticated synthetic teacher/aide smoke checks plus an error scan.
3. Complete a native 200%-zoom and real screen-reader session. The automated
   accessibility tree, keyboard paths, contrast checks, and equivalent reflow
   pass, but they are not substitutes for those human assistive-technology tests.
4. Open an exported CSV in a desktop spreadsheet. Quoting, line breaks, formulas,
   dates, and intervention context already pass automated/API tests.

## Classroom administration delivered requirements (local, not deployed)

### FR17 — Configure least-privilege classroom access

An authorized classroom user manager can create, edit, disable/reactivate, and
soft-retire staff. Teacher, aide, and admin roles supply starting presets; six
stored capabilities control user, student, goal, color, observation, and report
access independently. Existing sessions re-check access status on every server
request.

Acceptance: disabling a user rejects both a new login and an already-issued
cookie; a role label does not bypass a denied capability; a classroom cannot
lose its final active user manager.

### FR18 — Centralize student and goal setup

The admin console lists the signed-in classroom roster, supports synthetic
student creation, and links each student to the complete goal editor. Goal
creation, version-safe editing, and soft retirement retain all measurement-plan
and historical-evidence rules.

Acceptance: an admin can add a student and create/edit/retire a valid goal;
another classroom cannot mutate either resource.

### FR19 — Explain classroom colors accessibly

Admins can create, edit, order, and retire named classroom color meanings with
a bounded explanation. Every signed-in classroom member can open the shared
guide. The explanation appears on both pointer hover and keyboard focus, and
the visible name/programmatic description means color is never the only cue.

Acceptance: a created color appears after reload; Tab focus reveals the exact
configured explanation; users without color-management permission receive 403
on writes while retaining read access.

## Classroom administration validation

Migration `0007` passed on the disposable `phase4_fresh` database. The local
65-test suite, lint, strict TypeScript, webpack production build, Drizzle
metadata, diff check, and dependency audit pass. The destructive-to-fixture
API script passed user/access, permission, cross-classroom, color, student, and
goal lifecycles. In-app Chromium verified the full console plus a named swatch
whose tooltip appeared on keyboard focus. Production remains unchanged.

## Next phase

First release Phase 4 and 4A together only after the existing explicit
migration/deployment approval. Then complete native zoom, real screen-reader,
offline/reconnect, and desktop-spreadsheet checks. Phase 5 remains gated on
district SSO, named governance owners, vendor/security/accessibility approval,
retention rules, incident procedures, and authorization to use real student
data. Do not begin real-data onboarding merely because Phase 4 ships.

## Student data-plan expansion delivered (local, not deployed)

The per-student editor now covers the measurement families normally needed for
academic, behavioral/functional, independence, and access monitoring:

- separate accuracy, fluency, frequency, duration, and latency controls;
- named work samples scored against an admin-configured rubric;
- structured antecedent-behavior-consequence observations;
- goal-specific prompt hierarchies and task-analysis steps;
- student-specific accommodation assignments with setting/directions and
  usage/effectiveness logs; and
- visible cadence choices from every session through quarterly reporting.

Migration `0008` stores rubric/prompt definitions on the versioned goal, adds a
discriminated details object to immutable rubric/ABC events, and adds the
soft-deletable student-accommodation table. The 72-test suite, strict TypeScript,
ESLint, webpack production build, dependency audit, and direct disposable-Neon
round trip passed. Credentialed UI/API lifecycle and assistive-technology
checks remain release gates; production remains unchanged.
