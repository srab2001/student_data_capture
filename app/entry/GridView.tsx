"use client";

import type { Student, Goal } from "@/lib/db/types";
import type { EntryActions } from "./types";
import { GoalRow } from "./GoalRow";

const DOMAIN_LABEL: Record<Goal["domain"], string> = {
  academic: "Academic",
  behavioral: "Behavioral",
  independence: "Independence",
  accommodation: "Accommodation",
};

/** Spreadsheet-style view: one row per goal, flattened across the roster. Traded note/accommodation controls for density, per the design handoff. */
export function GridView({
  students,
  goalsByStudent,
  actions,
}: {
  students: Student[];
  goalsByStudent: Map<string, Goal[]>;
  actions: EntryActions;
}) {
  const rows = students.flatMap((student) =>
    (goalsByStudent.get(student.id) ?? []).map((goal) => ({ student, goal }))
  );

  return (
    <div className="card elev-sm" style={{ padding: 0, overflow: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Goal</th>
            <th>Domain</th>
            <th>Today</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ student, goal }) => (
            <tr key={goal.id}>
              <td style={{ whiteSpace: "nowrap" }}>{student.displayName}</td>
              <td>{goal.goalText}</td>
              <td>
                <span className="tag tag-neutral">{DOMAIN_LABEL[goal.domain]}</span>
              </td>
              <td>
                <GoalRow
                  goal={goal}
                  dataPoint={actions.dataPointForGoal(goal.id)}
                  timerSeconds={actions.timerSecondsForGoal(goal.id)}
                  timerRunning={actions.timerRunningForGoal(goal.id)}
                  onTapAccuracy={(correct) => actions.onTapAccuracy(goal.id, correct)}
                  onTapTally={() => actions.onTapTally(goal.id)}
                  onSetIconReading={(value) => actions.onSetIconReading(goal.id, value)}
                  onSetPromptLevel={(value) => actions.onSetPromptLevel(goal.id, value)}
                  onSetFluencyRate={(value) => actions.onSetFluencyRate(goal.id, value)}
                  onSetTaskStep={(step) => actions.onSetTaskStep(goal.id, step)}
                  onSetAccommodationUsed={(used) => actions.onSetAccommodationUsed(goal.id, used)}
                  onStartTimer={() => actions.onStartTimer(goal.id)}
                  onStopTimer={() => actions.onStopTimer(goal.id)}
                  onNoteBlur={(note) => actions.onNoteBlur(goal.id, note)}
                  disabled={actions.disabled}
                  showDomainAndText={false}
                  showNote={false}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted" style={{ textAlign: "center", padding: "var(--space-6)" }}>
                No active goals.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
