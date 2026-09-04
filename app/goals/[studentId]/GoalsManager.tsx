"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import type { Goal, Student, StudentAccommodation } from "@/lib/db/types";
import {
  goalDomainValues,
  metricTypeValues,
  iconSetValues,
  targetFrequencyValues,
} from "@/lib/validation";
import {
  COLLECTION_DAY_LABEL,
  collectionDayValues,
  type MeasurementPlan,
} from "@/lib/measurement-plans";
import {
  isQuantitativeMetric,
  type ProgressTarget,
} from "@/lib/progress-monitoring";
import {
  DATA_COLLECTION_CATEGORIES,
  DEFAULT_PROMPT_HIERARCHY,
  TARGET_FREQUENCY_LABEL,
  type RubricConfig,
} from "@/lib/student-data-plan";

const METRIC_LABEL: Record<(typeof metricTypeValues)[number], string> = {
  accuracy_pct: "Accuracy trials (✓ / ✗)",
  fluency_rate: "Fluency rate (typed number)",
  frequency_count: "Behavior tally",
  duration_seconds: "Duration timer",
  latency_seconds: "Response latency timer",
  rubric_score: "Work sample / rubric score",
  abc_observation: "ABC observation",
  prompt_level: "Prompt-level chips",
  task_analysis_step: "Task-analysis step",
  icon_scale: "Icon-degree rating",
  accommodation_used: "Accommodation used (goal-level)",
};

type DraftGoal = {
  domain: (typeof goalDomainValues)[number];
  goalText: string;
  metricType: (typeof metricTypeValues)[number];
  iconSet: (typeof iconSetValues)[number];
  taskAnalysisSteps: string[];
  promptHierarchy: string[];
  rubricConfig: RubricConfig;
  targetFrequency: (typeof targetFrequencyValues)[number];
  measurementPlan: MeasurementPlan;
  progressTarget: ProgressTarget | null;
};

const BLANK_DRAFT: DraftGoal = {
  domain: "academic",
  goalText: "",
  metricType: "accuracy_pct",
  iconSet: "smiley_5",
  taskAnalysisSteps: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
  promptHierarchy: [...DEFAULT_PROMPT_HIERARCHY],
  rubricConfig: {
    title: "Work sample rubric",
    maxScore: 4,
    criteria: ["Accuracy", "Completeness", "Independence"],
  },
  targetFrequency: "daily",
  measurementPlan: {
    baseline: "",
    observableDefinition: "",
    measurementMethod: "",
    masteryCriterion: "",
    collectionDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    observationsRequired: 1,
    setting: "",
    opportunitiesRequired: 1,
    observationWindowMinutes: null,
    responsibleRole: "either",
    effectiveFrom: "",
    effectiveTo: null,
  },
  progressTarget: null,
};

function isDraftValid(draft: DraftGoal): boolean {
  const plan = draft.measurementPlan;
  const target = draft.progressTarget;
  const targetIsValid =
    target === null ||
    (isQuantitativeMetric(draft.metricType) &&
      target.baselineValue >= 0 &&
      target.targetValue >= 0 &&
      !!target.baselineDate &&
      !!target.targetDate &&
      target.targetDate > target.baselineDate &&
      (draft.metricType !== "accuracy_pct" ||
        (target.baselineValue <= 100 && target.targetValue <= 100)) &&
      (target.direction === "increase"
        ? target.targetValue > target.baselineValue
        : target.targetValue < target.baselineValue));
  return (
    !!draft.goalText.trim() &&
    (draft.metricType !== "task_analysis_step" || draft.taskAnalysisSteps.length > 0) &&
    (draft.metricType !== "prompt_level" || draft.promptHierarchy.length >= 2) &&
    (draft.metricType !== "rubric_score" ||
      (!!draft.rubricConfig.title.trim() &&
        draft.rubricConfig.maxScore > 0 &&
        draft.rubricConfig.criteria.length > 0)) &&
    !!plan.baseline.trim() &&
    !!plan.observableDefinition.trim() &&
    !!plan.measurementMethod.trim() &&
    !!plan.masteryCriterion.trim() &&
    plan.collectionDays.length > 0 &&
    plan.observationsRequired > 0 &&
    !!plan.setting.trim() &&
    (plan.opportunitiesRequired !== null || plan.observationWindowMinutes !== null) &&
    !!plan.effectiveFrom &&
    (!plan.effectiveTo || plan.effectiveTo >= plan.effectiveFrom) &&
    targetIsValid
  );
}

function GoalFields({
  draft,
  onChange,
  disabled,
}: {
  draft: DraftGoal;
  onChange: (next: DraftGoal) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-muted flex flex-col text-xs sm:col-span-2">
        Goal text
        <textarea
          value={draft.goalText}
          disabled={disabled}
          onChange={(e) => onChange({ ...draft, goalText: e.target.value })}
          rows={2}
          placeholder="e.g. Read grade-level passages with 90% accuracy"
          className="input mt-1"
        />
      </label>

      <label className="text-muted flex flex-col text-xs">
        Domain
        <select
          value={draft.domain}
          disabled={disabled}
          onChange={(e) => onChange({ ...draft, domain: e.target.value as DraftGoal["domain"] })}
          className="input mt-1"
        >
          {goalDomainValues.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="text-muted flex flex-col text-xs">
        Target frequency
        <select
          value={draft.targetFrequency}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...draft, targetFrequency: e.target.value as DraftGoal["targetFrequency"] })
          }
          className="input mt-1"
        >
          {targetFrequencyValues.map((f) => (
            <option key={f} value={f}>
              {TARGET_FREQUENCY_LABEL[f]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-muted flex flex-col text-xs sm:col-span-2">
        Entry control (metric type)
        <select
          value={draft.metricType}
          disabled={disabled}
          onChange={(e) => {
            const metricType = e.target.value as DraftGoal["metricType"];
            onChange({
              ...draft,
              metricType,
              progressTarget: isQuantitativeMetric(metricType) ? draft.progressTarget : null,
            });
          }}
          className="input mt-1"
        >
          {metricTypeValues.map((m) => (
            <option key={m} value={m}>
              {METRIC_LABEL[m]}
            </option>
          ))}
        </select>
      </label>

      {draft.metricType === "icon_scale" && (
        <label className="text-muted flex flex-col text-xs sm:col-span-2">
          Icon set
          <select
            value={draft.iconSet}
            disabled={disabled}
            onChange={(e) => onChange({ ...draft, iconSet: e.target.value as DraftGoal["iconSet"] })}
            className="input mt-1"
          >
            {iconSetValues.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}

      {draft.metricType === "task_analysis_step" && (
        <label className="text-muted flex flex-col text-xs sm:col-span-2">
          Task-analysis steps (one per line)
          <textarea
            value={draft.taskAnalysisSteps.join("\n")}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...draft,
                taskAnalysisSteps: e.target.value
                  .split("\n")
                  .map((step) => step.trim())
                  .filter(Boolean),
              })
            }
            rows={5}
            className="input mt-1"
            placeholder={"Open materials\nComplete first step\nCheck work"}
          />
        </label>
      )}

      {draft.metricType === "prompt_level" && (
        <label className="text-muted flex flex-col text-xs sm:col-span-2">
          Prompt hierarchy (most support to independent, one level per line)
          <textarea
            value={draft.promptHierarchy.join("\n")}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...draft,
                promptHierarchy: event.target.value
                  .split("\n")
                  .map((level) => level.trim())
                  .filter(Boolean),
              })
            }
            rows={5}
            className="input mt-1"
          />
        </label>
      )}

      {draft.metricType === "rubric_score" && (
        <fieldset
          className="sm:col-span-2"
          style={{
            border: "1px solid var(--color-neutral-300)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-3)",
          }}
        >
          <legend style={{ fontWeight: 600, padding: "0 6px" }}>Work sample rubric</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-muted flex flex-col text-xs">
              Rubric title
              <input
                className="input mt-1"
                value={draft.rubricConfig.title}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    rubricConfig: { ...draft.rubricConfig, title: event.target.value },
                  })
                }
              />
            </label>
            <label className="text-muted flex flex-col text-xs">
              Maximum score
              <input
                className="input mt-1"
                type="number"
                min={1}
                max={1000}
                value={draft.rubricConfig.maxScore}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    rubricConfig: {
                      ...draft.rubricConfig,
                      maxScore: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="text-muted flex flex-col text-xs sm:col-span-2">
              Criteria (one per line)
              <textarea
                className="input mt-1"
                rows={4}
                value={draft.rubricConfig.criteria.join("\n")}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    rubricConfig: {
                      ...draft.rubricConfig,
                      criteria: event.target.value
                        .split("\n")
                        .map((criterion) => criterion.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </label>
          </div>
        </fieldset>
      )}

      <fieldset
        className="sm:col-span-2"
        style={{
          border: "1px solid var(--color-neutral-300)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-3)",
        }}
      >
        <legend style={{ fontWeight: 600, padding: "0 6px" }}>Measurement plan</legend>
        <p className="text-muted mb-3 text-xs">
          Define exactly what staff should observe and when enough evidence has been collected.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-muted flex flex-col text-xs sm:col-span-2">
            Baseline
            <input
              value={draft.measurementPlan.baseline}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: { ...draft.measurementPlan, baseline: e.target.value },
                })
              }
              className="input mt-1"
              placeholder="e.g. 3 of 10 independent opportunities as of 2026-09-01"
            />
          </label>

          <label className="text-muted flex flex-col text-xs sm:col-span-2">
            Observable definition
            <textarea
              value={draft.measurementPlan.observableDefinition}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: {
                    ...draft.measurementPlan,
                    observableDefinition: e.target.value,
                  },
                })
              }
              rows={2}
              className="input mt-1"
              placeholder="Describe what counts and what does not count."
            />
          </label>

          <label className="text-muted flex flex-col text-xs sm:col-span-2">
            Measurement method
            <textarea
              value={draft.measurementPlan.measurementMethod}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: {
                    ...draft.measurementPlan,
                    measurementMethod: e.target.value,
                  },
                })
              }
              rows={2}
              className="input mt-1"
              placeholder="e.g. Present 10 trials and tap correct or incorrect after each response."
            />
          </label>

          <label className="text-muted flex flex-col text-xs sm:col-span-2">
            Mastery criterion
            <input
              value={draft.measurementPlan.masteryCriterion}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: {
                    ...draft.measurementPlan,
                    masteryCriterion: e.target.value,
                  },
                })
              }
              className="input mt-1"
              placeholder="e.g. 80% or better across 3 consecutive weekly probes"
            />
          </label>

          <label className="text-muted flex flex-col text-xs">
            Setting or activity
            <input
              value={draft.measurementPlan.setting}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: { ...draft.measurementPlan, setting: e.target.value },
                })
              }
              className="input mt-1"
              placeholder="e.g. Small-group reading"
            />
          </label>

          <label className="text-muted flex flex-col text-xs">
            Responsible collector
            <select
              value={draft.measurementPlan.responsibleRole}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: {
                    ...draft.measurementPlan,
                    responsibleRole: e.target.value as MeasurementPlan["responsibleRole"],
                  },
                })
              }
              className="input mt-1"
            >
              <option value="either">Teacher or aide</option>
              <option value="teacher">Teacher</option>
              <option value="aide">Aide</option>
            </select>
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="text-muted text-xs">Scheduled collection days</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {collectionDayValues.map((day) => (
                <label key={day} className="chip" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={draft.measurementPlan.collectionDays.includes(day)}
                    disabled={disabled}
                    onChange={(e) => {
                      const days = e.target.checked
                        ? [...draft.measurementPlan.collectionDays, day]
                        : draft.measurementPlan.collectionDays.filter((value) => value !== day);
                      onChange({
                        ...draft,
                        measurementPlan: { ...draft.measurementPlan, collectionDays: days },
                      });
                    }}
                  />
                  {COLLECTION_DAY_LABEL[day]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="text-muted flex flex-col text-xs">
            Minimum observations each scheduled day
            <input
              type="number"
              min={1}
              max={100}
              value={draft.measurementPlan.observationsRequired}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: {
                    ...draft.measurementPlan,
                    observationsRequired: Number(e.target.value),
                  },
                })
              }
              className="input mt-1"
            />
          </label>

          <label className="text-muted flex flex-col text-xs">
            Opportunities per observation (choose opportunities or a window)
            <input
              type="number"
              min={1}
              max={100}
              value={draft.measurementPlan.opportunitiesRequired ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: {
                    ...draft.measurementPlan,
                    opportunitiesRequired: e.target.value ? Number(e.target.value) : null,
                  },
                })
              }
              className="input mt-1"
            />
          </label>

          <label className="text-muted flex flex-col text-xs">
            Observation window in minutes (choose opportunities or a window)
            <input
              type="number"
              min={1}
              max={480}
              value={draft.measurementPlan.observationWindowMinutes ?? ""}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  measurementPlan: {
                    ...draft.measurementPlan,
                    observationWindowMinutes: e.target.value ? Number(e.target.value) : null,
                  },
                })
              }
              className="input mt-1"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-muted flex flex-col text-xs">
              Effective from
              <input
                type="date"
                value={draft.measurementPlan.effectiveFrom}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    measurementPlan: {
                      ...draft.measurementPlan,
                      effectiveFrom: e.target.value,
                    },
                  })
                }
                className="input mt-1"
              />
            </label>
            <label className="text-muted flex flex-col text-xs">
              End date (optional)
              <input
                type="date"
                value={draft.measurementPlan.effectiveTo ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    measurementPlan: {
                      ...draft.measurementPlan,
                      effectiveTo: e.target.value || null,
                    },
                  })
                }
                className="input mt-1"
              />
            </label>
          </div>
        </div>
      </fieldset>

      {isQuantitativeMetric(draft.metricType) && (
        <fieldset
          className="sm:col-span-2"
          style={{
            border: "1px solid var(--color-neutral-300)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-3)",
          }}
        >
          <legend style={{ fontWeight: 600, padding: "0 6px" }}>Progress target (optional)</legend>
          <p className="text-muted mb-3 text-xs">
            Add an explicit numeric baseline and target to show an aim line. Narrative mastery
            criteria are never converted automatically.
          </p>
          <label className="flex items-center gap-2 text-sm" style={{ minHeight: 44 }}>
            <input
              type="checkbox"
              checked={draft.progressTarget !== null}
              disabled={disabled}
              onChange={(event) => {
                if (!event.target.checked) {
                  onChange({ ...draft, progressTarget: null });
                  return;
                }
                const direction = draft.metricType === "frequency_count" ? "decrease" : "increase";
                onChange({
                  ...draft,
                  progressTarget: {
                    baselineValue: direction === "increase" ? 0 : 1,
                    baselineDate: draft.measurementPlan.effectiveFrom,
                    targetValue: direction === "increase" ? 1 : 0,
                    targetDate: draft.measurementPlan.effectiveTo ?? "",
                    direction,
                  },
                });
              }}
            />
            Show an aim line for this goal
          </label>

          {draft.progressTarget && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-muted flex flex-col text-xs sm:col-span-2">
                Desired direction
                <select
                  value={draft.progressTarget.direction}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      progressTarget: {
                        ...draft.progressTarget!,
                        direction: event.target.value as ProgressTarget["direction"],
                      },
                    })
                  }
                  className="input mt-1"
                >
                  <option value="increase">Increase over time</option>
                  <option value="decrease">Decrease over time</option>
                </select>
              </label>
              <label className="text-muted flex flex-col text-xs">
                Baseline value
                <input
                  type="number"
                  min={0}
                  max={draft.metricType === "accuracy_pct" ? 100 : 1000000}
                  step="any"
                  value={draft.progressTarget.baselineValue}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      progressTarget: {
                        ...draft.progressTarget!,
                        baselineValue: Number(event.target.value),
                      },
                    })
                  }
                  className="input mt-1"
                />
              </label>
              <label className="text-muted flex flex-col text-xs">
                Baseline date
                <input
                  type="date"
                  value={draft.progressTarget.baselineDate}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      progressTarget: {
                        ...draft.progressTarget!,
                        baselineDate: event.target.value,
                      },
                    })
                  }
                  className="input mt-1"
                />
              </label>
              <label className="text-muted flex flex-col text-xs">
                Target value
                <input
                  type="number"
                  min={0}
                  max={draft.metricType === "accuracy_pct" ? 100 : 1000000}
                  step="any"
                  value={draft.progressTarget.targetValue}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      progressTarget: {
                        ...draft.progressTarget!,
                        targetValue: Number(event.target.value),
                      },
                    })
                  }
                  className="input mt-1"
                />
              </label>
              <label className="text-muted flex flex-col text-xs">
                Target date
                <input
                  type="date"
                  value={draft.progressTarget.targetDate}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      progressTarget: {
                        ...draft.progressTarget!,
                        targetDate: event.target.value,
                      },
                    })
                  }
                  className="input mt-1"
                />
              </label>
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}

function goalToDraft(goal: Goal): DraftGoal {
  return {
    domain: goal.domain,
    goalText: goal.goalText,
    metricType: goal.metricType,
    iconSet: goal.iconSet ?? "smiley_5",
    taskAnalysisSteps: goal.taskAnalysisSteps ?? [
      "Step 1",
      "Step 2",
      "Step 3",
      "Step 4",
      "Step 5",
    ],
    promptHierarchy: goal.promptHierarchy?.length
      ? goal.promptHierarchy
      : [...DEFAULT_PROMPT_HIERARCHY],
    rubricConfig: goal.rubricConfig ?? BLANK_DRAFT.rubricConfig,
    targetFrequency: goal.targetFrequency,
    measurementPlan: goal.measurementPlan ?? BLANK_DRAFT.measurementPlan,
    progressTarget: goal.progressTarget ?? null,
  };
}

function GoalEditor({
  goal,
  highlighted,
  onSaved,
  onRetired,
}: {
  goal: Goal;
  highlighted?: boolean;
  onSaved: (g: Goal, replacedGoalId?: string) => void;
  onRetired: (id: string) => void;
}) {
  const [draft, setDraft] = useState<DraftGoal>(goalToDraft(goal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(goalToDraft(goal));
  const valid = isDraftValid(draft);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        domain: draft.domain,
        goalText: draft.goalText,
        metricType: draft.metricType,
        targetFrequency: draft.targetFrequency,
        iconSet: draft.metricType === "icon_scale" ? draft.iconSet : null,
        taskAnalysisSteps:
          draft.metricType === "task_analysis_step" ? draft.taskAnalysisSteps : null,
        promptHierarchy:
          draft.metricType === "prompt_level" ? draft.promptHierarchy : null,
        rubricConfig: draft.metricType === "rubric_score" ? draft.rubricConfig : null,
        measurementPlan: draft.measurementPlan,
        progressTarget: draft.progressTarget,
      };
      const res = await apiFetch<{ goal: Goal; replacedGoalId?: string }>(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved(res.goal, res.replacedGoalId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function retire() {
    if (!confirm(`Retire this goal? It will stop appearing on the entry screen.`)) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      onRetired(goal.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retire failed.");
      setSaving(false);
    }
  }

  return (
    <div
      id={`goal-${goal.id}`}
      className="card"
      style={highlighted ? { outline: "3px solid var(--color-accent-600)", outlineOffset: 2 } : undefined}
    >
      {!goal.measurementPlan && (
        <p
          role="status"
          className="mb-3 text-sm"
          style={{ color: "#9a3412", fontWeight: 600 }}
        >
          Measurement plan incomplete. Complete the fields below before saving changes.
        </p>
      )}
      <GoalFields draft={draft} onChange={setDraft} disabled={saving} />
      {error && (
        <p className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-between">
        <button type="button" onClick={retire} disabled={saving} className="btn btn-ghost" style={{ color: "#b91c1c" }}>
          Retire goal
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty || !valid}
          className="btn btn-primary"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function AiGoalWizard({
  draft,
  onApply,
}: {
  draft: DraftGoal;
  onApply: (plan: MeasurementPlan) => void;
}) {
  const [skillDescription, setSkillDescription] = useState("");
  const [baselineSummary, setBaselineSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  async function suggest() {
    setLoading(true);
    setError(null);
    setApplied(false);
    try {
      const res = await apiFetch<{ measurementPlan: MeasurementPlan }>("/api/ai/goal-wizard", {
        method: "POST",
        body: JSON.stringify({
          domain: draft.domain,
          metricType: draft.metricType,
          skillDescription,
          baselineSummary: baselineSummary.trim() || null,
        }),
      });
      onApply(res.measurementPlan);
      setApplied(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Continue filling in the measurement plan manually below.`
          : "AI suggestion unavailable — continue filling in the measurement plan manually below."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ borderStyle: "dashed", marginBottom: "var(--space-3)" }}>
      <h3>AI-assisted setup (optional)</h3>
      <p className="text-muted mt-1 text-xs">
        Set the domain and entry control above, describe the skill or behavior in your own words,
        and the AI will propose a measurement plan below for you to review and edit. Nothing
        saves until you click &quot;Add goal.&quot; No student name or identifying detail is ever
        sent — only the domain, entry control, and what you type here.
      </p>
      <label className="text-muted mt-3 flex flex-col text-xs">
        Skill or behavior description
        <textarea
          className="input mt-1"
          rows={2}
          value={skillDescription}
          disabled={loading}
          onChange={(e) => setSkillDescription(e.target.value)}
          placeholder="e.g. Reading grade-level passages aloud with few errors"
        />
      </label>
      <label className="text-muted mt-3 flex flex-col text-xs">
        Baseline summary (optional)
        <input
          className="input mt-1"
          value={baselineSummary}
          disabled={loading}
          onChange={(e) => setBaselineSummary(e.target.value)}
          placeholder="e.g. 40% accuracy over 3 sessions"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      {applied && !error && (
        <p
          role="status"
          className="mt-2 text-sm"
          style={{ color: "var(--color-accent-700)", fontWeight: 600 }}
        >
          AI-suggested — review every field in the measurement plan below before saving.
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={loading || !skillDescription.trim()}
          onClick={suggest}
        >
          {loading ? "Asking AI…" : "Suggest a measurement plan"}
        </button>
      </div>
    </div>
  );
}

function NewGoalForm({ studentId, onCreated }: { studentId: string; onCreated: (g: Goal) => void }) {
  const [draft, setDraft] = useState<DraftGoal>(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = isDraftValid(draft);

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        studentId,
        domain: draft.domain,
        goalText: draft.goalText,
        metricType: draft.metricType,
        targetFrequency: draft.targetFrequency,
        measurementPlan: draft.measurementPlan,
        progressTarget: draft.progressTarget,
        ...(draft.metricType === "icon_scale" ? { iconSet: draft.iconSet } : {}),
        ...(draft.metricType === "task_analysis_step"
          ? { taskAnalysisSteps: draft.taskAnalysisSteps }
          : {}),
        ...(draft.metricType === "prompt_level"
          ? { promptHierarchy: draft.promptHierarchy }
          : {}),
        ...(draft.metricType === "rubric_score"
          ? { rubricConfig: draft.rubricConfig }
          : {}),
      };
      const res = await apiFetch<{ goal: Goal }>("/api/goals", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onCreated(res.goal);
      setDraft(BLANK_DRAFT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ borderStyle: "dashed" }}>
      <p style={{ fontWeight: 600 }}>+ Add a new goal</p>
      <div className="mt-3">
        <AiGoalWizard
          draft={draft}
          onApply={(measurementPlan) => setDraft((prev) => ({ ...prev, measurementPlan }))}
        />
        <GoalFields draft={draft} onChange={setDraft} disabled={saving} />
      </div>
      {!valid && (
        <p className="text-muted mt-2 text-xs">
          Complete the goal text and all measurement-plan fields except the optional end date.
          Enter opportunities, an observation window, or both. If an aim line is enabled, complete
          its values and dates too.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={create}
          disabled={saving || !valid}
          className="btn btn-primary"
        >
          {saving ? "Adding…" : "Add goal"}
        </button>
      </div>
    </div>
  );
}

function AccommodationEditor({
  item,
  onSaved,
  onRetired,
}: {
  item: StudentAccommodation;
  onSaved: (item: StudentAccommodation) => void;
  onRetired: (id: string) => void;
}) {
  const [draft, setDraft] = useState({
    name: item.name,
    setting: item.setting ?? "",
    implementationNotes: item.implementationNotes ?? "",
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dirty =
    draft.name !== item.name ||
    draft.setting !== item.setting ||
    draft.implementationNotes !== item.implementationNotes;

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ accommodation: StudentAccommodation }>(
        `/api/student-accommodations/${item.id}`,
        { method: "PATCH", body: JSON.stringify(draft) }
      );
      setDraft({
        name: response.accommodation.name,
        setting: response.accommodation.setting ?? "",
        implementationNotes: response.accommodation.implementationNotes ?? "",
      });
      onSaved(response.accommodation);
      setMessage("Accommodation saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save accommodation.");
    } finally {
      setPending(false);
    }
  }

  async function retire() {
    if (!confirm(`Remove ${item.name} from this student's active plan? Past use logs will remain.`)) {
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      await apiFetch(`/api/student-accommodations/${item.id}`, { method: "DELETE" });
      onRetired(item.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove accommodation.");
      setPending(false);
    }
  }

  return (
    <div className="card">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-muted flex flex-col text-xs">
          Accommodation
          <input className="input mt-1" value={draft.name} disabled={pending} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label className="text-muted flex flex-col text-xs">
          Setting
          <input className="input mt-1" value={draft.setting} disabled={pending} onChange={(event) => setDraft({ ...draft, setting: event.target.value })} />
        </label>
        <label className="text-muted flex flex-col text-xs sm:col-span-2">
          Implementation directions
          <textarea className="input mt-1" rows={3} value={draft.implementationNotes} disabled={pending} onChange={(event) => setDraft({ ...draft, implementationNotes: event.target.value })} />
        </label>
      </div>
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
      <div className="mt-3 flex justify-between gap-2">
        <button type="button" className="btn btn-ghost" style={{ color: "#b91c1c" }} disabled={pending} onClick={retire}>Remove</button>
        <button type="button" className="btn btn-primary" disabled={pending || !dirty || !draft.name.trim() || !draft.setting.trim() || !draft.implementationNotes.trim()} onClick={save}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

type AccommodationSuggestion = {
  name: string;
  setting: string;
  implementationNotes: string;
  rationale: string;
};

type AccommodationChatTurn =
  | { kind: "question"; question: string }
  | ({ kind: "suggestion" } & AccommodationSuggestion);

function AccommodationChat({
  studentId,
  onSuggestion,
}: {
  studentId: string;
  onSuggestion: (suggestion: AccommodationSuggestion) => void;
}) {
  const MAX_EXCHANGES = 5;
  const [domain, setDomain] = useState<(typeof goalDomainValues)[number]>("accommodation");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<AccommodationSuggestion | null>(null);
  const turnsUsed = messages.filter((m) => m.role === "user").length;
  const turnLimitReached = turnsUsed >= MAX_EXCHANGES;

  function reset() {
    setMessages([]);
    setSuggestion(null);
    setError(null);
    setDraftMessage("");
  }

  async function send() {
    const text = draftMessage.trim();
    if (!text) return;
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setDraftMessage("");
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ turn: AccommodationChatTurn }>(
        "/api/ai/accommodation-chat",
        { method: "POST", body: JSON.stringify({ studentId, domain, messages: nextMessages }) }
      );
      if (res.turn.kind === "question") {
        setMessages([...nextMessages, { role: "assistant", content: res.turn.question }]);
      } else {
        const { name, setting, implementationNotes, rationale } = res.turn;
        setMessages([...nextMessages, { role: "assistant", content: `Suggestion: ${name}. ${rationale}` }]);
        setSuggestion({ name, setting, implementationNotes, rationale });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Continue choosing an accommodation manually below.`
          : "AI unavailable — continue choosing an accommodation manually below."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ borderStyle: "dashed" }}>
      <h3>Ask for a suggestion</h3>
      <p className="text-muted mt-1 text-xs">
        A short, bounded conversation (up to {MAX_EXCHANGES} messages) to help pick an
        accommodation. No student name is ever sent — only the domain below and this
        student&apos;s existing accommodations and effectiveness ratings.
      </p>
      <label className="text-muted mt-3 flex flex-col text-xs">
        Domain
        <select
          className="input mt-1"
          value={domain}
          disabled={messages.length > 0}
          onChange={(event) => setDomain(event.target.value as typeof domain)}
        >
          {goalDomainValues.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      {messages.length > 0 && (
        <ul
          aria-live="polite"
          className="mt-3 flex flex-col gap-2 text-sm"
          style={{ listStyle: "none", padding: 0 }}
        >
          {messages.map((m, index) => (
            <li key={index}>
              <strong>{m.role === "user" ? "You" : "AI"}:</strong> {m.content}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {suggestion ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onSuggestion(suggestion);
              reset();
            }}
          >
            Use this suggestion below
          </button>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Start over
          </button>
        </div>
      ) : turnLimitReached ? (
        <p role="status" className="mt-3 text-sm">
          This suggestion has reached its turn limit.{" "}
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Start a new one
          </button>
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="text-muted flex flex-1 flex-col text-xs">
            {messages.length === 0 ? "What is the student struggling with?" : "Your reply"}
            <input
              className="input mt-1"
              value={draftMessage}
              disabled={loading}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Describe the difficulty, not the student."
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ alignSelf: "flex-end" }}
            disabled={loading || !draftMessage.trim()}
            onClick={send}
          >
            {loading ? "Asking…" : "Send"}
          </button>
        </div>
      )}
      {messages.length > 0 && !suggestion && (
        <p className="text-muted mt-2 text-xs">
          {turnsUsed}/{MAX_EXCHANGES} messages used
        </p>
      )}
    </div>
  );
}

function AccommodationPlan({
  studentId,
  accommodations,
  onChange,
}: {
  studentId: string;
  accommodations: StudentAccommodation[];
  onChange: (items: StudentAccommodation[]) => void;
}) {
  const [draft, setDraft] = useState({ name: "", setting: "", implementationNotes: "" });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    setPendingId("new");
    setMessage(null);
    try {
      const response = await apiFetch<{ accommodation: StudentAccommodation }>(
        "/api/student-accommodations",
        { method: "POST", body: JSON.stringify({ studentId, ...draft }) }
      );
      onChange([...accommodations, response.accommodation]);
      setDraft({ name: "", setting: "", implementationNotes: "" });
      setMessage("Accommodation added to this student's data plan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add accommodation.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-labelledby="accommodations-heading">
      <h2 id="accommodations-heading">Accommodations & access</h2>
      <p className="text-muted mt-1 text-sm">
        Configure only IEP-team-approved supports. Staff can then log whether each support was
        used and rate its impact.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3">
        {accommodations.map((item) => (
          <AccommodationEditor
            key={item.id}
            item={item}
            onSaved={(updated) =>
              onChange(
                accommodations.map((current) =>
                  current.id === updated.id ? updated : current
                )
              )
            }
            onRetired={(id) => onChange(accommodations.filter((current) => current.id !== id))}
          />
        ))}
        {accommodations.length === 0 && (
          <p className="text-muted text-sm">No accommodations configured.</p>
        )}
      </div>
      <div className="mt-3">
        <AccommodationChat
          studentId={studentId}
          onSuggestion={(suggestion) => {
            setDraft({
              name: suggestion.name,
              setting: suggestion.setting,
              implementationNotes: suggestion.implementationNotes,
            });
            setMessage(`AI-suggested — review before adding. ${suggestion.rationale}`);
          }}
        />
      </div>
      <div className="card mt-3" style={{ borderStyle: "dashed" }}>
        <h3>Add accommodation</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-muted flex flex-col text-xs">
            Accommodation
            <input
              className="input mt-1"
              value={draft.name}
              disabled={pendingId === "new"}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="e.g. Text-to-speech"
            />
          </label>
          <label className="text-muted flex flex-col text-xs">
            Setting
            <input
              className="input mt-1"
              value={draft.setting}
              disabled={pendingId === "new"}
              onChange={(event) => setDraft({ ...draft, setting: event.target.value })}
              placeholder="e.g. Reading assessments"
            />
          </label>
          <label className="text-muted flex flex-col text-xs sm:col-span-2">
            Implementation directions
            <textarea
              className="input mt-1"
              rows={3}
              value={draft.implementationNotes}
              disabled={pendingId === "new"}
              onChange={(event) => setDraft({ ...draft, implementationNotes: event.target.value })}
              placeholder="Describe when and how staff should provide the support."
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              pendingId === "new" ||
              !draft.name.trim() ||
              !draft.setting.trim() ||
              !draft.implementationNotes.trim()
            }
            onClick={add}
          >
            {pendingId === "new" ? "Adding…" : "Add accommodation"}
          </button>
        </div>
      </div>
      {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    </section>
  );
}

export function GoalsManager({
  studentId,
  initialGoalId,
}: {
  studentId: string;
  initialGoalId?: string;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [accommodations, setAccommodations] = useState<StudentAccommodation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ students: Student[] }>("/api/students"),
      apiFetch<{ goals: Goal[] }>(`/api/goals?studentId=${studentId}`),
      apiFetch<{ accommodations: StudentAccommodation[] }>(
        `/api/student-accommodations?studentId=${studentId}&includeIncomplete=true`
      ),
    ])
      .then(([studentsRes, goalsRes, accommodationsRes]) => {
        const found = studentsRes.students.find((s) => s.id === studentId) ?? null;
        setStudent(found);
        setGoals(goalsRes.goals);
        setAccommodations(accommodationsRes.accommodations);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load."));
  }, [studentId]);

  useEffect(() => {
    if (!initialGoalId || !goals?.some((goal) => goal.id === initialGoalId)) return;
    document.getElementById(`goal-${initialGoalId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [goals, initialGoalId]);

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="flex gap-3">
        <Link href="/entry" className="text-muted text-xs underline underline-offset-4">
          ← Entry
        </Link>
        <Link href="/admin" className="text-muted text-xs underline underline-offset-4">
          Admin console
        </Link>
      </div>

      <h1 className="mt-2">Student data plan{student ? ` — ${student.displayName}` : ""}</h1>
      <p className="text-muted mt-1 text-sm">
        Adding, editing, or retiring a goal here changes what shows up on this student&apos;s
        roster-sweep card. Retiring a goal keeps its past data points, it just stops collecting
        new ones.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {student && (
        <section className="mt-5" aria-labelledby="supported-data-heading">
          <h2 id="supported-data-heading">Supported data collection</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DATA_COLLECTION_CATEGORIES.map((category) => (
              <article key={category.title} className="card">
                <h3>{category.title}</h3>
                <p className="text-muted mt-1 text-sm">{category.description}</p>
              </article>
            ))}
          </div>
          <p className="text-muted mt-3 text-sm">
            Collection cadence is set by the IEP team for each goal. Quarterly reporting
            summarizes evidence; it does not replace scheduled probes or observations.
          </p>
        </section>
      )}

      {!goals || !accommodations ? (
        <p className="text-muted mt-6 text-sm">Loading…</p>
      ) : student === null && !error ? (
        <p className="mt-6 text-sm" style={{ color: "var(--color-accent-700)" }}>
          This student isn&apos;t in your classroom roster.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <h2>Goals & measurement plans</h2>
          {goals.map((goal) => (
            <GoalEditor
              key={goal.id}
              goal={goal}
              highlighted={goal.id === initialGoalId}
              onSaved={(updated, replacedGoalId) =>
                setGoals((prev) =>
                  prev!.map((g) =>
                    g.id === (replacedGoalId ?? updated.id) ? updated : g
                  )
                )
              }
              onRetired={(id) => setGoals((prev) => prev!.filter((g) => g.id !== id))}
            />
          ))}
          {goals.length === 0 && (
            <p className="text-muted text-sm">No goals yet — add the first one below.</p>
          )}

          <NewGoalForm
            studentId={studentId}
            onCreated={(created) => setGoals((prev) => [...(prev ?? []), created])}
          />
          <AccommodationPlan
            studentId={studentId}
            accommodations={accommodations}
            onChange={setAccommodations}
          />
        </div>
      )}
    </main>
  );
}
