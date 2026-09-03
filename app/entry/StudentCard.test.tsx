import { describe, expect, it } from "vitest";
import type { DataPoint, Goal } from "@/lib/db/types";
import type { EntryActions } from "@/app/entry/types";
import { isLogged } from "@/app/entry/StudentCard";

const goal = {
  id: "00000000-0000-4000-8000-000000000001",
  metricType: "fluency_rate",
} as Goal;

function actions(valueNumeric: number | null): EntryActions {
  return {
    dataPointForGoal: () => ({ valueNumeric } as DataPoint),
    accommodationsForStudent: () => [],
    measurementStatusForGoal: () => ({
      kind: "due",
      isDue: true,
      isComplete: valueNumeric !== null,
      label: "1/1 collected",
    }),
    timerSecondsForGoal: () => 0,
    timerRunningForGoal: () => false,
    onTapAccuracy: () => undefined,
    onTapTally: () => undefined,
    onCompleteObservation: () => undefined,
    onSetIconReading: () => undefined,
    onSetPromptLevel: () => undefined,
    onSetFluencyRate: () => undefined,
    onLogRubric: () => undefined,
    onLogAbc: () => undefined,
    onSetTaskStep: () => undefined,
    onSetAccommodationUsed: () => undefined,
    onStartTimer: () => undefined,
    onStopTimer: () => undefined,
    onNoteBlur: () => undefined,
    canUndoForGoal: () => false,
    onUndoLast: () => undefined,
    saveStatusForGoal: () => "idle",
    onLogAccommodation: () => undefined,
  };
}

describe("isLogged", () => {
  it("counts a zero fluency observation as collected data", () => {
    expect(isLogged(goal, actions(0))).toBe(true);
  });

  it("does not count a missing fluency observation", () => {
    expect(isLogged(goal, actions(null))).toBe(false);
  });
});
