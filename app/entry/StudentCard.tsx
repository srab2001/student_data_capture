"use client";

import { useState } from "react";
import Link from "next/link";
import type { Student, Goal, StudentAccommodation } from "@/lib/db/types";
import type { EntryActions } from "./types";
import { GoalRow } from "./GoalRow";
import { EffectivenessRatingPicker } from "@/components/IconDegreePicker";

function isLogged(goal: Goal, actions: EntryActions): boolean {
  const dp = actions.dataPointForGoal(goal.id);
  switch (goal.metricType) {
    case "accuracy_pct":
      return (dp?.trialsTotal ?? 0) > 0;
    case "duration_seconds":
      return (dp?.valueNumeric ?? 0) > 0 || actions.timerRunningForGoal(goal.id);
    case "frequency_count":
      return (dp?.valueNumeric ?? 0) > 0;
    case "prompt_level":
    case "icon_scale":
    case "accommodation_used":
      return !!dp?.valueEnum;
    case "task_analysis_step":
      return dp?.valueNumeric != null;
    default:
      return false;
  }
}

export function StudentCard({
  student,
  goals,
  accommodations,
  actions,
}: {
  student: Student;
  goals: Goal[];
  accommodations: StudentAccommodation[];
  actions: EntryActions;
}) {
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [accommodationName, setAccommodationName] = useState("");
  const [effectiveness, setEffectiveness] = useState<number | null>(null);
  const selectedAccommodation = accommodationName || accommodations[0]?.name || "";

  const loggedCount = goals.filter((g) => isLogged(g, actions)).length;

  return (
    <section aria-label={student.displayName} data-tour="student-card" className="card elev-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="card-kicker">
            {goals.length > 0 && loggedCount === goals.length
              ? "All goals logged today"
              : `${loggedCount}/${goals.length} logged today`}
          </div>
          <div className="card-title">{student.displayName}</div>
        </div>
        <Link href={`/goals/${student.id}`} className="btn btn-ghost">
          Manage goals
        </Link>
      </div>

      <div className="mt-3 flex flex-col gap-3">
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
          />
        ))}
        {goals.length === 0 && <p className="text-muted text-sm">No active goals.</p>}
      </div>

      <div data-tour="accommodation-section" className="mt-3" style={{ borderTop: "1px solid var(--color-neutral-200)", paddingTop: "var(--space-3)" }}>
        <button
          type="button"
          onClick={() => setAccommodationOpen((v) => !v)}
          className="btn btn-ghost"
          aria-expanded={accommodationOpen}
        >
          {accommodationOpen ? "Hide accommodation log" : "+ Log accommodation"}
        </button>

        {accommodationOpen && (
          accommodations.length === 0 ? (
            <p className="text-muted mt-2 text-sm">
              No accommodations configured yet —{" "}
              <Link href={`/goals/${student.id}`} className="underline underline-offset-4">
                add some
              </Link>
              .
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2" style={{ maxWidth: 360 }}>
              <select
                value={selectedAccommodation}
                onChange={(e) => setAccommodationName(e.target.value)}
                className="input"
                aria-label="Accommodation"
              >
                {accommodations.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-3">
                <span className="text-muted text-xs">Effectiveness</span>
                <EffectivenessRatingPicker value={effectiveness} onChange={setEffectiveness} />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actions.disabled}
                  onClick={() => {
                    actions.onLogAccommodation(student.id, selectedAccommodation, true, effectiveness ?? 3);
                    setAccommodationOpen(false);
                    setEffectiveness(null);
                  }}
                  className="btn btn-secondary"
                >
                  Log as used
                </button>
                <button
                  type="button"
                  disabled={actions.disabled}
                  onClick={() => {
                    actions.onLogAccommodation(student.id, selectedAccommodation, false, effectiveness ?? 3);
                    setAccommodationOpen(false);
                    setEffectiveness(null);
                  }}
                  className="btn btn-ghost"
                >
                  Log as not used
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}

export { isLogged };
