"use client";

import type { Goal, Student } from "@/lib/db/types";
import type { EntryActions } from "./types";

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function TimerView({
  students,
  goalsByStudent,
  actions,
}: {
  students: Student[];
  goalsByStudent: Map<string, Goal[]>;
  actions: EntryActions;
}) {
  const rows = students.flatMap((student) =>
    (goalsByStudent.get(student.id) ?? [])
      .filter(
        (goal) =>
          goal.metricType === "duration_seconds" || goal.metricType === "latency_seconds"
      )
      .map((goal) => ({ student, goal }))
  );

  if (rows.length === 0) {
    return (
      <div className="card">
        <p style={{ fontWeight: 600 }}>No duration goals in this roster view.</p>
        <p className="text-muted text-sm mt-1">Choose All students or another group, or use Focus mode for other goal types.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      {rows.map(({ student, goal }) => {
        const running = actions.timerRunningForGoal(goal.id);
        const measurement = actions.measurementStatusForGoal(goal.id);
        const saveStatus = actions.saveStatusForGoal(goal.id);
        const isAbsent = actions.isStudentAbsent(student.id);
        return (
          <section key={goal.id} className="card elev-sm" aria-label={`${student.displayName}: ${goal.goalText}`}>
            <p className="card-kicker">
              {student.displayName}
              {isAbsent && <span className="tag tag-neutral ml-2">Absent</span>}
            </p>
            <h2 style={{ fontSize: 18 }}>{goal.goalText}</h2>
            <p className="text-muted text-sm mt-1">{measurement.label}</p>
            {goal.measurementPlan?.observationWindowMinutes && (
              <p className="text-muted text-xs mt-1">Planned window: {goal.measurementPlan.observationWindowMinutes} minutes</p>
            )}
            <div
              className="mt-3"
              style={{ fontFamily: "ui-monospace, monospace", fontSize: 44, fontWeight: 700, letterSpacing: "0.04em" }}
              aria-live="off"
            >
              {clock(actions.timerSecondsForGoal(goal.id))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={actions.disabled || isAbsent}
                aria-label={`${running ? "Stop" : "Start"} timer for ${student.displayName}, ${goal.goalText}`}
                onClick={() => running ? actions.onStopTimer(goal.id) : actions.onStartTimer(goal.id)}
              >
                {running ? "Stop and save" : "Start timer"}
              </button>
              {!running && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={actions.disabled || isAbsent}
                  aria-label={`Record no occurrence for ${student.displayName}, ${goal.goalText}`}
                  onClick={() => actions.onCompleteObservation(goal.id)}
                >
                  No occurrence
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                disabled={actions.disabled || isAbsent || !actions.canUndoForGoal(goal.id)}
                aria-label={`Undo last timer observation for ${student.displayName}, ${goal.goalText}`}
                onClick={() => actions.onUndoLast(goal.id)}
              >
                Undo last
              </button>
            </div>
            <p role="status" aria-live="polite" className="text-xs mt-2">
              {saveStatus === "idle" ? "" : saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "queued" ? "Queued for retry" : "Save failed"}
            </p>
          </section>
        );
      })}
    </div>
  );
}
