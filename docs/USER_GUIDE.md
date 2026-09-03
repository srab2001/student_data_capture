# User guide

This is the repository copy of the Phase 1–4 workflow and classroom-admin
guide. The same guidance is presented in the application at `/help`. The full
workflow is live only as a synthetic-data pilot; Track B approval is still
required before any identifiable student data is entered.

## Prerequisites

- Use synthetic students only. Real identifiable student data is prohibited
  until the approvals in `docs/compliance.md` are complete.
- Run `npm run db:migrate` so the environment has every checked-in migration
  through `0007_superb_tiger_shark.sql`. The hosted synthetic pilot has all
  eight journal entries as of 2026-09-03. `0006_melted_nomad.sql` introduces
  per-student supports; consolidated `0007` adds decision support, admin access,
  colors, structured metrics, readiness, exposure, and accommodation context.
- Sign in at `/login` as a synthetic teacher, aide, or admin. The picker is not
  production authentication.

## Administer the classroom

Open `/admin` when your account has at least one configuration permission.
The page shows only the sections that permission allows.

- **Users:** add teacher, aide, or admin records; apply a role preset; then
  adjust user management, student management, goal management, color
  management, observation-entry, and report-viewing permissions individually.
  Turn off **Sign-in access enabled** to block new sign-ins and invalidate an
  existing session on its next request. You cannot retire yourself or remove
  your own user-management access, and the classroom must retain at least one
  active user manager.
- **Students & goals:** add or rename a synthetic student, then choose
  **Configure data plan** beside that student. Goal management supports create,
  edit/version, and retire. **Retire student** removes the student from active
  rosters while preserving their goals, observations, and audit history.
- **Color guide:** add, edit, order, or remove named colors and their short
  explanations. The guide appears in the signed-in navigation. Open it, then
  hover a swatch or move keyboard focus to it to read the explanation. Color is
  never the only cue: each swatch always retains a text name and screen-reader
  label.
- **Audit history:** user managers can review the 50 most recent classroom
  actions, including the staff member, time, action, configuration area, and
  names of changed fields. The screen intentionally does not expose changed
  field values. Retired staff members' earlier actions remain visible.

Role presets are starting points, not the authorization rule. The explicit
permissions saved on each user determine which routes and controls are
available. All admin operations remain scoped to the signed-in classroom and
are audit logged. The admin console is for configuration and oversight: it does
not rewrite historical observations, infer mastery, or replace IEP-team
decisions.

## Choose a classroom workflow

Open `/entry` and select the workflow that fits the moment:

- **Roster** shows the selected roster group using Card stack, Grid, or
  Accordion. Switching layouts never changes the underlying observation data.
- **Focus** keeps one student on screen. Use the student menu or Previous/Next
  buttons to move through the selected group.
- **Timers** gathers duration goals for the selected students into large
  start/stop controls. Choose **No occurrence** when a planned window ends
  without the target behavior.

Your workflow mode, Roster layout, and selected group are saved to your staff
account. The currently focused student is not saved.

Use the roster-group menu to narrow any workflow. Staff with student-management
permission can open **Manage groups** to create, edit, or retire groups. Other
staff can use shared groups but cannot change them. Groups only filter the
screen; they do not add or remove students from the classroom.

## Record observations

All workflow modes use the same session, observation queue, timers, save state,
and undo behavior.

Read the plan status before collecting:

- `N/required observations due` means the signed-in staff role is assigned and
  the goal is scheduled for today.
- `N/required collected` means today's minimum evidence has been reached. More
  observations may still be recorded when instructionally appropriate.
- `Not scheduled today`, `Not active yet`, `Plan ended`, or `Assigned to
  teacher/aide` means the goal is not included in this staff member's due count.
- `Measurement plan incomplete` identifies a pre-Phase-2 goal. It remains
  usable, but a teacher should add the real measurement plan before relying on
  the due/evidence guidance.

Student headers count due goals only. In Card and Accordion layouts, open
**Collection directions** to review what counts, the collection method,
mastery criterion, and required opportunities or observation window.

The screen opens with **Due today** goals. Choose **Show optional goals** to
temporarily include goals assigned to another day, role, or effective period.
Optional collection remains available and is reported separately from planned
compliance; it does not inflate planned completion above 100%.

- Accuracy: tap check or X once for each trial.
- Frequency: tap Tally once per occurrence, enter the actual observation
  minutes, opportunities, or both, then select **Window complete**
  when the planned observation window ends. Select it even when the tally is
  zero; zero occurrences are valid evidence.
- Duration: start and stop the timer. Each stop preserves a timer segment; the
  screen displays the session total. Select **No occurrence** when the planned
  observation ends without the behavior occurring.
- Fluency: enter the rate and leave the field.
- Prompt or icon scale: tap once for each observation. The latest choice is
  highlighted, but earlier observations are retained.
- Task analysis: tap the named step reached by the student.
- Goal-level accommodation: select Used or Not used.
- Note: open the note, type the observation, and leave the field to save it.

Each goal reports its own state:

- **Saving:** the request is in progress.
- **Saved:** the server accepted it.
- **Queued:** the network request could not complete. The observation remains
  on this Chromebook for this signed-in staff member and retries on reconnect
  and every 15 seconds.
- **Failed:** the server rejected the observation. Use Undo last and record it
  again; if the problem repeats, report the error rather than continuing.

## Correct the last observation

Select **Undo last** on the relevant goal. It removes the most recent
non-legacy event entered by the signed-in staff member and recalculates the
display. Aides cannot undo another staff member's past entry.

Undo is unavailable while that goal is actively saving. Historical
`legacy_snapshot` rows cannot be undone from the event UI.

## Configure a student data plan

From a student's Card-stack view choose **Manage goals**, or from the admin
console choose **Configure data plan**.
Any staff member with goal-management permission can add, edit, or retire
goals. Task-analysis goals require one to twenty unique step labels.

The top of the page shows the four supported evidence areas: academic
performance/mastery, behavioral/functional, independence/support, and
accommodations/access. Choose a goal entry control that matches the IEP team's
measurement method:

- accuracy trials for percent-correct probes;
- fluency rate for correct responses per minute;
- rubric score for a named work sample and configured criterion;
- behavior tally, duration timer, latency timer, or structured ABC record;
- a student-specific prompt hierarchy or task-analysis checklist; or
- accommodation-used when accommodation delivery is itself an IEP goal.

Rubric goals require a rubric title, maximum score, and at least one criterion.
Prompt goals require at least two unique levels ordered from greatest support
to independence. ABC entry requires separate antecedent, observable behavior,
and consequence text; do not include diagnoses or unrelated confidential
narrative.

Each new goal also requires a measurement plan:

- the IEP baseline and mastery criterion;
- an observable definition that states what counts;
- a repeatable measurement method and setting/activity;
- collection days and the minimum observations due on each scheduled day;
- either opportunities per observation, a timed observation window, or both;
- the teacher/aide role responsible for collection; and
- effective start date and optional end date.

Use the wording and values from the student's approved IEP and local progress-
monitoring procedures. Do not guess or accept synthetic placeholder text for a
real student.

Administrators should first open **Admin → Data readiness**. The guided queue
lists each active goal whose plan is incomplete and links directly to that goal.
The same section lists historical accommodation names that do not yet have a
confirmed active assignment. Enter the approved setting and implementation
directions to activate each support; the app never invents those values.

Set cadence to Every session, Daily, Weekly, Every two weeks, Monthly, or
Quarterly reporting summary, as determined by the IEP team. Scheduled weekdays
and observations required remain the source of truth for due-status math.
Quarterly is a reporting cadence; it does not replace the probes or observations
scheduled in the measurement plan. HCPSS reporting timing must be confirmed by
district policy before real use.

For accuracy, fluency, frequency, duration, latency, rubric, and task-step goals, a goal manager
can optionally enable **Show an aim line** and enter an explicit baseline value/date,
target value/date, and increase/decrease direction. The dates and values must be
complete and internally consistent. Leave this off when the approved plan does
not define an appropriate numeric target—the app will not infer one from the
narrative mastery criterion.

If observations already exist, changing goal text, metric type, icon set, task
steps, prompt hierarchy, rubric, cadence, or any measurement-plan field creates a replacement version and retires
the previous definition. The old observations and plan remain in historical
summaries/API data.

## Log accommodations

First use the student data plan's **Accommodations & access** section to assign
each IEP-team-approved support with its setting and implementation directions.
Removing an assignment hides it from new logs but retains its historical logs.

In Card stack, open **Log accommodation**, choose an assigned accommodation,
and optionally connect it to today's session, a goal, an activity, and the
configured setting. When it was used, staff may rate effectiveness and
implementation fidelity from 1–5. When it was not used, staff may record why.
Blank optional fields remain blank. Student-level accommodation logs currently
require a network connection and are not part of the offline observation queue.

Rubric and ABC goal observations use the same staff-specific offline queue as
other goal data. Reports display structured ABC fields and work-sample identity,
and the CSV includes them in the `structured_observations` column.

## Review progress

Open `/summary`, choose date/student/domain filters, and select a goal.
Multiple event rows from one session are aggregated for display without
discarding the underlying observations. Retired goal versions appear when they
have data in the selected period.

The goal list shows current value, a direction-aware recent-window comparison,
percent of scheduled evidence collected, and the number of observation days.
The trend includes `n`, the observed range, and the configured favorable
direction when available. Without a target direction it says that direction is
not configured rather than treating an upward arrow as improvement. Goals with
missing scheduled evidence appear first. In the detail panel:

- **Collection** compares observations collected on scheduled days with the
  measurement-plan requirement; extra observations do not inflate it above 100%.
- **Evidence depth** says no evidence, limited/interpret cautiously for one or
  two observation days, or descriptive trend for three or more days.
- **Aim line** compares the latest numeric reading with the explicit target path,
  if one was configured. `Aim line not configured` is a valid state.
- Quantitative goals use a dated line chart. Frequency charts use the actual
  window or opportunity denominator when recorded. Prompt goals show their
  hierarchy positions over time, task analyses report the proportion of
  sessions reaching each step, and non-ordered icon/accommodation categories
  remain exact counts.

The accommodation table groups logs by student, support, and setting. It shows
use, effectiveness, fidelity, context linkage, and the exact sample size for
each average. These are descriptive implementation data only; the app does not
claim that a support caused a student outcome.

These labels support professional review; they do not declare mastery, select an
intervention, or replace the IEP team's judgment.

Staff with goal-management permission can add a dated intervention marker with a brief description such as
“Began visual task checklist.” The marker appears on numeric charts and in CSV
and print output. Avoid confidential narrative details. Removing a marker
soft-retires it and keeps the audit history. Aides can view markers but cannot
add or remove them. Aides also cannot add students or manage goals/groups.

## Troubleshooting

- **Queued does not clear:** verify the Chromebook is online and leave the tab
  open for a retry. Reloading is safe; the staff-specific queue persists.
- **Failed:** use Undo last and record the observation again. Save the visible
  error message for support if it repeats.
- **Entry, Summary, or Admin will not load:** confirm the account has the
  matching permission, then sign out and back in. If it persists, the database
  may be unavailable or missing migrations `0002` through `0007`.
- **A disabled user still has a page open:** their next server request is
  rejected; ask them to refresh or sign out. Offline queued observations remain
  synthetic-only and should be reviewed before retiring access.
- **Color comment is not visible:** open Color guide, then hover the named
  swatch or use Tab to focus it. Touch/keyboard focus exposes the same text.
- **Goal stays marked plan incomplete:** open Manage goals, complete every plan
  field except the optional end date, and enter opportunities or a window.
- **Goal is not in today's due count:** confirm its effective dates, weekday
  schedule, and responsible collector role in Manage goals.
- **Wrong staff member:** sign out before switching users. Pending queues are
  isolated by prototype staff ID.
- **A student is missing:** choose **All students** from the roster-group menu.
- **Timers is empty:** the selected group has no duration goals; choose another
  group or use Focus/Roster for other goal types.
- **Preferences did not save:** keep working in the current view, reconnect,
  and change the setting once more. Observation saving is separate from
  preference saving.
- **Aim line is unavailable:** only quantitative goal metrics support one. Open
  Manage goals with goal-management permission and enter all four values/dates
  plus the direction.
- **Collection says plan incomplete:** the historical goal has no structured
  measurement plan. A teacher must enter the approved plan; the app will not
  backfill it.
