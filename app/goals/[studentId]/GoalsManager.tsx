"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import type { Student, Goal } from "@/lib/db/types";
import {
  goalDomainValues,
  metricTypeValues,
  iconSetValues,
  targetFrequencyValues,
} from "@/lib/validation";

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
  targetFrequency: (typeof targetFrequencyValues)[number];
};

const BLANK_DRAFT: DraftGoal = {
  domain: "academic",
  goalText: "",
  metricType: "accuracy_pct",
  iconSet: "smiley_5",
  targetFrequency: "daily",
};

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
    </div>
  );
}

function goalToDraft(goal: Goal): DraftGoal {
  return {
    domain: goal.domain,
    goalText: goal.goalText,
    metricType: goal.metricType,
    iconSet: goal.iconSet ?? "smiley_5",
    targetFrequency: goal.targetFrequency,
  };
}

function GoalEditor({ goal, onSaved, onRetired }: { goal: Goal; onSaved: (g: Goal) => void; onRetired: (id: string) => void }) {
  const [draft, setDraft] = useState<DraftGoal>(goalToDraft(goal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(goalToDraft(goal));

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
      };
      const res = await apiFetch<{ goal: Goal }>(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved(res.goal);
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
          disabled={saving || !dirty || !draft.goalText.trim()}
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
        ...(draft.metricType === "icon_scale" ? { iconSet: draft.iconSet } : {}),
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
      {error && (
        <p className="mt-2 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={create}
          disabled={saving || !draft.goalText.trim()}
          className="btn btn-primary"
        >
          {saving ? "Adding…" : "Add goal"}
        </button>
      </div>
    </div>
  );
}

export function GoalsManager({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ students: Student[] }>("/api/students"),
      apiFetch<{ goals: Goal[] }>(`/api/goals?studentId=${studentId}`),
    ])
      .then(([studentsRes, goalsRes]) => {
        const found = studentsRes.students.find((s) => s.id === studentId) ?? null;
        setStudent(found);
        setGoals(goalsRes.goals);
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
        <div className="mt-6 flex flex-col gap-4">
          {goals.map((goal) => (
            <GoalEditor
              key={goal.id}
              goal={goal}
              onSaved={(updated) =>
                setGoals((prev) => prev!.map((g) => (g.id === updated.id ? updated : g)))
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
      )}
    </main>
  );
}
