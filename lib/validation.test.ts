import { describe, expect, it } from "vitest";
import {
  createDataPointSchema,
  createGoalSchema,
  entryPreferencesSchema,
  rosterGroupSchema,
} from "@/lib/validation";

const ids = {
  goalId: "00000000-0000-4000-8000-000000000001",
  sessionId: "00000000-0000-4000-8000-000000000002",
  clientRequestId: "00000000-0000-4000-8000-000000000003",
  entryAt: "2026-09-02T14:30:00.000Z",
};

const measurementPlan = {
  baseline: "2 of 10 correct",
  observableDefinition: "Selects the correct response within 10 seconds.",
  measurementMethod: "Present 10 discrete trials and record each response.",
  masteryCriterion: "80% across 3 consecutive probes",
  collectionDays: ["monday", "wednesday", "friday"],
  observationsRequired: 10,
  setting: "Small-group instruction",
  opportunitiesRequired: 10,
  observationWindowMinutes: null,
  responsibleRole: "either",
  effectiveFrom: "2026-09-01",
  effectiveTo: null,
} as const;

describe("createDataPointSchema", () => {
  it("accepts an immutable accuracy event", () => {
    expect(
      createDataPointSchema.parse({ ...ids, entryKind: "correct_trial" })
    ).toMatchObject({ entryKind: "correct_trial" });
  });

  it("requires a tally event to represent exactly one occurrence", () => {
    const result = createDataPointSchema.safeParse({
      ...ids,
      entryKind: "tally",
      valueNumeric: 2,
    });

    expect(result.success).toBe(false);
  });

  it("allows a note-clearing event", () => {
    expect(
      createDataPointSchema.safeParse({ ...ids, entryKind: "note", note: null }).success
    ).toBe(true);
  });

  it("does not accept a client-created legacy snapshot", () => {
    expect(
      createDataPointSchema.safeParse({ ...ids, entryKind: "legacy_snapshot" }).success
    ).toBe(false);
  });

  it("accepts an explicit completed observation with no fabricated value", () => {
    expect(
      createDataPointSchema.safeParse({ ...ids, entryKind: "observation_complete" })
        .success
    ).toBe(true);
  });

  it("rejects fields that do not belong to the event kind", () => {
    expect(
      createDataPointSchema.safeParse({
        ...ids,
        entryKind: "correct_trial",
        valueNumeric: 1,
      }).success
    ).toBe(false);
  });
});

describe("createGoalSchema", () => {
  it("requires goal-specific labels for task analysis", () => {
    const result = createGoalSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000004",
      domain: "independence",
      goalText: "Complete the arrival routine",
      metricType: "task_analysis_step",
      targetFrequency: "daily",
      measurementPlan,
    });

    expect(result.success).toBe(false);
  });

  it("accepts unique task-analysis labels", () => {
    const result = createGoalSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000004",
      domain: "independence",
      goalText: "Complete the arrival routine",
      metricType: "task_analysis_step",
      taskAnalysisSteps: ["Hang backpack", "Open planner"],
      targetFrequency: "daily",
      measurementPlan,
    });

    expect(result.success).toBe(true);
  });

  it("requires a complete measurement plan for every new goal", () => {
    const result = createGoalSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000004",
      domain: "academic",
      goalText: "Answer comprehension questions",
      metricType: "accuracy_pct",
      targetFrequency: "weekly",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a measurement plan whose end date precedes its start date", () => {
    const result = createGoalSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000004",
      domain: "academic",
      goalText: "Answer comprehension questions",
      metricType: "accuracy_pct",
      targetFrequency: "weekly",
      measurementPlan: {
        ...measurementPlan,
        effectiveTo: "2026-08-31",
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires opportunities or a timed observation window", () => {
    const result = createGoalSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000004",
      domain: "behavioral",
      goalText: "Remain engaged during independent work",
      metricType: "duration_seconds",
      targetFrequency: "daily",
      measurementPlan: {
        ...measurementPlan,
        opportunitiesRequired: null,
        observationWindowMinutes: null,
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("Phase 3 workflow validation", () => {
  it("accepts a bounded roster group with unique students", () => {
    expect(
      rosterGroupSchema.safeParse({
        name: "Morning reading",
        studentIds: [
          "00000000-0000-4000-8000-000000000011",
          "00000000-0000-4000-8000-000000000012",
        ],
      }).success
    ).toBe(true);
  });

  it("rejects duplicate roster membership", () => {
    const studentId = "00000000-0000-4000-8000-000000000011";
    expect(
      rosterGroupSchema.safeParse({
        name: "Morning reading",
        studentIds: [studentId, studentId],
      }).success
    ).toBe(false);
  });

  it("accepts only known entry preferences", () => {
    expect(
      entryPreferencesSchema.safeParse({
        layout: "accordion",
        workflowMode: "focus",
        selectedGroupId: null,
      }).success
    ).toBe(true);
    expect(
      entryPreferencesSchema.safeParse({
        layout: "cards",
        workflowMode: "dashboard",
        selectedGroupId: null,
      }).success
    ).toBe(false);
  });
});
