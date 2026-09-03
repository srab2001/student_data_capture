import { describe, expect, it } from "vitest";
import {
  measurementPlanStatus,
  type MeasurementPlan,
} from "@/lib/measurement-plans";

const plan: MeasurementPlan = {
  baseline: "2 of 10 independent",
  observableDefinition: "Begins the assigned task within 30 seconds.",
  measurementMethod: "Record one rating after each scheduled work block.",
  masteryCriterion: "Independent in 4 of 5 observations for 3 weeks.",
  collectionDays: ["monday", "wednesday", "friday"],
  observationsRequired: 2,
  setting: "Independent work",
  opportunitiesRequired: 5,
  observationWindowMinutes: null,
  responsibleRole: "either",
  effectiveFrom: "2026-09-01",
  effectiveTo: null,
};

describe("measurementPlanStatus", () => {
  it("marks scheduled evidence due until the minimum is reached", () => {
    expect(
      measurementPlanStatus(plan, {
        dateIso: "2026-09-02",
        staffRole: "teacher",
        observationCount: 1,
      })
    ).toMatchObject({ kind: "due", isDue: true, isComplete: false });

    expect(
      measurementPlanStatus(plan, {
        dateIso: "2026-09-02",
        staffRole: "teacher",
        observationCount: 2,
      })
    ).toMatchObject({ kind: "complete", isDue: true, isComplete: true });
  });

  it("does not assign a goal on an unscheduled day or weekend", () => {
    for (const dateIso of ["2026-09-03", "2026-09-05"]) {
      expect(
        measurementPlanStatus(plan, {
          dateIso,
          staffRole: "teacher",
          observationCount: 0,
        })
      ).toMatchObject({ kind: "not_due", isDue: false });
    }
  });

  it("supports an explicitly scheduled weekend service day", () => {
    expect(
      measurementPlanStatus(
        { ...plan, collectionDays: ["saturday"] },
        {
          dateIso: "2026-09-05",
          staffRole: "teacher",
          observationCount: 0,
        }
      )
    ).toMatchObject({ kind: "due", isDue: true });
  });

  it("honors responsible role and effective dates", () => {
    const aidePlan = { ...plan, responsibleRole: "aide" as const };
    expect(
      measurementPlanStatus(aidePlan, {
        dateIso: "2026-09-02",
        staffRole: "teacher",
        observationCount: 0,
      }).label
    ).toBe("Assigned to aide");
    expect(
      measurementPlanStatus(plan, {
        dateIso: "2026-08-31",
        staffRole: "teacher",
        observationCount: 0,
      }).label
    ).toBe("Not active yet");
  });

  it("keeps legacy goals usable while flagging the missing plan", () => {
    expect(
      measurementPlanStatus(null, {
        dateIso: "2026-09-02",
        staffRole: "teacher",
        observationCount: 0,
      })
    ).toMatchObject({ kind: "incomplete", isDue: true, isComplete: false });
  });
});
