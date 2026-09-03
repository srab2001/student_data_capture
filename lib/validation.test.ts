import { describe, expect, it } from "vitest";
import {
  createDataPointSchema,
  createAccommodationLogSchema,
  createGoalSchema,
  entryPreferencesSchema,
  interventionAnnotationSchema,
  rosterGroupSchema,
  studentAccommodationSchema,
  summaryFilterSchema,
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

  it("accepts actual exposure only on a completed observation window", () => {
    expect(
      createDataPointSchema.safeParse({
        ...ids,
        entryKind: "observation_complete",
        observationDurationSeconds: 900,
        opportunitiesObserved: 12,
      }).success
    ).toBe(true);
    expect(
      createDataPointSchema.safeParse({
        ...ids,
        entryKind: "tally",
        valueNumeric: 1,
        observationDurationSeconds: 900,
      }).success
    ).toBe(false);
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

  it("requires complete structured details for ABC observations", () => {
    expect(
      createDataPointSchema.safeParse({
        ...ids,
        entryKind: "abc_observation",
        observationDetails: {
          kind: "abc",
          antecedent: "Independent work was assigned.",
          behavior: "Student left the seat.",
          consequence: "Staff redirected to the visual schedule.",
        },
      }).success
    ).toBe(true);
    expect(
      createDataPointSchema.safeParse({
        ...ids,
        entryKind: "abc_observation",
        observationDetails: { kind: "abc", antecedent: "Prompt" },
      }).success
    ).toBe(false);
  });

  it("requires a score and work-sample identity for rubric observations", () => {
    expect(
      createDataPointSchema.safeParse({
        ...ids,
        entryKind: "rubric_score",
        valueNumeric: 3,
        observationDetails: {
          kind: "rubric",
          workSample: "Paragraph draft 2",
          criterion: "Organization",
        },
      }).success
    ).toBe(true);
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

  it("requires configurable prompt levels and rubric criteria", () => {
    expect(
      createGoalSchema.safeParse({
        studentId: "00000000-0000-4000-8000-000000000004",
        domain: "independence",
        goalText: "Begin work with fading prompts",
        metricType: "prompt_level",
        promptHierarchy: ["Verbal prompt", "Independent"],
        targetFrequency: "session_based",
        measurementPlan,
      }).success
    ).toBe(true);
    expect(
      createGoalSchema.safeParse({
        studentId: "00000000-0000-4000-8000-000000000004",
        domain: "academic",
        goalText: "Write an organized paragraph",
        metricType: "rubric_score",
        targetFrequency: "biweekly",
        measurementPlan,
      }).success
    ).toBe(false);
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

  it("accepts an explicit quantitative progress target", () => {
    const result = createGoalSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000004",
      domain: "academic",
      goalText: "Read a passage accurately",
      metricType: "accuracy_pct",
      targetFrequency: "weekly",
      measurementPlan,
      progressTarget: {
        baselineValue: 60,
        baselineDate: "2026-09-01",
        targetValue: 90,
        targetDate: "2027-01-15",
        direction: "increase",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects accuracy targets above 100 percent", () => {
    expect(
      createGoalSchema.safeParse({
        studentId: "00000000-0000-4000-8000-000000000004",
        domain: "academic",
        goalText: "Read a passage accurately",
        metricType: "accuracy_pct",
        targetFrequency: "weekly",
        measurementPlan,
        progressTarget: {
          baselineValue: 60,
          baselineDate: "2026-09-01",
          targetValue: 101,
          targetDate: "2027-01-15",
          direction: "increase",
        },
      }).success
    ).toBe(false);
  });

  it("rejects inferred-looking numeric targets for categorical metrics", () => {
    const result = createGoalSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000004",
      domain: "independence",
      goalText: "Use less intrusive prompts",
      metricType: "prompt_level",
      targetFrequency: "daily",
      measurementPlan,
      progressTarget: {
        baselineValue: 1,
        baselineDate: "2026-09-01",
        targetValue: 5,
        targetDate: "2027-01-15",
        direction: "increase",
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires progress-target values to match the selected direction", () => {
    const result = createGoalSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000004",
      domain: "behavioral",
      goalText: "Reduce call-outs",
      metricType: "frequency_count",
      targetFrequency: "daily",
      measurementPlan,
      progressTarget: {
        baselineValue: 8,
        baselineDate: "2026-09-01",
        targetValue: 2,
        targetDate: "2027-01-15",
        direction: "increase",
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("student accommodation configuration", () => {
  it("requires a student, setting, and implementation directions", () => {
    expect(
      studentAccommodationSchema.safeParse({
        studentId: "00000000-0000-4000-8000-000000000004",
        name: "Text-to-speech",
        setting: "Reading assessments",
        implementationNotes: "Offer before directions and confirm headphones are connected.",
      }).success
    ).toBe(true);
    expect(
      studentAccommodationSchema.safeParse({
        studentId: "00000000-0000-4000-8000-000000000004",
        name: "Text-to-speech",
        setting: "",
        implementationNotes: "Use as written.",
      }).success
    ).toBe(false);
  });

  it("validates optional context and keeps ratings off not-used logs", () => {
    const base = {
      studentId: "00000000-0000-4000-8000-000000000004",
      accommodationName: "Text-to-speech",
      sessionId: ids.sessionId,
      goalId: ids.goalId,
      setting: "Reading assessment",
      activity: "Comprehension probe",
      reasonNotUsed: "Student selected print access.",
    };
    expect(
      createAccommodationLogSchema.safeParse({
        ...base,
        used: true,
        effectivenessRating: 4,
        implementationFidelity: 5,
        reasonNotUsed: null,
      }).success
    ).toBe(true);
    expect(
      createAccommodationLogSchema.safeParse({
        ...base,
        used: false,
        effectivenessRating: 4,
      }).success
    ).toBe(false);
  });
});

describe("Phase 4 reporting validation", () => {
  it("accepts a bounded reporting range and intervention annotation", () => {
    expect(
      summaryFilterSchema.safeParse({ from: "2026-09-01", to: "2026-09-30" }).success
    ).toBe(true);
    expect(
      interventionAnnotationSchema.safeParse({
        goalId: ids.goalId,
        interventionDate: "2026-09-15",
        description: "Began a visual task checklist.",
      }).success
    ).toBe(true);
  });

  it("rejects reversed or unbounded reporting ranges", () => {
    expect(
      summaryFilterSchema.safeParse({ from: "2026-09-30", to: "2026-09-01" }).success
    ).toBe(false);
    expect(
      summaryFilterSchema.safeParse({ from: "2025-01-01", to: "2026-09-01" }).success
    ).toBe(false);
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
