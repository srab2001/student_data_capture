import type {
  AimStatus,
  CollectionEvidence,
  DataSufficiency,
  ProgressTarget,
  TrendAnalysis,
} from "@/lib/progress-monitoring";
import type { DataPoint, Goal } from "@/lib/db/types";
import type { ObservationDetails, RubricConfig } from "@/lib/student-data-plan";

// Client-side shape of the /api/summary response. Mirrors lib/summary.ts
// but with Date fields as the ISO strings they become after JSON.

export type ClientGoal = {
  id: string;
  studentId: string;
  domain: Goal["domain"];
  goalText: string;
  metricType: Goal["metricType"];
  iconSet: Goal["iconSet"];
  progressTarget: ProgressTarget | null;
  rubricConfig: RubricConfig | null;
  taskAnalysisSteps: string[] | null;
  promptHierarchy: string[] | null;
};

export type ClientDataPoint = {
  id: string;
  sessionDate: string;
  valueNumeric: number | null;
  valueEnum: string | null;
  trialsTotal: number | null;
  trialsCorrect: number | null;
  note: string | null;
  entryKind: DataPoint["entryKind"];
  observationDetails: ObservationDetails | null;
  opportunitiesObserved: number | null;
  observationDurationSeconds: number | null;
};

export type ClientIntervention = {
  id: string;
  goalId: string;
  interventionDate: string;
  description: string;
  createdAt: string;
};

export type ClientGoalSummary = {
  goal: ClientGoal;
  dataPoints: ClientDataPoint[];
  currentValueLabel: string;
  trendLabel: string;
  trendAnalysis: TrendAnalysis;
  collectionEvidence: CollectionEvidence;
  dataSufficiency: DataSufficiency;
  aimStatus: AimStatus;
  interventions: ClientIntervention[];
};

export type ClientStudentSummary = {
  student: { id: string; displayName: string; isSynthetic: boolean };
  goals: ClientGoalSummary[];
  accommodations: {
    logs: {
      accommodationName: string;
      used: boolean;
      effectivenessRating: number | null;
      implementationFidelity: number | null;
      setting: string | null;
      activity: string | null;
      sessionId: string | null;
      goalId: string | null;
      entryAt: string;
    }[];
    usageRatePct: number | null;
    avgEffectiveness: number | null;
    bySupport: Array<{
      accommodationName: string;
      setting: string | null;
      logCount: number;
      usedCount: number;
      usageRatePct: number;
      effectivenessN: number;
      avgEffectiveness: number | null;
      fidelityN: number;
      avgFidelity: number | null;
      contextLinkedCount: number;
    }>;
  };
};

export type ProgressSummaryResponse = {
  rangeFrom: string;
  rangeTo: string;
  generatedAt: string;
  students: ClientStudentSummary[];
};
