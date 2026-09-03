import { describe, expect, it } from "vitest";
import type { MeasurementPlan } from "@/lib/measurement-plans";
import {
  aimStatusForLatest,
  aimValueOnDate,
  collectionEvidenceForRange,
  dataSufficiencyForRange,
  numericValueForReading,
  scheduledCollectionDates,
  trendAnalysisForRange,
  type DatedObservation,
  type ProgressTarget,
} from "@/lib/progress-monitoring";

const plan: MeasurementPlan = {
  baseline: "Synthetic baseline",
  observableDefinition: "Synthetic definition",
  measurementMethod: "Synthetic method",
  masteryCriterion: "Synthetic criterion",
  collectionDays: ["monday", "wednesday"],
  observationsRequired: 2,
  setting: "Synthetic setting",
  opportunitiesRequired: 2,
  observationWindowMinutes: null,
  responsibleRole: "either",
  effectiveFrom: "2026-09-01",
  effectiveTo: null,
};

function event(
  sessionDate: string,
  entryKind: DatedObservation["entryKind"],
  values: Partial<DatedObservation> = {}
): DatedObservation {
  return {
    sessionDate,
    entryKind,
    entryAt: new Date(`${sessionDate}T14:00:00Z`),
    createdAt: new Date(`${sessionDate}T14:00:00Z`),
    valueNumeric: null,
    valueEnum: null,
    trialsTotal: null,
    trialsCorrect: null,
    opportunitiesObserved: null,
    observationDurationSeconds: null,
    note: null,
    observationDetails: null,
    ...values,
  };
}

describe("progress monitoring decision support", () => {
  it("enumerates only scheduled days inside the plan and report range", () => {
    expect(scheduledCollectionDates(plan, "2026-08-30", "2026-09-09")).toEqual([
      "2026-09-02",
      "2026-09-07",
      "2026-09-09",
    ]);
    expect(
      scheduledCollectionDates(
        { ...plan, effectiveTo: "2026-09-07" },
        "2026-08-30",
        "2026-09-09"
      )
    ).toEqual(["2026-09-02", "2026-09-07"]);
  });

  it("caps extra samples and reports collection compliance", () => {
    const rows = [
      event("2026-09-02", "correct_trial"),
      event("2026-09-02", "incorrect_trial"),
      event("2026-09-02", "correct_trial"),
      event("2026-09-02", "incorrect_trial"),
      event("2026-09-07", "correct_trial"),
      event("2026-09-07", "incorrect_trial"),
    ];
    expect(collectionEvidenceForRange("accuracy_pct", rows, plan, "2026-09-01", "2026-09-09")).toMatchObject({
      kind: "needs_attention",
      scheduledDays: 3,
      completedDays: 1,
      expectedEvidence: 6,
      collectedEvidence: 3,
      compliancePct: 50,
      offScheduleEvidence: 0,
    });
  });

  it("separates optional or off-schedule evidence from planned compliance", () => {
    const result = collectionEvidenceForRange(
      "fluency_rate",
      [
        event("2026-09-02", "numeric", { valueNumeric: 30 }),
        event("2026-09-03", "numeric", { valueNumeric: 32 }),
      ],
      { ...plan, observationsRequired: 1 },
      "2026-09-01",
      "2026-09-09"
    );
    expect(result.offScheduleEvidence).toBe(1);
    expect(result.label).toContain("optional/off-schedule");
  });

  it("retains optional evidence when the range has no scheduled days", () => {
    const result = collectionEvidenceForRange(
      "fluency_rate",
      [event("2026-09-03", "numeric", { valueNumeric: 32 })],
      { ...plan, collectionDays: ["monday"] },
      "2026-09-03",
      "2026-09-03"
    );
    expect(result).toMatchObject({
      kind: "not_scheduled",
      expectedEvidence: 0,
      collectedEvidence: 0,
      offScheduleEvidence: 1,
    });
    expect(result.label).toContain("1 optional/off-schedule");
  });

  it("does not invent an expectation when the plan is incomplete", () => {
    expect(
      collectionEvidenceForRange(
        "fluency_rate",
        [event("2026-09-02", "numeric", { valueNumeric: 42 })],
        null,
        "2026-09-01",
        "2026-09-09"
      )
    ).toMatchObject({ kind: "plan_incomplete", expectedEvidence: null });
  });

  it("labels fewer than three observation dates as limited", () => {
    expect(
      dataSufficiencyForRange([
        event("2026-09-02", "numeric", { valueNumeric: 20 }),
        event("2026-09-02", "note", { note: "Synthetic note" }),
        event("2026-09-03", "numeric", { valueNumeric: 22 }),
      ])
    ).toMatchObject({ kind: "limited", observationDays: 2 });
  });

  it("uses percentage accuracy and leaves categorical readings nonnumeric", () => {
    expect(
      numericValueForReading("accuracy_pct", {
        valueNumeric: null,
        trialsTotal: 8,
        trialsCorrect: 6,
      })
    ).toBe(75);
    expect(
      numericValueForReading("icon_scale", {
        valueNumeric: 4,
        trialsTotal: null,
        trialsCorrect: null,
      })
    ).toBeNull();
  });

  it("normalizes frequency by actual duration or opportunities", () => {
    expect(
      numericValueForReading("frequency_count", {
        valueNumeric: 4,
        trialsTotal: null,
        trialsCorrect: null,
        observationDurationSeconds: 600,
      })
    ).toBe(0.4);
    expect(
      numericValueForReading("frequency_count", {
        valueNumeric: 4,
        trialsTotal: null,
        trialsCorrect: null,
        opportunitiesObserved: 20,
      })
    ).toBe(20);
  });

  it("uses recent-window averages and the configured decrease direction", () => {
    const rows = [8, 7, 5, 4].map((value, index) =>
      event(`2026-09-0${index + 1}`, "numeric", { valueNumeric: value })
    );
    const trend = trendAnalysisForRange("frequency_count", rows, {
      baselineValue: 8,
      baselineDate: "2026-09-01",
      targetValue: 2,
      targetDate: "2026-12-01",
      direction: "decrease",
    });
    expect(trend).toMatchObject({
      kind: "favorable",
      sampleCount: 4,
      earlyAverage: 7.5,
      recentAverage: 4.5,
      change: -3,
    });
    expect(trend.label).toContain("n=4");
  });

  it("interpolates increasing and decreasing aim lines", () => {
    const increasing: ProgressTarget = {
      baselineValue: 40,
      baselineDate: "2026-09-01",
      targetValue: 80,
      targetDate: "2026-09-11",
      direction: "increase",
    };
    expect(aimValueOnDate(increasing, "2026-09-06")).toBe(60);
    expect(aimValueOnDate(increasing, "2026-08-20")).toBe(40);
    expect(aimValueOnDate(increasing, "2026-09-20")).toBe(80);
    expect(
      aimStatusForLatest(increasing, { sessionDate: "2026-09-06", value: 62 })
    ).toMatchObject({ kind: "on_track", expectedValue: 60 });

    const decreasing = { ...increasing, baselineValue: 10, targetValue: 2, direction: "decrease" as const };
    expect(
      aimStatusForLatest(decreasing, { sessionDate: "2026-09-06", value: 7 })
    ).toMatchObject({ kind: "off_track", expectedValue: 6 });
  });
});
