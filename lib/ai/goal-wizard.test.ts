import { describe, expect, it, vi } from "vitest";

const { requestStructuredJson } = vi.hoisted(() => ({ requestStructuredJson: vi.fn() }));
vi.mock("@/lib/ai/client", () => ({ requestStructuredJson }));

import { InvalidAiSuggestionError, proposeMeasurementPlan } from "@/lib/ai/goal-wizard";

const VALID_PLAN_FROM_MODEL = {
  baseline: "2 of 10 correct",
  observableDefinition: "Selects the correct response within 10 seconds.",
  measurementMethod: "Present 10 discrete trials and record each response.",
  masteryCriterion: "80% across 3 consecutive probes",
  collectionDays: ["monday", "wednesday", "friday"],
  observationsRequired: 10,
  setting: "Small-group instruction",
  opportunitiesRequired: 10,
  responsibleRole: "either",
  effectiveFrom: "2026-09-04",
};

describe("proposeMeasurementPlan", () => {
  it("normalizes an omitted opportunities/window/end-date and returns a valid plan", async () => {
    requestStructuredJson.mockResolvedValueOnce(VALID_PLAN_FROM_MODEL);

    const plan = await proposeMeasurementPlan(
      {
        domain: "academic",
        metricType: "accuracy_pct",
        skillDescription: "Reading grade-level passages aloud.",
      },
      { now: new Date("2026-09-04T12:00:00Z") }
    );

    expect(plan.opportunitiesRequired).toBe(10);
    expect(plan.observationWindowMinutes).toBeNull();
    expect(plan.effectiveTo).toBeNull();
  });

  it("never sends the student's identity to the model", async () => {
    requestStructuredJson.mockResolvedValueOnce(VALID_PLAN_FROM_MODEL);

    const contaminated = {
      domain: "academic",
      metricType: "accuracy_pct",
      skillDescription: "Reading grade-level passages aloud.",
      // A caller might accidentally pass a whole student/goal row in.
      studentId: "00000000-0000-4000-8000-000000000001",
      displayName: "Real Student Name",
    } as unknown as Parameters<typeof proposeMeasurementPlan>[0];

    await proposeMeasurementPlan(contaminated);

    const sentPayload = JSON.parse(requestStructuredJson.mock.calls[0][0].messages[0].content);
    expect(sentPayload).not.toHaveProperty("studentId");
    expect(sentPayload).not.toHaveProperty("displayName");
  });

  it("rejects a structurally invalid response instead of returning it", async () => {
    requestStructuredJson.mockResolvedValueOnce({ baseline: "only one field" });

    await expect(
      proposeMeasurementPlan({
        domain: "academic",
        metricType: "accuracy_pct",
        skillDescription: "Reading grade-level passages aloud.",
      })
    ).rejects.toBeInstanceOf(InvalidAiSuggestionError);
  });

  it("rejects a response with both opportunities and a window set to invalid values", async () => {
    requestStructuredJson.mockResolvedValueOnce({
      ...VALID_PLAN_FROM_MODEL,
      observationsRequired: -1,
    });

    await expect(
      proposeMeasurementPlan({
        domain: "academic",
        metricType: "accuracy_pct",
        skillDescription: "Reading grade-level passages aloud.",
      })
    ).rejects.toBeInstanceOf(InvalidAiSuggestionError);
  });
});
