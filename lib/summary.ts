import { and, asc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accommodationLogs,
  dataPoints,
  goals,
  interventionAnnotations,
  sessions,
  students,
} from "@/lib/db/schema";
import type {
  AccommodationLog,
  DataPoint,
  Goal,
  InterventionAnnotation,
  Student,
} from "@/lib/db/types";
import { aggregateObservationEvents } from "@/lib/observations";
import {
  aimStatusForLatest,
  collectionEvidenceForRange,
  dataSufficiencyForRange,
  isQuantitativeMetric,
  numericValueForReading,
  trendAnalysisForRange,
  type AimStatus,
  type CollectionEvidence,
  type DataSufficiency,
  type TrendAnalysis,
} from "@/lib/progress-monitoring";

type DatedDataPoint = DataPoint & { sessionDate: string };

export type GoalSummary = {
  goal: Goal;
  dataPoints: DatedDataPoint[];
  currentValueLabel: string;
  trendLabel: string;
  trendAnalysis: TrendAnalysis;
  collectionEvidence: CollectionEvidence;
  dataSufficiency: DataSufficiency;
  aimStatus: AimStatus;
  interventions: InterventionAnnotation[];
};

export type StudentSummary = {
  student: Student;
  goals: GoalSummary[];
  accommodations: {
    logs: AccommodationLog[];
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

export type ProgressSummary = {
  rangeFrom: string;
  rangeTo: string;
  generatedAt: string;
  students: StudentSummary[];
};

function formatIconReading(value: string | null): string {
  if (!value) return "—";
  if (value.endsWith("_of_5")) return `${value[0]} of 5`;
  return value.replace(/_/g, " ");
}

export function summarizeGoal(
  goal: Goal,
  rows: DatedDataPoint[],
  interventions: InterventionAnnotation[] = [],
  range: { from: string; to: string } = {
    from: rows[0]?.sessionDate ?? "1970-01-01",
    to: rows.at(-1)?.sessionDate ?? "1970-01-01",
  }
): GoalSummary {
  const bySession = new Map<string, DatedDataPoint[]>();
  for (const row of rows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  const aggregatedBySession = [...bySession.values()]
    .map((events) => {
      const latest = [...events].sort(
        (a, b) => new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime()
      ).at(-1)!;
      const aggregate = aggregateObservationEvents(goal.metricType, events);
      return {
        ...latest,
        valueNumeric: aggregate.valueNumeric,
        valueEnum: aggregate.valueEnum,
        trialsTotal: aggregate.trialsTotal,
        trialsCorrect: aggregate.trialsCorrect,
        opportunitiesObserved: aggregate.opportunitiesObserved,
        observationDurationSeconds: aggregate.observationDurationSeconds,
        note: aggregate.note,
      };
    })
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  // Rubric work samples and ABC records are meaningful individual artifacts,
  // not counters to collapse into one daily value. Preserve every event in the
  // reading table and CSV even when several are recorded in the same session.
  const sorted =
    goal.metricType === "rubric_score" || goal.metricType === "abc_observation"
      ? rows
          .filter((row) => row.entryKind === goal.metricType)
          .sort(
            (a, b) =>
              a.sessionDate.localeCompare(b.sessionDate) ||
              new Date(a.entryAt).getTime() - new Date(b.entryAt).getTime()
          )
      : aggregatedBySession;
  const latest = sorted.at(-1);
  const first = sorted[0];

  let currentValueLabel = "No data yet";
  let trendLabel = "—";

  switch (goal.metricType) {
    case "accuracy_pct": {
      if (latest?.trialsTotal) {
        const pct = Math.round(((latest.trialsCorrect ?? 0) / latest.trialsTotal) * 100);
        currentValueLabel = `${pct}% (${latest.trialsCorrect}/${latest.trialsTotal})`;
        if (first?.trialsTotal) {
          const firstPct = Math.round(((first.trialsCorrect ?? 0) / first.trialsTotal) * 100);
          trendLabel =
            pct > firstPct
              ? `▲ +${pct - firstPct}pt`
              : pct < firstPct
                ? `▼ ${pct - firstPct}pt`
                : "flat";
        }
      }
      break;
    }
    case "fluency_rate":
    case "duration_seconds":
    case "latency_seconds":
    case "frequency_count":
    case "task_analysis_step":
    case "rubric_score": {
      if (latest?.valueNumeric != null) {
        currentValueLabel = goal.metricType === "frequency_count" && latest.observationDurationSeconds
          ? `${latest.valueNumeric} · ${numericValueForReading(goal.metricType, latest)}/min`
          : goal.metricType === "frequency_count" && latest.opportunitiesObserved
            ? `${latest.valueNumeric} · ${numericValueForReading(goal.metricType, latest)} per 100 opportunities`
          : goal.metricType === "rubric_score" && goal.rubricConfig
            ? `${latest.valueNumeric}/${goal.rubricConfig.maxScore}`
            : String(latest.valueNumeric);
      }
      break;
    }
    case "icon_scale":
    case "prompt_level":
    case "accommodation_used": {
      if (latest?.valueEnum) currentValueLabel = formatIconReading(latest.valueEnum);
      break;
    }
    case "abc_observation": {
      const count = sorted.length;
      if (count > 0) currentValueLabel = `${count} ABC observation${count === 1 ? "" : "s"}`;
      break;
    }
  }

  const latestNumeric = latest ? numericValueForReading(goal.metricType, latest) : null;
  const trendAnalysis = trendAnalysisForRange(
    goal.metricType,
    sorted,
    goal.progressTarget ?? null
  );
  if (isQuantitativeMetric(goal.metricType)) trendLabel = trendAnalysis.label;

  return {
    goal,
    dataPoints: sorted,
    currentValueLabel,
    trendLabel,
    trendAnalysis,
    collectionEvidence: collectionEvidenceForRange(
      goal.metricType,
      rows,
      goal.measurementPlan ?? null,
      range.from,
      range.to
    ),
    dataSufficiency: dataSufficiencyForRange(rows),
    aimStatus: aimStatusForLatest(
      goal.progressTarget ?? null,
      latest && latestNumeric !== null
        ? { sessionDate: latest.sessionDate, value: latestNumeric }
        : null
    ),
    interventions: [...interventions].sort((a, b) =>
      a.interventionDate.localeCompare(b.interventionDate)
    ),
  };
}

export async function getProgressSummary(
  classroomId: string,
  opts: { studentId?: string; from: string; to: string }
): Promise<ProgressSummary> {
  const studentRows = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.classroomId, classroomId),
        isNull(students.deletedAt),
        opts.studentId ? eq(students.id, opts.studentId) : undefined
      )
    );
  const studentIds = studentRows.map((student) => student.id);

  if (studentIds.length === 0) {
    return {
      rangeFrom: opts.from,
      rangeTo: opts.to,
      generatedAt: new Date().toISOString(),
      students: [],
    };
  }

  const [goalRows, accommodationRows] = await Promise.all([
    db.select().from(goals).where(inArray(goals.studentId, studentIds)),
    db
      .select()
      .from(accommodationLogs)
      .where(
        and(
          inArray(accommodationLogs.studentId, studentIds),
          isNull(accommodationLogs.deletedAt),
          gte(accommodationLogs.entryAt, new Date(`${opts.from}T00:00:00Z`)),
          lte(accommodationLogs.entryAt, new Date(`${opts.to}T23:59:59.999Z`))
        )
      ),
  ]);
  const goalIds = goalRows.map((goal) => goal.id);

  const [observationRows, interventionRows] = goalIds.length
    ? await Promise.all([
        db
          .select({ dataPoint: dataPoints, sessionDate: sessions.sessionDate })
          .from(dataPoints)
          .innerJoin(sessions, eq(dataPoints.sessionId, sessions.id))
          .where(
            and(
              inArray(dataPoints.goalId, goalIds),
              isNull(dataPoints.deletedAt),
              gte(sessions.sessionDate, opts.from),
              lte(sessions.sessionDate, opts.to)
            )
          )
          .orderBy(asc(sessions.sessionDate)),
        db
          .select()
          .from(interventionAnnotations)
          .where(
            and(
              inArray(interventionAnnotations.goalId, goalIds),
              isNull(interventionAnnotations.deletedAt),
              gte(interventionAnnotations.interventionDate, opts.from),
              lte(interventionAnnotations.interventionDate, opts.to)
            )
          )
          .orderBy(asc(interventionAnnotations.interventionDate)),
      ])
    : [[], []];

  const observationsByGoal = new Map<string, DatedDataPoint[]>();
  for (const row of observationRows) {
    const observations = observationsByGoal.get(row.dataPoint.goalId) ?? [];
    observations.push({ ...row.dataPoint, sessionDate: row.sessionDate });
    observationsByGoal.set(row.dataPoint.goalId, observations);
  }

  const interventionsByGoal = new Map<string, InterventionAnnotation[]>();
  for (const intervention of interventionRows) {
    const annotations = interventionsByGoal.get(intervention.goalId) ?? [];
    annotations.push(intervention);
    interventionsByGoal.set(intervention.goalId, annotations);
  }

  return {
    rangeFrom: opts.from,
    rangeTo: opts.to,
    generatedAt: new Date().toISOString(),
    students: studentRows.map((student) => {
      const studentGoals = goalRows
        .filter((goal) => goal.studentId === student.id)
        .flatMap((goal) => {
          const observations = observationsByGoal.get(goal.id) ?? [];
          if (goal.deletedAt && observations.length === 0) return [];
          return [
            summarizeGoal(
              goal,
              observations,
              interventionsByGoal.get(goal.id) ?? [],
              { from: opts.from, to: opts.to }
            ),
          ];
        });
      const logs = accommodationRows.filter((row) => row.studentId === student.id);
      const usedCount = logs.filter((row) => row.used).length;
      const ratings = logs
        .filter((row) => row.used)
        .map((row) => row.effectivenessRating)
        .filter((rating): rating is number => rating != null);
      const supportGroups = new Map<string, AccommodationLog[]>();
      for (const log of logs) {
        const key = `${log.accommodationName.trim().toLocaleLowerCase()}::${
          log.setting?.trim().toLocaleLowerCase() ?? ""
        }`;
        const group = supportGroups.get(key) ?? [];
        group.push(log);
        supportGroups.set(key, group);
      }
      const bySupport = [...supportGroups.values()]
        .map((supportLogs) => {
          const usedLogs = supportLogs.filter((log) => log.used);
          const effectiveness = usedLogs
            .map((log) => log.effectivenessRating)
            .filter((rating): rating is number => rating !== null);
          const fidelity = usedLogs
            .map((log) => log.implementationFidelity)
            .filter((rating): rating is number => rating !== null);
          const mean = (values: number[]) =>
            values.length
              ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
              : null;
          return {
            accommodationName: supportLogs[0].accommodationName,
            setting: supportLogs[0].setting,
            logCount: supportLogs.length,
            usedCount: usedLogs.length,
            usageRatePct: Math.round((usedLogs.length / supportLogs.length) * 100),
            effectivenessN: effectiveness.length,
            avgEffectiveness: mean(effectiveness),
            fidelityN: fidelity.length,
            avgFidelity: mean(fidelity),
            contextLinkedCount: supportLogs.filter(
              (log) => log.sessionId !== null || log.goalId !== null || log.activity !== null
            ).length,
          };
        })
        .sort((a, b) =>
          a.accommodationName.localeCompare(b.accommodationName) ||
          (a.setting ?? "").localeCompare(b.setting ?? "")
        );

      return {
        student,
        goals: studentGoals,
        accommodations: {
          logs,
          usageRatePct: logs.length > 0 ? Math.round((usedCount / logs.length) * 100) : null,
          avgEffectiveness:
            ratings.length > 0
              ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) /
                10
                : null,
          bySupport,
        },
      };
    }),
  };
}
