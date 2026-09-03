import { describe, expect, it } from "vitest";
import type { DataPoint } from "@/lib/db/types";
import {
  aggregateObservationEvents,
  evidenceUnitCount,
  isObservationCompatible,
  localDateIso,
  schoolDateIso,
} from "@/lib/observations";
import type { MeasurementPlan } from "@/lib/measurement-plans";

const plan: MeasurementPlan = {
  baseline: "Synthetic baseline",
  observableDefinition: "Defined response",
  measurementMethod: "Defined method",
  masteryCriterion: "Defined criterion",
  collectionDays: ["monday"],
  observationsRequired: 1,
  setting: "Defined setting",
  opportunitiesRequired: 10,
  observationWindowMinutes: null,
  responsibleRole: "either",
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
};

function event(
  entryKind: DataPoint["entryKind"],
  values: Partial<DataPoint> = {},
  second = 0
): DataPoint {
  const at = new Date(2026, 0, 2, 9, 0, second);
  return {
    id: crypto.randomUUID(),
    goalId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    enteredByStaffId: crypto.randomUUID(),
    entryAt: at,
    entryKind,
    clientRequestId: null,
    valueNumeric: null,
    valueEnum: null,
    trialsTotal: null,
    trialsCorrect: null,
    opportunitiesObserved: null,
    observationDurationSeconds: null,
    note: null,
    observationDetails: null,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    ...values,
  };
}

describe("aggregateObservationEvents", () => {
  it("preserves and totals individual accuracy trials", () => {
    const result = aggregateObservationEvents("accuracy_pct", [
      event("correct_trial"),
      event("incorrect_trial", {}, 1),
      event("correct_trial", {}, 2),
    ]);

    expect(result.trialsCorrect).toBe(2);
    expect(result.trialsTotal).toBe(3);
    expect(result.observationCount).toBe(3);
  });

  it("combines a legacy tally snapshot with new tally events", () => {
    const result = aggregateObservationEvents("frequency_count", [
      event("legacy_snapshot", { valueNumeric: 4 }),
      event("tally", { valueNumeric: 1 }, 1),
      event("tally", { valueNumeric: 1 }, 2),
    ]);

    expect(result.valueNumeric).toBe(6);
  });

  it("preserves the actual exposure from a completed observation window", () => {
    const result = aggregateObservationEvents("frequency_count", [
      event("tally", { valueNumeric: 1 }),
      event("observation_complete", {
        opportunitiesObserved: 12,
        observationDurationSeconds: 900,
      }, 1),
    ]);
    expect(result.opportunitiesObserved).toBe(12);
    expect(result.observationDurationSeconds).toBe(900);
  });

  it("keeps categorical observations and notes in chronological order", () => {
    const result = aggregateObservationEvents("prompt_level", [
      event("rating", { valueEnum: "verbal" }),
      event("note", { note: "First observation" }, 1),
      event("rating", { valueEnum: "independent" }, 2),
      event("note", { note: null }, 3),
    ]);

    expect(result.valueEnum).toBe("independent");
    expect(result.note).toBeNull();
    expect(result.observationCount).toBe(2);
  });

  it("ignores event kinds that do not belong to the goal metric", () => {
    const result = aggregateObservationEvents("fluency_rate", [
      event("tally", { valueNumeric: 1 }),
      event("numeric", { valueNumeric: 87 }, 1),
    ]);

    expect(result.valueNumeric).toBe(87);
    expect(result.observationCount).toBe(1);
  });

  it("tracks rubric scores and structured ABC observations as distinct evidence", () => {
    const rubric = aggregateObservationEvents("rubric_score", [
      event("rubric_score", {
        valueNumeric: 3,
        observationDetails: {
          kind: "rubric",
          workSample: "Synthetic paragraph",
          criterion: "Organization",
        },
      }),
    ]);
    const abc = aggregateObservationEvents("abc_observation", [
      event("abc_observation", {
        observationDetails: {
          kind: "abc",
          antecedent: "Task presented",
          behavior: "Student asked for a break",
          consequence: "Break card was honored",
        },
      }),
    ]);

    expect(rubric.valueNumeric).toBe(3);
    expect(rubric.observationCount).toBe(1);
    expect(abc.observationCount).toBe(1);
  });
});

describe("observation compatibility", () => {
  it("allows only appropriate event kinds for a metric", () => {
    expect(isObservationCompatible("accuracy_pct", "correct_trial")).toBe(true);
    expect(isObservationCompatible("accuracy_pct", "tally")).toBe(false);
    expect(isObservationCompatible("icon_scale", "rating")).toBe(true);
  });
});

describe("evidenceUnitCount", () => {
  it("counts a complete accuracy probe, not each trial as a separate sample", () => {
    const trials = Array.from({ length: 10 }, (_, index) =>
      event(index < 8 ? "correct_trial" : "incorrect_trial", {}, index)
    );

    expect(evidenceUnitCount("accuracy_pct", trials.slice(0, 9), plan)).toBe(0);
    expect(evidenceUnitCount("accuracy_pct", trials, plan)).toBe(1);
  });

  it("requires a completed frequency window and preserves zero-occurrence evidence", () => {
    const frequencyPlan = {
      ...plan,
      opportunitiesRequired: null,
      observationWindowMinutes: 15,
    };
    expect(
      evidenceUnitCount("frequency_count", [event("tally", { valueNumeric: 1 })], frequencyPlan)
    ).toBe(0);
    expect(
      evidenceUnitCount(
        "frequency_count",
        [event("observation_complete")],
        frequencyPlan
      )
    ).toBe(1);
  });

  it("counts a no-occurrence duration observation as evidence", () => {
    const events = [event("observation_complete")];
    expect(
      evidenceUnitCount(
        "duration_seconds",
        events,
        { ...plan, opportunitiesRequired: null, observationWindowMinutes: 10 }
      )
    ).toBe(1);
    expect(aggregateObservationEvents("duration_seconds", events).valueNumeric).toBe(0);
  });
});

describe("localDateIso", () => {
  it("formats the device-local calendar date instead of slicing UTC", () => {
    expect(localDateIso(new Date(2026, 8, 2, 23, 30))).toBe("2026-09-02");
  });

  it("uses the district timezone for server-side defaults", () => {
    expect(schoolDateIso(new Date("2026-09-03T02:30:00.000Z"))).toBe("2026-09-02");
  });
});
