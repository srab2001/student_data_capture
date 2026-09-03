"use client";

import { useState } from "react";
import Link from "next/link";
import type { Student, Goal } from "@/lib/db/types";
import type { EntryActions } from "./types";
import { GoalRow } from "./GoalRow";
import { EffectivenessRatingPicker } from "@/components/IconDegreePicker";

function isLogged(goal: Goal, actions: EntryActions): boolean {
  const dp = actions.dataPointForGoal(goal.id);
  switch (goal.metricType) {
    case "accuracy_pct":
      return (dp?.trialsTotal ?? 0) > 0;
    case "duration_seconds":
    case "latency_seconds":
      return (dp?.valueNumeric ?? 0) > 0 || actions.timerRunningForGoal(goal.id);
    case "frequency_count":
      return (dp?.valueNumeric ?? 0) > 0;
    case "prompt_level":
    case "icon_scale":
    case "accommodation_used":
      return !!dp?.valueEnum;
    case "task_analysis_step":
      return dp?.valueNumeric != null;
    case "fluency_rate":
    case "rubric_score":
      return dp?.valueNumeric != null;
    case "abc_observation":
      return dp?.entryKind === "abc_observation";
    default:
      return false;
  }
}

export function StudentCard({
  student,
  goals,
  actions,
  canManageGoals,
}: {
  student: Student;
  goals: Goal[];
  actions: EntryActions;
  canManageGoals: boolean;
}) {
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const accommodations = actions.accommodationsForStudent(student.id);
  const [accommodationName, setAccommodationName] = useState("");
  const [effectiveness, setEffectiveness] = useState<number | null>(null);
  const [relatedGoalId, setRelatedGoalId] = useState("");
  const [activity, setActivity] = useState("");
  const [fidelity, setFidelity] = useState("");
  const [reasonNotUsed, setReasonNotUsed] = useState("");
  const selectedAccommodation = accommodations.find(
    (accommodation) => accommodation.name === accommodationName
  );

  function resetAccommodationForm() {
    setAccommodationOpen(false);
    setEffectiveness(null);
    setRelatedGoalId("");
    setActivity("");
    setFidelity("");
    setReasonNotUsed("");
  }

  const dueStatuses = goals
    .map((goal) => actions.measurementStatusForGoal(goal.id))
    .filter((status) => status.isDue);
  const completedDueCount = dueStatuses.filter((status) => status.isComplete).length;

  return (
    <section aria-label={student.displayName} data-tour="student-card" className="card elev-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="card-kicker">
            {dueStatuses.length === 0
              ? "No goals assigned today"
              : completedDueCount === dueStatuses.length
                ? "All due evidence collected"
                : `${completedDueCount}/${dueStatuses.length} due goals complete`}
          </div>
          <div className="card-title">{student.displayName}</div>
        </div>
        {canManageGoals && (
          <Link href={`/goals/${student.id}`} className="btn btn-ghost">
            Manage goals
          </Link>
        )}
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
            onCompleteObservation={() => actions.onCompleteObservation(goal.id)}
            onSetIconReading={(value) => actions.onSetIconReading(goal.id, value)}
            onSetPromptLevel={(value) => actions.onSetPromptLevel(goal.id, value)}
            onSetFluencyRate={(value) => actions.onSetFluencyRate(goal.id, value)}
            onLogRubric={(score, workSample, criterion) =>
              actions.onLogRubric(goal.id, score, workSample, criterion)
            }
            onLogAbc={(antecedent, behavior, consequence) =>
              actions.onLogAbc(goal.id, antecedent, behavior, consequence)
            }
            onSetTaskStep={(step) => actions.onSetTaskStep(goal.id, step)}
            onSetAccommodationUsed={(used) => actions.onSetAccommodationUsed(goal.id, used)}
            onStartTimer={() => actions.onStartTimer(goal.id)}
            onStopTimer={() => actions.onStopTimer(goal.id)}
            onNoteBlur={(note) => actions.onNoteBlur(goal.id, note)}
            canUndo={actions.canUndoForGoal(goal.id)}
            onUndoLast={() => actions.onUndoLast(goal.id)}
            saveStatus={actions.saveStatusForGoal(goal.id)}
            measurementStatus={actions.measurementStatusForGoal(goal.id)}
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
          <div className="mt-2 flex flex-col gap-2" style={{ maxWidth: 360 }}>
            <select
              value={accommodationName}
              onChange={(e) => setAccommodationName(e.target.value)}
              className="input"
              aria-label="Accommodation"
            >
              <option value="" disabled>Select an accommodation</option>
              {accommodations.map((accommodation) => (
                <option key={accommodation.id} value={accommodation.name}>
                  {accommodation.name} — {accommodation.setting}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3">
              <span className="text-muted text-xs">Effectiveness</span>
              <EffectivenessRatingPicker value={effectiveness} onChange={setEffectiveness} />
            </div>

            <label className="text-muted flex flex-col text-xs">
              Related goal (optional)
              <select
                className="input mt-1"
                value={relatedGoalId}
                onChange={(event) => setRelatedGoalId(event.target.value)}
              >
                <option value="">No specific goal</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.goalText}</option>
                ))}
              </select>
            </label>
            <label className="text-muted flex flex-col text-xs">
              Activity or task (optional)
              <input
                className="input mt-1"
                value={activity}
                maxLength={200}
                onChange={(event) => setActivity(event.target.value)}
                placeholder="e.g. independent reading"
              />
            </label>
            <label className="text-muted flex flex-col text-xs">
              Implementation fidelity (optional, 1–5)
              <select
                className="input mt-1"
                value={fidelity}
                onChange={(event) => setFidelity(event.target.value)}
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>{rating} of 5</option>
                ))}
              </select>
            </label>
            <label className="text-muted flex flex-col text-xs">
              If not used, why? (optional)
              <textarea
                className="input mt-1"
                rows={2}
                maxLength={500}
                value={reasonNotUsed}
                onChange={(event) => setReasonNotUsed(event.target.value)}
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={actions.disabled || !accommodationName}
                onClick={() => {
                  if (!accommodationName) return;
                  actions.onLogAccommodation(
                    student.id,
                    accommodationName,
                    true,
                    effectiveness,
                    {
                      sessionId: null,
                      goalId: relatedGoalId || null,
                      setting: selectedAccommodation?.setting ?? null,
                      activity: activity.trim() || null,
                      implementationFidelity: fidelity ? Number(fidelity) : null,
                      reasonNotUsed: null,
                    }
                  );
                  resetAccommodationForm();
                }}
                className="btn btn-secondary"
              >
                Log as used
              </button>
              <button
                type="button"
                disabled={actions.disabled || !accommodationName}
                onClick={() => {
                  if (!accommodationName) return;
                  actions.onLogAccommodation(
                    student.id,
                    accommodationName,
                    false,
                    null,
                    {
                      sessionId: null,
                      goalId: relatedGoalId || null,
                      setting: selectedAccommodation?.setting ?? null,
                      activity: activity.trim() || null,
                      implementationFidelity: null,
                      reasonNotUsed: reasonNotUsed.trim() || null,
                    }
                  );
                  resetAccommodationForm();
                }}
                className="btn btn-ghost"
              >
                Log as not used
              </button>
            </div>
            {accommodations.length === 0 && (
              <p className="text-muted text-xs">
                No accommodations are configured for this student. An administrator can add
                them from the student data plan.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export { isLogged };
