"use client";

import { useState } from "react";
import type { Student, Goal } from "@/lib/db/types";
import type { EntryActions } from "./types";
import { GoalRow } from "./GoalRow";
import { isLogged } from "./StudentCard";

/** Collapsed roster by default; expanding a student reveals the same goal blocks as Card stack, minus the note/manage-goals affordances, per the design handoff. */
export function AccordionView({
  students,
  goalsByStudent,
  actions,
}: {
  students: Student[];
  goalsByStudent: Map<string, Goal[]>;
  actions: EntryActions;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col gap-3">
      {students.map((student) => {
        const goals = goalsByStudent.get(student.id) ?? [];
        const loggedCount = goals.filter((g) => isLogged(g, actions)).length;
        const isExpanded = !!expanded[student.id];

        return (
          <div key={student.id} className="card elev-sm">
            <button
              type="button"
              onClick={() => setExpanded((s) => ({ ...s, [student.id]: !s[student.id] }))}
              className="flex w-full items-center justify-between gap-3"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)", color: "var(--color-text)" }}
              aria-expanded={isExpanded}
            >
              <span className="card-title" style={{ margin: 0 }}>
                {isExpanded ? "▾" : "▸"} {student.displayName}
              </span>
              <span className="text-muted text-xs">
                {goals.length > 0 && loggedCount === goals.length
                  ? "All goals logged today"
                  : `${loggedCount}/${goals.length} logged today`}
              </span>
            </button>

            {isExpanded && (
              <div
                className="mt-3 flex flex-col gap-3"
                style={{ borderLeft: "2px dashed var(--color-neutral-300)", paddingLeft: "var(--space-3)" }}
              >
                {goals.map((goal) => (
                  <GoalRow
                    key={goal.id}
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
                    showNote={false}
                  />
                ))}
                {goals.length === 0 && <p className="text-muted text-sm">No active goals.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
