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

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

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
  showDomainAndText = true,
  showNote = true,
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
  /** Grid rows show the widget only — the goal text/domain live in their own columns. */
  showDomainAndText?: boolean;
  /** Grid and Accordion drop the note affordance for density (per design handoff). */
  showNote?: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(!!dataPoint?.note);
  const total = dataPoint?.trialsTotal ?? 0;
  const correct = dataPoint?.trialsCorrect ?? 0;
  const pct = total > 0 ? Math.round((correct / total) * 100) : null;

  return (
    <div className={showDomainAndText ? "goalblock" : undefined}>
      {showDomainAndText && (
        <div className="flex items-start justify-between gap-2" style={{ alignItems: "baseline" }}>
          <div>
            <p className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {DOMAIN_LABEL[goal.domain]}
            </p>
            <p style={{ fontWeight: 600 }}>{goal.goalText}</p>
          </div>
          {showNote && (
            <button
              type="button"
              data-tour="note-toggle"
              onClick={() => setNoteOpen((v) => !v)}
              className="btn btn-ghost shrink-0"
              aria-expanded={noteOpen}
            >
              {noteOpen ? "Hide note" : "+ Note"}
            </button>
          )}
        </div>
      )}

      <div className="mt-2">
        {goal.metricType === "accuracy_pct" && (
          <div data-tour="accuracy-counter" className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onTapAccuracy(true)}
              className="btn btn-secondary iconbtn"
              aria-label="Correct trial"
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onTapAccuracy(false)}
              className="btn btn-secondary iconbtn"
              aria-label="Incorrect trial"
            >
              <XIcon />
            </button>
            <span className="text-muted">
              {total > 0 ? `${correct}/${total}${pct !== null ? ` (${pct}%)` : ""}` : "No trials yet"}
            </span>
          </div>
        )}

        {goal.metricType === "fluency_rate" && (
          <div className="flex items-center gap-2">
            <label className="text-muted text-xs">Correct words / min</label>
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
              className="input"
              style={{ width: 96 }}
            />
          </div>
        )}

        {goal.metricType === "frequency_count" && (
          <div data-tour="tally-counter" className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onTapTally}
              className="btn btn-secondary"
              aria-label="Tally occurrence"
            >
              Tally: {dataPoint?.valueNumeric ?? 0}
            </button>
          </div>
        )}

        {goal.metricType === "icon_scale" && (
          <div data-tour="icon-picker">
            <IconDegreePicker
              iconSet={(goal.iconSet ?? "smiley_5") as IconSetKey}
              value={dataPoint?.valueEnum}
              onChange={onSetIconReading}
              label={`${goal.goalText} rating`}
              disabled={disabled}
            />
          </div>
        )}

        {goal.metricType === "duration_seconds" && (
          <div data-tour="timer" className="flex items-center gap-2">
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 15 }}>
              {String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:
              {String(timerSeconds % 60).padStart(2, "0")}
            </span>
            {timerRunning ? (
              <button type="button" disabled={disabled} onClick={onStopTimer} className="btn btn-secondary">
                Stop
              </button>
            ) : (
              <button type="button" disabled={disabled} onClick={onStartTimer} className="btn btn-secondary">
                Start
              </button>
            )}
          </div>
        )}

        {goal.metricType === "prompt_level" && (
          <div data-tour="prompt-chips" className="flex flex-wrap gap-2" role="group" aria-label="Prompt level">
            {PROMPT_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                disabled={disabled}
                aria-pressed={dataPoint?.valueEnum === level.value}
                onClick={() => onSetPromptLevel(level.value)}
                className={dataPoint?.valueEnum === level.value ? "chip chip-on" : "chip"}
              >
                {level.label}
              </button>
            ))}
          </div>
        )}

        {goal.metricType === "task_analysis_step" && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Task analysis step">
            {[1, 2, 3, 4, 5].map((step) => (
              <button
                key={step}
                type="button"
                disabled={disabled}
                aria-pressed={dataPoint?.valueNumeric === step}
                onClick={() => onSetTaskStep(step)}
                className={dataPoint?.valueNumeric === step ? "chip chip-on" : "chip"}
              >
                {step}
              </button>
            ))}
          </div>
        )}

        {goal.metricType === "accommodation_used" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={dataPoint?.valueEnum === "used"}
              onClick={() => onSetAccommodationUsed(true)}
              className={dataPoint?.valueEnum === "used" ? "chip chip-on" : "chip"}
            >
              Used
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={dataPoint?.valueEnum === "not_used"}
              onClick={() => onSetAccommodationUsed(false)}
              className={dataPoint?.valueEnum === "not_used" ? "chip chip-on" : "chip"}
            >
              Not used
            </button>
          </div>
        )}
      </div>

      {showNote && noteOpen && (
        <textarea
          defaultValue={dataPoint?.note ?? ""}
          onBlur={(e) => onNoteBlur(e.target.value)}
          disabled={disabled}
          placeholder="Optional note…"
          rows={2}
          className="input mt-2"
          style={{ width: "100%" }}
        />
      )}
    </div>
  );
}
