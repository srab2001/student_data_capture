# User guide

This is the repository copy of the Phase 1–3 workflow guide. The same guidance
is presented in the application at `/help`.

## Prerequisites

- Use synthetic students only. Real identifiable student data is prohibited
  until the approvals in `docs/compliance.md` are complete.
- The environment must have migrations `0002_mighty_maggott.sql` through
  `0005_colorful_clea.sql` applied in order. Migrations `0002`–`0005` are
  applied on the hosted synthetic pilot as of 2026-09-03; local and preview
  databases still require `npm run db:migrate` before use.
- Sign in at `/login` as a synthetic teacher or aide. The picker is not
  production authentication.

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

Use the roster-group menu to narrow any workflow. Teachers can open **Manage
groups** to create, edit, or retire groups. Aides can use teacher-created groups
but cannot change them. Groups only filter the screen; they do not add or
remove students from the classroom.

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

- Accuracy: tap check or X once for each trial.
- Frequency: tap Tally once per occurrence, then select **Window complete**
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

## Manage goals

From a student's Card-stack view, choose **Manage goals**. Teachers can add,
edit, or retire goals. Task-analysis goals require one to twenty unique step
labels.

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

If observations already exist, changing goal text, metric type, icon set, task
steps, or any measurement-plan field creates a replacement version and retires
the previous definition. The old observations and plan remain in historical
summaries/API data.

## Log accommodations

In Card stack, open **Log accommodation**, choose the accommodation, optionally
rate effectiveness, and log Used or Not used. A blank effectiveness rating is
stored as blank. Student-level accommodation logs currently require a network
connection and are not part of the offline observation queue.

## Review progress

Open `/summary`, choose date/student/domain filters, and select a goal.
Multiple event rows from one session are aggregated for display without
discarding the underlying observations. Retired goal versions appear when they
have data in the selected period.

## Troubleshooting

- **Queued does not clear:** verify the Chromebook is online and leave the tab
  open for a retry. Reloading is safe; the staff-specific queue persists.
- **Failed:** use Undo last and record the observation again. Save the visible
  error message for support if it repeats.
- **Entry screen will not load:** sign out and back in. If it persists, the
  database may be unavailable or missing migrations `0002` through `0005`.
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
