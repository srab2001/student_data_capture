"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { Student, Goal, StudentAccommodation } from "@/lib/db/types";
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

const METRIC_LABEL: Record<(typeof metricTypeValues)[number], string> = {
  accuracy_pct: "Accuracy trials (✓ / ✗)",
  fluency_rate: "Fluency rate (typed number)",
  frequency_count: "Behavior tally",
  duration_seconds: "Duration / latency timer",
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
  targetFrequency: (typeof targetFrequencyValues)[number];
  measurementPlan: MeasurementPlan;
};

const BLANK_DRAFT: DraftGoal = {
  domain: "academic",
  goalText: "",
  metricType: "accuracy_pct",
  iconSet: "smiley_5",
  taskAnalysisSteps: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
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
};

function isDraftValid(draft: DraftGoal): boolean {
  const plan = draft.measurementPlan;
  return (
    !!draft.goalText.trim() &&
    (draft.metricType !== "task_analysis_step" || draft.taskAnalysisSteps.length > 0) &&
    !!plan.baseline.trim() &&
    !!plan.observableDefinition.trim() &&
    !!plan.measurementMethod.trim() &&
    !!plan.masteryCriterion.trim() &&
    plan.collectionDays.length > 0 &&
    plan.observationsRequired > 0 &&
    !!plan.setting.trim() &&
    (plan.opportunitiesRequired !== null || plan.observationWindowMinutes !== null) &&
    !!plan.effectiveFrom &&
    (!plan.effectiveTo || plan.effectiveTo >= plan.effectiveFrom)
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
              {f}
            </option>
          ))}
        </select>
      </label>

      <label className="text-muted flex flex-col text-xs sm:col-span-2">
        Entry control (metric type)
        <select
          value={draft.metricType}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...draft, metricType: e.target.value as DraftGoal["metricType"] })
          }
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
    targetFrequency: goal.targetFrequency,
    measurementPlan: goal.measurementPlan ?? BLANK_DRAFT.measurementPlan,
  };
}

function GoalEditor({
  goal,
  onSaved,
  onRetired,
}: {
  goal: Goal;
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
        measurementPlan: draft.measurementPlan,
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
    <div className="card">
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
        ...(draft.metricType === "icon_scale" ? { iconSet: draft.iconSet } : {}),
        ...(draft.metricType === "task_analysis_step"
          ? { taskAnalysisSteps: draft.taskAnalysisSteps }
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
        <GoalFields draft={draft} onChange={setDraft} disabled={saving} />
      </div>
      {!valid && (
        <p className="text-muted mt-2 text-xs">
          Complete the goal text and all measurement-plan fields except the optional end date.
          Enter opportunities, an observation window, or both.
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

function AccommodationRow({
  accommodation,
  onSaved,
  onRetired,
}: {
  accommodation: StudentAccommodation;
  onSaved: (a: StudentAccommodation) => void;
  onRetired: (id: string) => void;
}) {
  const [name, setName] = useState(accommodation.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = name.trim().length > 0 && name.trim() !== accommodation.name;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ accommodation: StudentAccommodation }>(
        `/api/student-accommodations/${accommodation.id}`,
        { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }
      );
      onSaved(res.accommodation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function retire() {
    if (!confirm(`Retire "${accommodation.name}"? It will stop appearing on the entry screen.`)) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/student-accommodations/${accommodation.id}`, { method: "DELETE" });
      onRetired(accommodation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retire failed.");
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        disabled={saving}
        onChange={(e) => setName(e.target.value)}
        className="input"
        style={{ flex: 1 }}
      />
      <button type="button" onClick={save} disabled={saving || !dirty} className="btn btn-secondary">
        Save
      </button>
      <button
        type="button"
        onClick={retire}
        disabled={saving}
        className="btn btn-ghost"
        style={{ color: "#b91c1c" }}
      >
        Retire
      </button>
      {error && (
        <p className="text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function AccommodationsManager({
  studentId,
  accommodations,
  setAccommodations,
}: {
  studentId: string;
  accommodations: StudentAccommodation[];
  setAccommodations: Dispatch<SetStateAction<StudentAccommodation[]>>;
}) {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ accommodation: StudentAccommodation }>(
        "/api/student-accommodations",
        { method: "POST", body: JSON.stringify({ studentId, name: newName.trim() }) }
      );
      setAccommodations((prev) => [...prev, res.accommodation]);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mt-4">
      <h5 style={{ marginBottom: 8 }}>Accommodations</h5>
      <p className="text-muted text-xs" style={{ marginBottom: 12 }}>
        The list a teacher or aide picks from when logging accommodation usage for this student
        on the entry screen.
      </p>
      <div className="flex flex-col gap-2">
        {accommodations.map((a) => (
          <AccommodationRow
            key={a.id}
            accommodation={a}
            onSaved={(updated) =>
              setAccommodations((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
            }
            onRetired={(id) => setAccommodations((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
        {accommodations.length === 0 && (
          <p className="text-muted text-sm">None configured yet.</p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          disabled={saving}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="e.g. Extended time"
          className="input"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={create} disabled={saving || !newName.trim()} className="btn btn-primary">
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function StudentDetailsEditor({
  student,
  onRenamed,
  onRetired,
}: {
  student: Student;
  onRenamed: (s: Student) => void;
  onRetired: () => void;
}) {
  const [name, setName] = useState(student.displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = name.trim().length > 0 && name.trim() !== student.displayName;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ student: Student }>(`/api/students/${student.id}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName: name.trim() }),
      });
      onRenamed(res.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function retire() {
    if (
      !confirm(
        `Retire ${student.displayName}? They'll be removed from the entry-screen roster — past goals and data points are kept.`
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/students/${student.id}`, { method: "DELETE" });
      onRetired();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retire failed.");
      setSaving(false);
    }
  }

  return (
    <div className="card mt-4">
      <label className="text-muted flex flex-col text-xs">
        Student name
        <input
          type="text"
          value={name}
          disabled={saving}
          onChange={(e) => setName(e.target.value)}
          className="input mt-1"
        />
      </label>
      {error && (
        <p className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-between">
        <button
          type="button"
          onClick={retire}
          disabled={saving}
          className="btn btn-ghost"
          style={{ color: "#b91c1c" }}
        >
          Retire student
        </button>
        <button type="button" onClick={save} disabled={saving || !dirty} className="btn btn-primary">
          {saving ? "Saving…" : "Save name"}
        </button>
      </div>
    </div>
  );
}

export function GoalsManager({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [accommodations, setAccommodations] = useState<StudentAccommodation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ students: Student[] }>("/api/students"),
      apiFetch<{ goals: Goal[] }>(`/api/goals?studentId=${studentId}`),
      apiFetch<{ accommodations: StudentAccommodation[] }>(
        `/api/student-accommodations?studentId=${studentId}`
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

  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <Link href="/entry" className="text-muted text-xs underline underline-offset-4">
        ← Back to entry
      </Link>

      <h2 className="mt-2">Manage goals{student ? ` — ${student.displayName}` : ""}</h2>
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

      {!goals ? (
        <p className="text-muted mt-6 text-sm">Loading…</p>
      ) : student === null && !error ? (
        <p className="mt-6 text-sm" style={{ color: "var(--color-accent-700)" }}>
          This student isn&apos;t in your classroom roster.
        </p>
      ) : (
        <>
          <StudentDetailsEditor
            student={student!}
            onRenamed={setStudent}
            onRetired={() => router.push("/entry")}
          />
          <AccommodationsManager
            studentId={studentId}
            accommodations={accommodations}
            setAccommodations={setAccommodations}
          />
        <div className="mt-6 flex flex-col gap-4">
          {goals.map((goal) => (
            <GoalEditor
              key={goal.id}
              goal={goal}
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
        </div>
        </>
      )}
    </main>
  );
}
