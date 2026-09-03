"use client";

import { useState } from "react";
import type { Goal, DataPoint } from "@/lib/db/types";
import { IconDegreePicker } from "@/components/IconDegreePicker";
import { PROMPT_LEVELS } from "@/lib/icon-sets";
import type { IconSetKey } from "@/lib/icon-sets";
import type { MeasurementPlanStatus } from "@/lib/measurement-plans";
import { DEFAULT_PROMPT_HIERARCHY, TARGET_FREQUENCY_LABEL } from "@/lib/student-data-plan";

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
  onCompleteObservation,
  onSetIconReading,
  onSetPromptLevel,
  onSetFluencyRate,
  onLogRubric,
  onLogAbc,
  onSetTaskStep,
  onSetAccommodationUsed,
  onStartTimer,
  onStopTimer,
  onNoteBlur,
  canUndo,
  onUndoLast,
  saveStatus,
  measurementStatus,
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
  onCompleteObservation: (exposure?: {
    opportunitiesObserved?: number;
    observationDurationSeconds?: number;
  }) => void;
  onSetIconReading: (value: string) => void;
  onSetPromptLevel: (value: string) => void;
  onSetFluencyRate: (value: number) => void;
  onLogRubric: (score: number, workSample: string, criterion: string | null) => void;
  onLogAbc: (antecedent: string, behavior: string, consequence: string) => void;
  onSetTaskStep: (step: number) => void;
  onSetAccommodationUsed: (used: boolean) => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onNoteBlur: (note: string) => void;
  canUndo: boolean;
  onUndoLast: () => void;
  saveStatus: "idle" | "saving" | "saved" | "queued" | "failed";
  measurementStatus: MeasurementPlanStatus;
  disabled?: boolean;
  /** Grid rows show the widget only — the goal text/domain live in their own columns. */
  showDomainAndText?: boolean;
  /** Grid and Accordion drop the note affordance for density (per design handoff). */
  showNote?: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(!!dataPoint?.note);
  const [workSample, setWorkSample] = useState("");
  const [rubricScore, setRubricScore] = useState("");
  const [rubricCriterion, setRubricCriterion] = useState("");
  const [abc, setAbc] = useState({ antecedent: "", behavior: "", consequence: "" });
  const [observationMinutes, setObservationMinutes] = useState("");
  const [opportunitiesObserved, setOpportunitiesObserved] = useState("");
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
            <p
              role="status"
              aria-live="polite"
              className="mt-1 text-xs"
              style={{
                color:
                  measurementStatus.kind === "due"
                    ? "#9a3412"
                    : measurementStatus.kind === "complete"
                      ? "#166534"
                      : "var(--color-neutral-700)",
                fontWeight: measurementStatus.isDue ? 600 : 400,
              }}
            >
              {measurementStatus.label}
              {goal.measurementPlan ? ` · ${goal.measurementPlan.setting}` : ""}
            </p>
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

      {!showDomainAndText && (
        <p
          role="status"
          aria-live="polite"
          className="text-xs"
          style={{
            color:
              measurementStatus.kind === "due"
                ? "#9a3412"
                : measurementStatus.kind === "complete"
                  ? "#166534"
                  : "var(--color-neutral-700)",
            fontWeight: measurementStatus.isDue ? 600 : 400,
          }}
        >
          {measurementStatus.label}
        </p>
      )}

      {showDomainAndText && goal.measurementPlan && (
        <details className="mt-2 text-xs">
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Collection directions
          </summary>
          <dl
            className="mt-2 grid gap-2"
            style={{ gridTemplateColumns: "max-content 1fr" }}
          >
            <dt className="text-muted">Count when</dt>
            <dd>{goal.measurementPlan.observableDefinition}</dd>
            <dt className="text-muted">Method</dt>
            <dd>{goal.measurementPlan.measurementMethod}</dd>
            <dt className="text-muted">Cadence</dt>
            <dd>{TARGET_FREQUENCY_LABEL[goal.targetFrequency]}</dd>
            <dt className="text-muted">Mastery</dt>
            <dd>{goal.measurementPlan.masteryCriterion}</dd>
            {goal.measurementPlan.opportunitiesRequired && (
              <>
                <dt className="text-muted">Opportunities</dt>
                <dd>{goal.measurementPlan.opportunitiesRequired}</dd>
              </>
            )}
            {goal.measurementPlan.observationWindowMinutes && (
              <>
                <dt className="text-muted">Window</dt>
                <dd>{goal.measurementPlan.observationWindowMinutes} minutes</dd>
              </>
            )}
          </dl>
        </details>
      )}

      <div className="mt-2">
        {goal.metricType === "accuracy_pct" && (
          <div data-tour="accuracy-counter" className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onTapAccuracy(true)}
              className="btn btn-secondary iconbtn"
              aria-label={`Correct trial for ${goal.goalText}`}
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onTapAccuracy(false)}
              className="btn btn-secondary iconbtn"
              aria-label={`Incorrect trial for ${goal.goalText}`}
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
              aria-label={`Correct words per minute for ${goal.goalText}`}
            />
          </div>
        )}

        {goal.metricType === "rubric_score" && goal.rubricConfig && (
          <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold">{goal.rubricConfig.title}</legend>
            <label className="text-muted flex flex-col text-xs">
              Work sample
              <input
                className="input mt-1"
                value={workSample}
                disabled={disabled}
                onChange={(event) => setWorkSample(event.target.value)}
                placeholder="e.g. Paragraph draft 2"
              />
            </label>
            <label className="text-muted flex flex-col text-xs">
              Criterion
              <select
                className="input mt-1"
                value={rubricCriterion}
                disabled={disabled}
                onChange={(event) => setRubricCriterion(event.target.value)}
              >
                <option value="">Overall score</option>
                {goal.rubricConfig.criteria.map((criterion) => (
                  <option key={criterion} value={criterion}>{criterion}</option>
                ))}
              </select>
            </label>
            <label className="text-muted flex flex-col text-xs">
              Score (0–{goal.rubricConfig.maxScore})
              <input
                className="input mt-1"
                type="number"
                inputMode="numeric"
                min={0}
                max={goal.rubricConfig.maxScore}
                value={rubricScore}
                disabled={disabled}
                onChange={(event) => setRubricScore(event.target.value)}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={
                  disabled ||
                  !workSample.trim() ||
                  rubricScore === "" ||
                  !Number.isFinite(Number(rubricScore)) ||
                  Number(rubricScore) < 0 ||
                  Number(rubricScore) > goal.rubricConfig.maxScore
                }
                onClick={() => {
                  onLogRubric(
                    Number(rubricScore),
                    workSample.trim(),
                    rubricCriterion || null
                  );
                  setWorkSample("");
                  setRubricScore("");
                }}
              >
                Record score
              </button>
            </div>
          </fieldset>
        )}

        {goal.metricType === "abc_observation" && (
          <fieldset className="grid grid-cols-1 gap-2">
            <legend className="mb-1 text-sm font-semibold">ABC observation</legend>
            {(["antecedent", "behavior", "consequence"] as const).map((field) => (
              <label key={field} className="text-muted flex flex-col text-xs">
                {field[0].toUpperCase() + field.slice(1)}
                <textarea
                  className="input mt-1"
                  rows={2}
                  value={abc[field]}
                  disabled={disabled}
                  onChange={(event) => setAbc({ ...abc, [field]: event.target.value })}
                />
              </label>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={disabled || !abc.antecedent.trim() || !abc.behavior.trim() || !abc.consequence.trim()}
              onClick={() => {
                onLogAbc(abc.antecedent.trim(), abc.behavior.trim(), abc.consequence.trim());
                setAbc({ antecedent: "", behavior: "", consequence: "" });
              }}
            >
              Record ABC observation
            </button>
          </fieldset>
        )}

        {goal.metricType === "frequency_count" && (
          <div data-tour="tally-counter" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={onTapTally}
                className="btn btn-secondary"
                aria-label={`Tally occurrence for ${goal.goalText}`}
              >
                Tally: {dataPoint?.valueNumeric ?? 0}
              </button>
              {dataPoint?.observationDurationSeconds ? (
                <span className="text-muted text-xs">
                  {(
                    ((dataPoint.valueNumeric ?? 0) * 60) /
                    dataPoint.observationDurationSeconds
                  ).toFixed(1)} per minute · {Math.round(dataPoint.observationDurationSeconds / 60)} min
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-muted flex flex-col text-xs">
                Actual minutes
                <input
                  className="input mt-1"
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  max={1440}
                  step={0.1}
                  value={observationMinutes}
                  disabled={disabled}
                  onChange={(event) => setObservationMinutes(event.target.value)}
                  style={{ width: 112 }}
                />
              </label>
              <label className="text-muted flex flex-col text-xs">
                Opportunities
                <input
                  className="input mt-1"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10000}
                  value={opportunitiesObserved}
                  disabled={disabled}
                  onChange={(event) => setOpportunitiesObserved(event.target.value)}
                  style={{ width: 112 }}
                />
              </label>
              <button
                type="button"
                disabled={
                  disabled ||
                  (!Number.isFinite(Number(observationMinutes)) &&
                    !Number.isFinite(Number(opportunitiesObserved))) ||
                  (Number(observationMinutes) <= 0 && Number(opportunitiesObserved) <= 0)
                }
                onClick={() => {
                  const minutes = Number(observationMinutes);
                  const opportunities = Number(opportunitiesObserved);
                  onCompleteObservation({
                    ...(minutes > 0
                      ? { observationDurationSeconds: Math.round(minutes * 60) }
                      : {}),
                    ...(Number.isInteger(opportunities) && opportunities > 0
                      ? { opportunitiesObserved: opportunities }
                      : {}),
                  });
                }}
                className="btn btn-ghost"
                aria-label={`Mark observation window complete for ${goal.goalText}`}
              >
                Window complete
              </button>
            </div>
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

        {(goal.metricType === "duration_seconds" || goal.metricType === "latency_seconds") && (
          <div data-tour="timer" className="flex items-center gap-2">
            <span className="text-muted text-xs">
              {goal.metricType === "latency_seconds" ? "Prompt → response" : "Behavior duration"}
            </span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 15 }}>
              {String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:
              {String(timerSeconds % 60).padStart(2, "0")}
            </span>
            {timerRunning ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onStopTimer}
                className="btn btn-secondary"
                aria-label={`Stop timer for ${goal.goalText}`}
              >
                Stop
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onStartTimer}
                  className="btn btn-secondary"
                  aria-label={`Start timer for ${goal.goalText}`}
                >
                  Start
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onCompleteObservation()}
                  className="btn btn-ghost"
                  aria-label={`Record no occurrence for ${goal.goalText}`}
                >
                  No occurrence
                </button>
              </>
            )}
          </div>
        )}

        {goal.metricType === "prompt_level" && (
          <div
            data-tour="prompt-chips"
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={`${goal.goalText} prompt level`}
          >
            {(goal.promptHierarchy?.length
              ? goal.promptHierarchy.map((label) => ({ value: label, label }))
              : PROMPT_LEVELS.length
                ? PROMPT_LEVELS
                : DEFAULT_PROMPT_HIERARCHY.map((label) => ({ value: label, label }))).map((level) => (
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
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={`${goal.goalText} task analysis step`}
          >
            {(goal.taskAnalysisSteps ?? [
              "Step 1",
              "Step 2",
              "Step 3",
              "Step 4",
              "Step 5",
            ]).map((label, index) => {
              const step = index + 1;
              return (
              <button
                key={step}
                type="button"
                disabled={disabled}
                aria-pressed={dataPoint?.valueNumeric === step}
                onClick={() => onSetTaskStep(step)}
                className={dataPoint?.valueNumeric === step ? "chip chip-on" : "chip"}
              >
                {step}. {label}
              </button>
              );
            })}
          </div>
        )}

        {goal.metricType === "accommodation_used" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={dataPoint?.valueEnum === "used"}
              aria-label={`Accommodation used for ${goal.goalText}`}
              onClick={() => onSetAccommodationUsed(true)}
              className={dataPoint?.valueEnum === "used" ? "chip chip-on" : "chip"}
            >
              Used
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={dataPoint?.valueEnum === "not_used"}
              aria-label={`Accommodation not used for ${goal.goalText}`}
              onClick={() => onSetAccommodationUsed(false)}
              className={dataPoint?.valueEnum === "not_used" ? "chip chip-on" : "chip"}
            >
              Not used
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex min-h-11 items-center justify-between gap-2">
        <span
          role="status"
          aria-live="polite"
          className="text-muted text-xs"
          style={saveStatus === "failed" ? { color: "#b91c1c" } : undefined}
        >
          {saveStatus === "saving" && "Saving observation…"}
          {saveStatus === "saved" && "Observation saved"}
          {saveStatus === "queued" && "Queued — will retry when connected"}
          {saveStatus === "failed" && "Save failed — undo and record again"}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled || !canUndo}
          onClick={onUndoLast}
          aria-label={`Undo last observation for ${goal.goalText}`}
        >
          Undo last
        </button>
      </div>

      {showNote && noteOpen && (
        <textarea
          key={dataPoint?.note ?? "empty-note"}
          defaultValue={dataPoint?.note ?? ""}
          onBlur={(e) => onNoteBlur(e.target.value)}
          disabled={disabled}
          placeholder="Optional note…"
          aria-label={`Observation note for ${goal.goalText}`}
          rows={2}
          className="input mt-2"
          style={{ width: "100%" }}
        />
      )}
    </div>
  );
}
