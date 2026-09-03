# Test plan

## Scope

Phase 1–2 release: immutable observation events, derived session aggregates,
idempotent/offline retry, correction, goal versioning, local dates,
goal-specific task steps, optional accommodation effectiveness, structured
measurement plans, and accessible due/evidence and save status.

All automated and manual tests use synthetic data only.

## Acceptance criteria

| Area | Acceptance |
|---|---|
| Event preservation | Multiple trials, tallies, ratings, task steps, and timer segments in one session remain separate rows and derive the correct displayed aggregate. |
| Backward compatibility | Pre-migration rows are classified as `legacy_snapshot` and remain readable in entry and summary views. |
| Idempotency | Repeating a POST with the same `clientRequestId` returns one stored row. Cross-classroom access remains denied. |
| Offline behavior | A failed network POST stays visible in the staff-specific browser queue, survives reload, and saves once after reconnect. |
| Correction | Undo removes the latest event created by the signed-in staff member, updates the aggregate, and creates an audit entry. An aide cannot undo another staff member's event. |
| Immutability | PATCH of a non-legacy event returns 409. Legacy snapshots retain the existing authorized PATCH path. |
| Goal versions | A measurement-definition edit after observations exist atomically creates a replacement goal, links it to the old goal, and retires the old row. Historical summaries retain the old version. |
| Task analysis | One to twenty unique, non-empty step labels are accepted and rendered. Missing/duplicate steps are rejected. |
| Accommodation rating | Blank effectiveness is stored as null, never as an inferred midpoint. |
| Accessibility | Save changes are announced through `role=status`/`aria-live`; undo has a goal-specific accessible name; all controls remain keyboard operable. |
| Date | A session uses the Chromebook's local calendar date near UTC day boundaries. |
| Plan completeness | Every new goal requires baseline, observable definition, method, mastery criterion, collection days, minimum observations, setting, collector role, effective start date, and opportunities or a timed window. Invalid ranges, duplicates, bounds, and reversed dates are rejected. |
| Plan history | Editing any measurement-plan field after observations exist creates a replacement goal version; the previous plan remains attached to historical evidence. Existing goals receive null, not fabricated plan content. |
| Due assignment | The local date, weekday schedule, effective dates, and signed-in role determine whether a goal is due. Weekends are not aliased to weekdays. |
| Evidence sufficiency | Accuracy trials are grouped by configured opportunities; frequency requires an explicit completed window; duration accepts a stopped interval or no-occurrence completion; other non-note readings count as samples. Status changes at the exact threshold and student counts include due goals only. |
| Procedure access | Card/Accordion expose collection directions; Grid exposes compact plan status. Native semantic controls remain keyboard and screen-reader operable. |

## Automated checks

1. `npm test` — aggregation, compatibility, validation, local date, fluency
   completion, plan schedule/role/date, legacy-plan, and evidence-threshold unit
   tests.
2. `npm run lint` — ESLint across application and tests.
3. `npx tsc --noEmit` — strict TypeScript verification.
4. `npx next build --webpack` — production compilation, route generation, and
   Next.js type checks. Webpack is used locally because Turbopack's CSS worker
   cannot bind a port in this managed sandbox.
5. `git diff --check` — whitespace/error check.
6. `npm audit --omit=dev --audit-level=high` — production dependency audit.
7. `npx drizzle-kit check` with a non-secret placeholder URL — migration
   journal/snapshot consistency check; this does not connect or apply SQL.

## Database integration tests

On a disposable Neon/Postgres development branch:

1. Snapshot row counts and schema.
2. Apply `drizzle/0002_mighty_maggott.sql`, then
   `drizzle/0003_elite_bloodstrike.sql`, then
   `drizzle/0004_calm_red_ghost.sql`.
3. Confirm all existing `data_points.entry_kind` values are
   `legacy_snapshot` and existing task-analysis goals have five temporary
   backfill labels.
4. Exercise each event kind through the API.
5. Submit the same request ID twice and confirm one row.
6. Attempt an incompatible event kind and expect 400.
7. Attempt PATCH on a new event and expect 409.
8. Undo as owner, teacher, and non-owning aide; verify authorization and audit.
9. Create a goal with a valid plan and reject missing/invalid plan fields.
10. Confirm pre-existing goals have null `measurement_plan` and display the
    incomplete-plan state.
11. Verify tallies do not complete a frequency window, then record completed
    windows with both zero and nonzero occurrences. Verify a duration
    no-occurrence event counts without manufacturing seconds.
12. Edit a populated goal definition and measurement plan; verify the
    transaction and historical plan retention.
13. Restore the database snapshot or discard the disposable branch.

## Browser tests

Use ChromeOS or Chrome at 1366×768 and 100%/200% zoom:

1. Complete rapid accuracy and tally entry in all three layouts.
2. Make and undo mistaken taps.
3. Record multiple prompt/icon ratings and confirm the latest display plus
   preserved history.
4. Start, stop, restart, and undo a timer segment.
5. Go offline, enter data, reload, reconnect, and verify exactly-once storage.
6. Switch synthetic teacher/aide accounts and verify queue isolation.
7. Use keyboard-only and a screen reader to verify control names and status
   announcements.
8. Confirm blank accommodation effectiveness remains blank in the summary.
9. Verify due status for scheduled/unscheduled weekdays, teacher/aide role,
   future/ended plans, and weekend dates.
10. Collect just below and exactly at the required evidence count; confirm the
    goal and student header change state without a reload.
11. For frequency, tally occurrences and verify the due status changes only
    after Window complete; repeat with zero tallies. For duration, verify No
    occurrence counts as one sample without adding seconds.
12. Use Manage goals to create and edit a plan, including validation messages,
    at 100%/200% zoom and keyboard-only.
13. Open collection directions with keyboard and verify screen-reader reading
    order and polite status announcements.

## External gates

- Production migrations, read-only authenticated API checks, and a Chrome UI
  smoke test passed against the synthetic pilot on 2026-09-03. See
  `docs/TEST_RESULTS.md` for deployment IDs and evidence.
- The database write scenarios above still require a disposable synthetic
  Neon/Postgres branch. They were deliberately not run against the shared
  production pilot during the read-only release smoke test.
- The full ChromeOS/offline/keyboard/screen-reader/200%-zoom matrix and the
  teacher/aide timed roster sweep still require human execution.
- A post-test production runtime-log scan remains pending because the managed
  approval service rejected the Vercel log-read request.
- HCPSS privacy, security, accessibility, and operational approval remains a
  Track B gate. These tests do not authorize real student data.
