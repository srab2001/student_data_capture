import type { DataPoint, StudentAccommodation } from "@/lib/db/types";
import type { MeasurementPlanStatus } from "@/lib/measurement-plans";
import type { EntryLayout } from "@/lib/entry-workflow";

/**
 * The full set of per-goal/per-student actions the entry screen exposes.
 * Shared by all three layouts (Card stack, Grid, Accordion) so each is a
 * pure rendering of the same EntryScreen state/autosave logic, never a
 * duplicate of it.
 */
export type EntryActions = {
  dataPointForGoal: (goalId: string) => DataPoint | undefined;
  accommodationsForStudent: (studentId: string) => StudentAccommodation[];
  measurementStatusForGoal: (goalId: string) => MeasurementPlanStatus;
  timerSecondsForGoal: (goalId: string) => number;
  timerRunningForGoal: (goalId: string) => boolean;
  onTapAccuracy: (goalId: string, correct: boolean) => void;
  onTapTally: (goalId: string) => void;
  onCompleteObservation: (
    goalId: string,
    exposure?: { opportunitiesObserved?: number; observationDurationSeconds?: number }
  ) => void;
  onSetIconReading: (goalId: string, value: string) => void;
  onSetPromptLevel: (goalId: string, value: string) => void;
  onSetFluencyRate: (goalId: string, value: number) => void;
  onLogRubric: (
    goalId: string,
    score: number,
    workSample: string,
    criterion: string | null
  ) => void;
  onLogAbc: (
    goalId: string,
    antecedent: string,
    behavior: string,
    consequence: string
  ) => void;
  onSetTaskStep: (goalId: string, step: number) => void;
  onSetAccommodationUsed: (goalId: string, used: boolean) => void;
  onStartTimer: (goalId: string) => void;
  onStopTimer: (goalId: string) => void;
  onNoteBlur: (goalId: string, note: string) => void;
  canUndoForGoal: (goalId: string) => boolean;
  onUndoLast: (goalId: string) => void;
  saveStatusForGoal: (
    goalId: string
  ) => "idle" | "saving" | "saved" | "queued" | "failed";
  onLogAccommodation: (
    studentId: string,
    accommodationName: string,
    used: boolean,
    effectivenessRating: number | null,
    context: {
      sessionId: string | null;
      goalId: string | null;
      setting: string | null;
      activity: string | null;
      implementationFidelity: number | null;
      reasonNotUsed: string | null;
    }
  ) => void;
  disabled?: boolean;
};

export type EntryView = EntryLayout;
