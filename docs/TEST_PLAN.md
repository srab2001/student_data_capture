# Test plan

## Scope

Phase 1–4 implementation: immutable observation events, derived session aggregates,
idempotent/offline retry, correction, goal versioning, local dates,
goal-specific task steps, optional accommodation effectiveness, structured
measurement plans, accessible due/evidence and save status, shared roster
groups, Roster/Focus/Timers workflows, per-staff entry preferences,
collection-compliance reporting, evidence-depth labels, explicit aim lines,
metric-appropriate charts, and intervention annotations.
The classroom-admin increment adds user lifecycle/access controls, six explicit
permissions, admin student/goal setup, and a configurable accessible color
guide.
The data-readiness increment adds an administrator repair queue, due-first
entry, exposure-normalized behavior rates, direction-aware recent trends,
temporal prompt/task-analysis reporting, and contextual accommodation evidence.

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
| Workflow continuity | Switching Roster, Focus, and Timers preserves queued/saved observations, running timers, undo state, and due/evidence calculations. |
| Roster groups | Teachers can create, edit, and soft-retire classroom-scoped groups. Aides can read/filter but receive 403 on writes. Cross-classroom membership is rejected. |
| Focus mode | One selected student is visible; Previous/Next wraps within the filtered roster. The focused student is not persisted. |
| Timers mode | Only duration goals in the selected roster are shown with large, named Start/Stop, No occurrence, and Undo controls. |
| Staff preferences | Layout, workflow mode, and selected group persist independently per staff member; stale groups fall back to All students; rapid changes retain the final selection. |
| Reporting filters | Invalid UUIDs/dates, reversed dates, and ranges longer than 366 days are rejected before a query runs. |
| Collection compliance | Only scheduled days inside the plan's effective range contribute to expected evidence. Extra samples cannot push a day above its configured requirement or compliance above 100%. |
| Evidence depth | Zero observation days is labeled no evidence, one or two is labeled limited/interpret cautiously, and three or more is labeled descriptive—not mastery or statistical significance. |
| Progress targets | Quantitative goals may store an explicit baseline/date, target/date, and direction. Invalid direction/value/date combinations and accuracy values above 100 are rejected. Categorical and existing goals never receive inferred targets. |
| Aim status | The aim value is interpolated between explicit baseline and target dates, clamped outside that range, and compared in the configured direction. No target or no numeric observation produces a neutral label. |
| Chart semantics | Quantitative metrics render dated numeric observations and an optional dashed aim line. Prompt/icon/accommodation metrics render exact category counts. Text labels and the reading table remain available. |
| Intervention context | Teachers can add and soft-retire bounded, dated, classroom-scoped annotations; aides can read but receive 403 on writes. All operations are audited. |
| Configuration roles | Aides cannot add students, create/edit/retire goals, edit progress targets, manage groups, or manage intervention annotations; page/API access also enforces this. |
| Export safety | CSV correctly quotes commas, quotes, and line breaks and prefixes formula-leading teacher text so spreadsheet software treats it as text. |
| User administration | A classroom user manager can add, edit, disable/reactivate, and soft-retire a teacher, aide, or admin. Duplicate emails are rejected. A user cannot remove their own management access or retire themselves, and at least one active user manager remains. |
| Access enforcement | Disabled/retired users disappear from the prototype picker, cannot sign in, and an already-issued cookie resolves to signed out. Each of the six explicit permissions gates its matching page and write API independently of the role label. |
| Admin classroom scope | User, student, goal, and color operations can affect only the signed-in classroom. Foreign identifiers follow the missing-resource response path and never disclose cross-classroom records. |
| Student and goal setup | A permitted administrator can add a synthetic student, then create, edit/version, and retire complete goals using the existing measurement-plan safeguards. |
| Student lifecycle | A student manager can rename or soft-retire a classroom student. Retirement removes the student from active roster/report queries while preserving goals, observations, support logs, and audit rows. A foreign classroom identifier returns the missing-resource response. |
| Color guide | A permitted administrator can add, edit, order, and soft-retire a six-digit color with a bounded name and explanation. Every signed-in classroom member can read the guide; a swatch always has a text name and exposes the same comment on hover and keyboard focus. |
| Audit oversight | A user manager can review up to 100 recent actions performed by current or retired staff in their classroom. The response exposes actor, time, action, area, record identifier, and changed-field names but not diff values. Other classrooms and users without user-management permission are denied. Viewing history creates a new append-only audit event. |
| Data readiness | A goal manager sees classroom-scoped counts and a queue for every active goal without a complete measurement plan. Each queue item opens the correct student goal editor without inventing plan values. Default prompt hierarchies are identified for review. |
| Historical accommodation reconciliation | Unmatched historical support names are grouped by student and support. Reconciliation requires the administrator to confirm a setting and implementation directions before creating the active student support; no historical log is rewritten or deleted. |
| Due-first entry | Every entry layout initially shows only goals due for the signed-in staff member on the local date. A named control reveals optional/off-schedule goals and can restore the due-only view without losing queued observations or timers. |
| Behavior exposure | Completing a frequency observation requires a positive actual duration or opportunity count. Stored counts report occurrences per minute or per 100 opportunities; mixed exposure units are labeled and are not combined into one normalized claim. |
| Recent trends | Quantitative summaries compare early and recent observation windows using the configured increase/decrease direction, and always expose sample count, observation-day count, date span, and observed range. Missing direction or insufficient evidence stays neutral. |
| Prompt and task-analysis history | Prompt-support reports show dated recent levels and early/recent hierarchy positions without declaring mastery. Task-analysis reports show the number and percentage of observations reaching each configured step. |
| Accommodation context | Used/not-used logs may link to a same-classroom session and active same-student goal and may store activity, setting, fidelity, and reason not used. Ratings and fidelity are permitted only when the support was used. |
| Accommodation reporting | Effectiveness and fidelity are grouped by student, support, and setting with an explicit `n`. Results are labeled descriptive and do not imply that an accommodation caused an outcome. |
| Synthetic metric coverage | A fresh synthetic seed contains frequency exposure plus latency, rubric, ABC, prompt-hierarchy, task-analysis, and accommodation-context records so each current workflow has a realistic fixture. |

## Automated checks

1. `npm test` — aggregation, compatibility, validation, local date, fluency
   completion, plan schedule/role/date, legacy-plan, evidence-threshold,
   roster filtering, focus navigation, workflow validation, reporting ranges,
   collection compliance, evidence depth, increasing/decreasing aim lines,
   admin presets, permission checks, and user/color validation.
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
   `drizzle/0004_calm_red_ghost.sql`, then
   `drizzle/0005_colorful_clea.sql`, then
   `drizzle/0006_melted_nomad.sql`, then
   `drizzle/0007_superb_tiger_shark.sql`.
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
13. Create/update/retire a group as teacher; verify aide reads it but receives
    403 on every mutation, and reject a student from another classroom.
14. Save different preferences for teacher and aide; verify reload, stale-group
    fallback, final-write ordering, and audit entries.
15. Confirm every existing goal has null `progress_target`; create valid
    increasing and decreasing targets, reject categorical/invalid targets, and
    verify a populated-goal target edit creates a version.
16. Add/list/retire an intervention as teacher; verify aide read/403 behavior,
    cross-classroom 404 behavior, soft deletion, and audit rows.
17. Query collection compliance across plan boundaries and confirm extra
    samples are capped at the scheduled daily requirement.
18. Verify the admin user lifecycle: create, disable, reject sign-in and an
    existing cookie, reactivate, change permissions, and soft-retire.
19. Verify an aide receives 403 for user/color/student/goal management and a
    user with goal permission removed receives 403 even when their role is
    `admin`.
20. Create/read/edit/retire a classroom color, verify all classroom staff can
    read it, and verify another classroom receives 404 on mutation.
21. Create a synthetic student and create/edit/retire a goal as an admin.
22. Restore the database snapshot or discard the disposable branch.
23. Create latency, rubric, ABC, prompt-hierarchy, and task-analysis goals;
    reject missing/duplicate configuration and out-of-range rubric scores.
24. Create/list/update/retire a student accommodation; reject a foreign
    classroom student and reject logging a support not active in the plan.
25. Record rubric and ABC events, retry each client request ID, and verify the
    summary and CSV preserve work-sample and ABC fields without flattening them.
26. Verify Every session through Quarterly options save. Confirm collection
    compliance still follows the versioned weekday/evidence measurement plan.
27. Query the data-readiness endpoint as a goal manager, aide, and second
    classroom. Verify plan/default-prompt/unmatched-support counts, 403
    enforcement, classroom isolation, and no fabricated plan values.
28. Reconcile an unmatched historical support after confirming its setting and
    directions. Verify the active assignment appears and the old logs remain
    unchanged. Reject blank confirmation fields and cross-classroom IDs.
29. Store frequency observations with actual minutes and opportunities; reject
    missing, zero, negative, and non-completion exposure fields. Verify per-minute
    and per-100-opportunity calculations and a clear mixed-unit label.
30. Link accommodation logs to a valid goal/session and reject a goal for a
    different student, a session outside the classroom, and rating/fidelity on
    a not-used event. Verify grouped summary counts always expose `n`.
31. Seed a fresh disposable database and assert at least one observation for
    latency, rubric, ABC, prompt, task analysis, frequency with exposure, and
    accommodation context. Exercise the matching API/report route for each.
32. Apply upstream `0006_melted_nomad.sql` followed by consolidated
    `0007_superb_tiger_shark.sql` to both an upgrade clone and a fresh database.
    Verify nullable back-compatibility, positive exposure checks, 1–5
    rating/fidelity checks, new foreign keys/indexes, and the full journal.
33. Rename and soft-retire a student as a student manager. Verify the active
    roster no longer returns the retired student while direct database checks
    retain the student, goals, observations, accommodation logs, and audit row.
    Verify an aide receives 403 and a second classroom receives 404.
34. Read audit history as a user manager and verify current and retired actors,
    descending time order, the 1–100 limit, safe changed-field names, and the
    appended audit-read event. Verify an aide receives 403 and no other
    classroom's actions appear.

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
14. Switch Roster/Focus/Timers while an observation is queued and a timer is
    running; verify continuity and exactly-once persistence.
15. Filter by a group in all modes; edit/retire it as teacher and confirm an
    aide can use but cannot manage groups.
16. Verify Focus Previous/Next wraps within the selected group and does not
    restore the focused student after reload.
17. Verify Timers includes only duration goals and exposes student-specific
    accessible names at 100% and 200% zoom.
18. Switch staff accounts and confirm mode/layout/group preferences remain
    independent and restore on another Chromebook/browser session.
19. Verify numeric charts for accuracy, fluency, frequency, duration, and task
    steps and category-count charts for prompt, icon, and accommodation-used
    goals. Compare each result with the reading table and API response.
20. Verify no-target, no-data, limited-data, on-aim, above-aim, and below-aim
    labels in both directions. Confirm none declares mastery.
21. Add/remove intervention markers as teacher; verify chart position,
    CSV/print text, and persistence. Verify an aide sees no management controls.
22. Exercise Summary at 100%/200% zoom, keyboard-only, and screen reader.
    Verify chart title/description, non-color legend, category counts, form
    labels, focus order, and the underlying reading table.
23. Export CSV and print with commas, quotes, formulas, and line breaks in text;
    confirm correct escaping, dates, and synthetic labeling.
24. Open the Admin console at Chromebook width; verify section links, labeled
    fields, role presets, permission checkboxes, self-protection, and clear
    status/error messages using keyboard only.
25. Create a color, reload, open the navigation Color guide, and verify the
    explanation appears on both pointer hover and Tab focus. Confirm its name
    remains visible when color perception is unavailable.
26. Disable a second synthetic user while they hold a session, then verify the
    next request signs them out and the login picker no longer lists them.
27. Configure a student's rubric, prompt hierarchy, task analysis, and
    accommodations using keyboard-only input at Chromebook width and 200% zoom.
28. Record latency, a rubric work sample, and an ABC observation; confirm clear
    labels, 44px controls, save/queued status, Undo last, and report rendering.
29. Confirm the accommodation picker lists only that student's active plan and
    includes the setting in visible text.
30. Confirm every layout opens in Due today mode, reports the optional count,
    reveals off-schedule goals on request, and preserves active timer/queued
    state while toggling.
31. Complete a frequency window using minutes, then opportunities. Confirm the
    normalized unit, numerator, denominator, and raw reading all match in the
    goal row, summary table, CSV, and print view.
32. Open quantitative summaries with increasing and decreasing targets. Verify
    recent trend wording, `n`, observation days, date span, and range against
    the reading table, including insufficient/no-direction states.
33. Verify a changing prompt hierarchy renders dated levels and a task analysis
    renders every configured step with reached count/percentage. Confirm neither
    display declares mastery automatically.
34. Log a used accommodation with goal, session, activity, setting, and fidelity;
    log a not-used support with a reason. Verify the per-student/support/setting
    report shows exact `n` and the descriptive/no-causal warning.
35. At Chromebook width, keyboard-only and 200% zoom, operate the readiness
    queue and reconciliation form. Verify headings, labels, errors, focus order,
    status announcements, table overflow, and that meaning is not color-only.
36. Rename a synthetic student, open their data plan, then retire them after
    reading the preservation warning. Confirm they leave the active roster and
    that an administrator can still see the action in Audit history.
37. Review and refresh Audit history at Chromebook width using keyboard only.
    Verify the table caption/header relationships, chronological content,
    retired-actor visibility, horizontal scrolling, and absence of sensitive
    changed values.

## External gates

- The 2026-09-03 admin/data-readiness production release passed its synthetic
  data guard, two managed migration rehearsals, journal-aware production
  migration, 81-test/lint/type/build gates, Git-linked Vercel build, guarded
  live admin lifecycle, rendered teacher/admin smoke, and post-test runtime
  error scan. Production is on commit `a44997f`, deployment
  `dpl_91TrcdW5EkVYRr5gaQq4vcSNvizL`, with migrations through
  `0007_superb_tiger_shark.sql`.
- Production migrations `0002`–`0005`, authenticated API checks, teacher group
  create/update/retire, aide read/403 authorization, independent staff
  preferences, and a Chrome Phase 1–3 smoke test passed against the synthetic
  pilot on 2026-09-03. See `docs/TEST_RESULTS.md` for deployment IDs and
  evidence. The temporary release-check group was soft-retired and both test
  accounts were reset to default preferences.
- The Phase 4 upgrade rehearsal, idempotent observation retry, populated-goal
  target versioning, teacher intervention lifecycle, aide read/403 matrix, and
  summary/CSV/print checks passed on disposable synthetic Neon branches. A
  fresh database also passed migrations `0000`–`0006`, true second-classroom
  isolation, and direct audit-row inspection. Disposable branch cleanup remains.
- Keyboard login, Timers start/stop/undo, chart selection, 1366×768 layout, and
  half-width reflow equivalent to 200% effective CSS pixels passed. A native
  browser 200%-zoom run, real screen reader, offline/reconnect, and second-device
  preference matrix still require human execution.
- The Phase 3 production runtime error scan completed with no matching entries
  in the one-hour post-test window.
- The disposable seed guaranteed duration goals; keyboard Start/Stop/Undo passed.
  The unchanged production seed may still lack a duration goal, so production
  timer controls remain a post-deploy fixture-dependent check.
- Historical local migrations numbered `0006`–`0010` were never applied to
  production and were superseded during upstream reconciliation. Upstream
  `0006_melted_nomad.sql` remains the accommodation baseline; all Phase 4,
  admin, structured-metric, readiness, exposure, and contextual-accommodation
  changes ship together in `0007_superb_tiger_shark.sql`.
- The live synthetic API covers single-classroom permission/lifecycle behavior.
  True cross-classroom denials and direct isolation inspection remain evidenced
  by the disposable two-classroom suite, not the one-classroom production seed.
- Native 200% zoom, real screen-reader use, offline/reconnect, a second-device
  preference check, and a duration-goal Timers fixture remain human or
  fixture-dependent follow-ups.
- HCPSS privacy, security, accessibility, and operational approval remains a
  Track B gate. These tests do not authorize real student data.
