"use client";

import { useState } from "react";
import type { Student, Goal, DataPoint } from "@/lib/db/types";
import { GoalRow } from "./GoalRow";
import { EffectivenessRatingPicker } from "@/components/IconDegreePicker";

const ACCOMMODATIONS = [
  "Extended time",
  "Preferential seating",
  "Visual schedule",
  "Noise-cancelling headphones",
  "Chunked assignments",
];

export function StudentCard({
  student,
  goals,
  dataPointForGoal,
  timerSecondsForGoal,
  timerRunningForGoal,
  onTapAccuracy,
  onTapTally,
  onSetIconReading,
  onSetPromptLevel,
  onSetFluencyRate,
  onSetTaskStep,
  onSetAccommodationUsed,
  onStartTimer,
  onStopTimer,
  onNoteBlur,
  onLogAccommodation,
  disabled,
}: {
  student: Student;
  goals: Goal[];
  dataPointForGoal: (goalId: string) => DataPoint | undefined;
  timerSecondsForGoal: (goalId: string) => number;
  timerRunningForGoal: (goalId: string) => boolean;
  onTapAccuracy: (goalId: string, correct: boolean) => void;
  onTapTally: (goalId: string) => void;
  onSetIconReading: (goalId: string, value: string) => void;
  onSetPromptLevel: (goalId: string, value: string) => void;
  onSetFluencyRate: (goalId: string, value: number) => void;
  onSetTaskStep: (goalId: string, step: number) => void;
  onSetAccommodationUsed: (goalId: string, used: boolean) => void;
  onStartTimer: (goalId: string) => void;
  onStopTimer: (goalId: string) => void;
  onNoteBlur: (goalId: string, note: string) => void;
  onLogAccommodation: (
    studentId: string,
    accommodationName: string,
    used: boolean,
    effectivenessRating: number
  ) => void;
  disabled?: boolean;
}) {
  const [accommodationOpen, setAccommodationOpen] = useState(false);
  const [accommodationName, setAccommodationName] = useState(ACCOMMODATIONS[0]);
  const [effectiveness, setEffectiveness] = useState<number | null>(null);

  return (
    <section
      aria-label={student.displayName}
      data-tour="student-card"
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
        {student.displayName}
      </h2>

      <div className="mt-3 space-y-2">
        {goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            dataPoint={dataPointForGoal(goal.id)}
            timerSeconds={timerSecondsForGoal(goal.id)}
            timerRunning={timerRunningForGoal(goal.id)}
            onTapAccuracy={(correct) => onTapAccuracy(goal.id, correct)}
            onTapTally={() => onTapTally(goal.id)}
            onSetIconReading={(value) => onSetIconReading(goal.id, value)}
            onSetPromptLevel={(value) => onSetPromptLevel(goal.id, value)}
            onSetFluencyRate={(value) => onSetFluencyRate(goal.id, value)}
            onSetTaskStep={(step) => onSetTaskStep(goal.id, step)}
            onSetAccommodationUsed={(used) => onSetAccommodationUsed(goal.id, used)}
            onStartTimer={() => onStartTimer(goal.id)}
            onStopTimer={() => onStopTimer(goal.id)}
            onNoteBlur={(note) => onNoteBlur(goal.id, note)}
            disabled={disabled}
          />
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-zinc-400 dark:text-zinc-600">No active goals.</p>
        )}
      </div>

      <div
        data-tour="accommodation-section"
        className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800"
      >
        <button
          type="button"
          onClick={() => setAccommodationOpen((v) => !v)}
          className="min-h-11 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
          aria-expanded={accommodationOpen}
        >
          {accommodationOpen ? "Hide accommodation log" : "+ Log accommodation"}
        </button>

        {accommodationOpen && (
          <div className="mt-2 space-y-2">
            <select
              value={accommodationName}
              onChange={(e) => setAccommodationName(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-zinc-200 px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              aria-label="Accommodation"
            >
              {ACCOMMODATIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-500">Effectiveness</span>
              <EffectivenessRatingPicker value={effectiveness} onChange={setEffectiveness} />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onLogAccommodation(student.id, accommodationName, true, effectiveness ?? 3);
                  setAccommodationOpen(false);
                  setEffectiveness(null);
                }}
                className="min-h-11 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm text-emerald-800 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              >
                Log as used
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onLogAccommodation(student.id, accommodationName, false, effectiveness ?? 3);
                  setAccommodationOpen(false);
                  setEffectiveness(null);
                }}
                className="min-h-11 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-700 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Log as not used
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
