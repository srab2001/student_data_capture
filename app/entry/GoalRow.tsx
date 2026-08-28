"use client";

import { useState } from "react";
import type { Goal, DataPoint } from "@/lib/db/types";
import { IconDegreePicker } from "@/components/IconDegreePicker";
import { PROMPT_LEVELS } from "@/lib/icon-sets";
import type { IconSetKey } from "@/lib/icon-sets";

const DOMAIN_LABEL: Record<Goal["domain"], string> = {
  academic: "Academic",
  behavioral: "Behavioral",
  independence: "Independence",
  accommodation: "Accommodation",
};

export function GoalRow({
  goal,
  dataPoint,
  timerSeconds,
  timerRunning,
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
  disabled,
}: {
  goal: Goal;
  dataPoint: DataPoint | undefined;
  timerSeconds: number;
  timerRunning: boolean;
  onTapAccuracy: (correct: boolean) => void;
  onTapTally: () => void;
  onSetIconReading: (value: string) => void;
  onSetPromptLevel: (value: string) => void;
  onSetFluencyRate: (value: number) => void;
  onSetTaskStep: (step: number) => void;
  onSetAccommodationUsed: (used: boolean) => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onNoteBlur: (note: string) => void;
  disabled?: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(!!dataPoint?.note);
  const total = dataPoint?.trialsTotal ?? 0;
  const correct = dataPoint?.trialsCorrect ?? 0;
  const pct = total > 0 ? Math.round((correct / total) * 100) : null;

  return (
    <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            {DOMAIN_LABEL[goal.domain]}
          </p>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {goal.goalText}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          className="min-h-11 shrink-0 rounded-md px-2 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-900"
          aria-expanded={noteOpen}
        >
          {noteOpen ? "Hide note" : "+ Note"}
        </button>
      </div>

      <div className="mt-2">
        {goal.metricType === "accuracy_pct" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onTapAccuracy(true)}
              className="min-h-11 min-w-11 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              aria-label="Correct trial"
            >
              ✓
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onTapAccuracy(false)}
              className="min-h-11 min-w-11 rounded-lg border border-red-200 bg-red-50 px-3 text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              aria-label="Incorrect trial"
            >
              ✗
            </button>
            <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
              {correct}/{total}
              {pct !== null && ` (${pct}%)`}
            </span>
          </div>
        )}

        {goal.metricType === "fluency_rate" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-500">
              Correct words / min
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={dataPoint?.valueNumeric ?? ""}
              disabled={disabled}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) onSetFluencyRate(n);
              }}
              className="min-h-11 w-24 rounded-lg border border-zinc-200 px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
        )}

        {goal.metricType === "frequency_count" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onTapTally}
              className="min-h-11 min-w-11 rounded-lg border border-zinc-200 bg-white px-4 font-mono text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              aria-label="Tally occurrence"
            >
              Tally: {dataPoint?.valueNumeric ?? 0}
            </button>
          </div>
        )}

        {goal.metricType === "icon_scale" && (
          <IconDegreePicker
            iconSet={(goal.iconSet ?? "smiley_5") as IconSetKey}
            value={dataPoint?.valueEnum}
            onChange={onSetIconReading}
            label={`${goal.goalText} rating`}
            disabled={disabled}
          />
        )}

        {goal.metricType === "duration_seconds" && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
              {String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:
              {String(timerSeconds % 60).padStart(2, "0")}
            </span>
            {timerRunning ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onStopTimer}
                className="min-h-11 rounded-lg border border-red-200 bg-red-50 px-3 text-sm text-red-800 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={onStartTimer}
                className="min-h-11 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm text-emerald-800 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              >
                Start
              </button>
            )}
          </div>
        )}

        {goal.metricType === "prompt_level" && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Prompt level">
            {PROMPT_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                disabled={disabled}
                aria-pressed={dataPoint?.valueEnum === level.value}
                onClick={() => onSetPromptLevel(level.value)}
                className={`min-h-11 rounded-full border px-3 text-xs font-medium disabled:opacity-50 ${
                  dataPoint?.valueEnum === level.value
                    ? "border-amber-600 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        )}

        {goal.metricType === "task_analysis_step" && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Task analysis step">
            {[1, 2, 3, 4, 5].map((step) => (
              <button
                key={step}
                type="button"
                disabled={disabled}
                aria-pressed={dataPoint?.valueNumeric === step}
                onClick={() => onSetTaskStep(step)}
                className={`min-h-11 min-w-11 rounded-lg border text-sm font-medium disabled:opacity-50 ${
                  dataPoint?.valueNumeric === step
                    ? "border-amber-600 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {step}
              </button>
            ))}
          </div>
        )}

        {goal.metricType === "accommodation_used" && (
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={dataPoint?.valueEnum === "used"}
              onClick={() => onSetAccommodationUsed(true)}
              className={`min-h-11 rounded-lg border px-3 text-sm font-medium disabled:opacity-50 ${
                dataPoint?.valueEnum === "used"
                  ? "border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              }`}
            >
              Used
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={dataPoint?.valueEnum === "not_used"}
              onClick={() => onSetAccommodationUsed(false)}
              className={`min-h-11 rounded-lg border px-3 text-sm font-medium disabled:opacity-50 ${
                dataPoint?.valueEnum === "not_used"
                  ? "border-zinc-500 bg-zinc-200 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-100"
                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              }`}
            >
              Not used
            </button>
          </div>
        )}
      </div>

      {noteOpen && (
        <textarea
          defaultValue={dataPoint?.note ?? ""}
          onBlur={(e) => onNoteBlur(e.target.value)}
          disabled={disabled}
          placeholder="Optional note…"
          rows={2}
          className="mt-2 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950"
        />
      )}
    </div>
  );
}
