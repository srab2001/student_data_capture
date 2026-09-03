import { describe, expect, it } from "vitest";
import type { DataPoint, Goal } from "@/lib/db/types";
import { summarizeGoal } from "@/lib/summary";

const baseGoal = {
  id: "00000000-0000-4000-8000-000000000001",
  studentId: "00000000-0000-4000-8000-000000000002",
  domain: "behavioral",
  goalText: "Synthetic goal",
  targetFrequency: "session_based",
  measurementPlan: null,
  progressTarget: null,
  rubricConfig: null,
} as Goal;

function observation(
  id: string,
  entryKind: DataPoint["entryKind"],
  observationDetails: DataPoint["observationDetails"],
  valueNumeric: number | null = null
) {
  const at = new Date(`2026-09-03T14:00:0${id}.000Z`);
  return {
    id: `00000000-0000-4000-8000-00000000000${id}`,
    goalId: baseGoal.id,
    sessionId: "00000000-0000-4000-8000-000000000003",
    enteredByStaffId: "00000000-0000-4000-8000-000000000004",
    entryAt: at,
    entryKind,
    clientRequestId: `00000000-0000-4000-8000-00000000001${id}`,
    valueNumeric,
    valueEnum: null,
    trialsTotal: null,
    trialsCorrect: null,
    opportunitiesObserved: null,
    observationDurationSeconds: null,
    note: null,
    observationDetails,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    sessionDate: "2026-09-03",
  };
}

describe("structured progress summaries", () => {
  it("preserves multiple ABC records from the same session", () => {
    const rows = [
      observation("1", "abc_observation", {
        kind: "abc",
        antecedent: "First prompt",
        behavior: "First response",
        consequence: "First support",
      }),
      observation("2", "abc_observation", {
        kind: "abc",
        antecedent: "Second prompt",
        behavior: "Second response",
        consequence: "Second support",
      }),
    ];
    const summary = summarizeGoal(
      { ...baseGoal, metricType: "abc_observation" },
      rows
    );

    expect(summary.dataPoints).toHaveLength(2);
    expect(summary.currentValueLabel).toBe("2 ABC observations");
  });

  it("labels a rubric score against the configured maximum", () => {
    const goal = {
      ...baseGoal,
      domain: "academic",
      metricType: "rubric_score",
      rubricConfig: { title: "Writing", maxScore: 4, criteria: ["Organization"] },
    } as Goal;
    const summary = summarizeGoal(goal, [
      observation(
        "3",
        "rubric_score",
        {
          kind: "rubric",
          workSample: "Synthetic paragraph",
          criterion: "Organization",
        },
        3
      ),
    ]);

    expect(summary.currentValueLabel).toBe("3/4");
    expect(summary.dataPoints[0].observationDetails?.kind).toBe("rubric");
  });
});
