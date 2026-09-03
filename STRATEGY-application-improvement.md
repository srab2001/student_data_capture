# Application improvement strategy

Updated 2026-09-03 for the deployed Phase 1 data-integrity and Phase 2
measurement-fidelity release. The product goal is:

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
| 3 — Classroom workflow | Roster/focus/timer modes, grouping and staff preferences | Planned; due-today foundation delivered in Phase 2 |
| 4 — Decision support | Aim lines, data sufficiency, frequency compliance, intervention annotations, appropriate categorical graphs | Planned |
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

## Next phase

Phase 3 should build on the delivered due-today foundation with teacher-defined
roster groups, a single-student focus mode, timer-focused workflow, and saved
per-staff layout/preferences. It should not duplicate the shared observation
state or weaken the Phase 1–2 integrity and measurement-plan rules.
