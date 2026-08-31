import type { DataPoint } from "@/lib/db/types";

/**
 * The full set of per-goal/per-student actions the entry screen exposes.
 * Shared by all three layouts (Card stack, Grid, Accordion) so each is a
 * pure rendering of the same EntryScreen state/autosave logic, never a
 * duplicate of it.
 */
export type EntryActions = {
  dataPointForGoal: (goalId: string) => DataPoint | undefined;
  timerSecondsForGoal: (goalId: string) => number;
  timerRunningForGoal: (goalId: string) => boolean;
  onTapAccuracy: (goalId: string, correct: boolean) => void;
  onTapTally: (goalId: string) => void;
  onSetIconReading: (goalId: string, value: string) => void;
  onSetPromptLevel: (goalId: string, value: string) => void;
  onSetFluencyRate: (goalId: string, value: number) => void;
  onSetTaskStep: (goalId: string, step: number) => void;
  onSetAccommodationUsed: (goalId: string, used: boolean) => void;
  onStartTimer: (goalId: string) => void;
  onStopTimer: (goalId: string) => void;
  onNoteBlur: (goalId: string, note: string) => void;
  onLogAccommodation: (
    studentId: string,
    accommodationName: string,
    used: boolean,
    effectivenessRating: number
  ) => void;
  disabled?: boolean;
};

export type EntryView = "cards" | "grid" | "accordion";
