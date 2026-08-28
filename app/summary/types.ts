// Client-side shape of the /api/summary response. Mirrors lib/summary.ts
// but with Date fields as the ISO strings they become after JSON.

export type ClientGoal = {
  id: string;
  studentId: string;
  domain: "academic" | "behavioral" | "independence" | "accommodation";
  goalText: string;
  metricType: string;
  iconSet: string | null;
};

export type ClientDataPoint = {
  sessionDate: string;
  valueNumeric: number | null;
  valueEnum: string | null;
  trialsTotal: number | null;
  trialsCorrect: number | null;
  note: string | null;
};

export type ClientGoalSummary = {
  goal: ClientGoal;
  dataPoints: ClientDataPoint[];
  currentValueLabel: string;
  trendLabel: string;
};

export type ClientStudentSummary = {
  student: { id: string; displayName: string; isSynthetic: boolean };
  goals: ClientGoalSummary[];
  accommodations: {
    logs: { accommodationName: string; used: boolean; effectivenessRating: number | null; entryAt: string }[];
    usageRatePct: number | null;
    avgEffectiveness: number | null;
  };
};

export type ProgressSummaryResponse = {
  rangeFrom: string;
  rangeTo: string;
  generatedAt: string;
  students: ClientStudentSummary[];
};
