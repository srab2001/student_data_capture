"use client";

import { useState } from "react";
import type { Goal } from "@/lib/db/types";
import type { MeasurementPlan } from "@/lib/measurement-plans";
import { apiFetch, ApiError } from "@/lib/api-client";

type ExplainableGoal = {
  domain: Goal["domain"];
  metricType: Goal["metricType"];
  goalText: string;
  measurementPlan?: MeasurementPlan | null;
};

/**
 * Bounded, single-shot "explain this goal" helper. Sends only
 * domain/metricType/goalText/measurementPlan — never a student name or
 * ID (see lib/ai/redact.ts). Read-only: never writes anything.
 *
 * Accepts a narrowed goal shape (rather than the full Goal type) so it
 * also works on the summary screen's client-serialized ClientGoal, which
 * doesn't carry measurementPlan at all.
 */
export function ExplainGoalButton({ goal }: { goal: ExplainableGoal }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (status === "loading" || explanation) return;

    setStatus("loading");
    setError(null);
    try {
      const res = await apiFetch<{ explanation: string }>("/api/ai/explain-goal", {
        method: "POST",
        body: JSON.stringify({
          domain: goal.domain,
          metricType: goal.metricType,
          goalText: goal.goalText,
          measurementPlan: goal.measurementPlan ?? null,
        }),
      });
      setExplanation(res.explanation);
      setStatus("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI explanation is unavailable right now.");
      setStatus("failed");
    }
  }

  return (
    <span className="inline-block">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={handleClick}
        aria-expanded={open}
        aria-label={`Ask AI to explain ${goal.goalText}`}
      >
        {open ? "Hide AI explanation" : "Ask AI to explain"}
      </button>
      {open && (
        <div
          role="status"
          aria-live="polite"
          className="mt-1 text-xs"
          style={{
            maxWidth: 360,
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-neutral-100)",
            border: "1px solid var(--color-neutral-300)",
          }}
        >
          {status === "loading" && <span className="text-muted">Thinking…</span>}
          {status === "done" && explanation && <span>{explanation}</span>}
          {status === "failed" && <span style={{ color: "#b91c1c" }}>{error}</span>}
        </div>
      )}
    </span>
  );
}
