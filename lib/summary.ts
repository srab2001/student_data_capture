import { and, eq, gte, lte, isNull, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  students,
  goals,
  dataPoints,
  sessions,
  accommodationLogs,
} from "@/lib/db/schema";
import type { Student, Goal, DataPoint, AccommodationLog } from "@/lib/db/types";
import { aggregateObservationEvents } from "@/lib/observations";

export type GoalSummary = {
  goal: Goal;
  dataPoints: (DataPoint & { sessionDate: string })[];
  currentValueLabel: string;
  trendLabel: string;
};

export type StudentSummary = {
  student: Student;
  goals: GoalSummary[];
  accommodations: {
    logs: AccommodationLog[];
    usageRatePct: number | null;
    avgEffectiveness: number | null;
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
  rows: (DataPoint & { sessionDate: string })[]
): GoalSummary {
  const bySession = new Map<string, (DataPoint & { sessionDate: string })[]>();
  for (const row of rows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  const sorted = [...bySession.values()]
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
        note: aggregate.note,
      };
    })
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  const latest = sorted.at(-1);
  const first = sorted[0];

  let currentValueLabel = "No data yet";
  let trendLabel = "—";

  switch (goal.metricType) {
    case "accuracy_pct": {
      if (latest?.trialsTotal) {
        const pct = Math.round(((latest.trialsCorrect ?? 0) / latest.trialsTotal) * 100);
        currentValueLabel = `${pct}% (${latest.trialsCorrect}/${latest.trialsTotal})`;
        if (first && first.trialsTotal) {
          const firstPct = Math.round(((first.trialsCorrect ?? 0) / first.trialsTotal) * 100);
          trendLabel = pct > firstPct ? `▲ +${pct - firstPct}pt` : pct < firstPct ? `▼ ${pct - firstPct}pt` : "flat";
        }
      }
      break;
    }
    case "fluency_rate":
    case "duration_seconds":
    case "frequency_count":
    case "task_analysis_step": {
      if (latest?.valueNumeric != null) {
        currentValueLabel = String(latest.valueNumeric);
        if (first?.valueNumeric != null) {
          const delta = latest.valueNumeric - first.valueNumeric;
          trendLabel = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "flat";
        }
      }
      break;
    }
    case "icon_scale":
    case "prompt_level":
    case "accommodation_used": {
      if (latest?.valueEnum) {
        currentValueLabel = formatIconReading(latest.valueEnum);
      }
      break;
    }
  }

  return { goal, dataPoints: sorted, currentValueLabel, trendLabel };
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

  const studentSummaries: StudentSummary[] = [];

  for (const student of studentRows) {
    const goalRows = await db
      .select()
      .from(goals)
      .where(eq(goals.studentId, student.id));

    const goalSummaries: GoalSummary[] = [];
    for (const goal of goalRows) {
      const rows = await db
        .select({ dataPoint: dataPoints, sessionDate: sessions.sessionDate })
        .from(dataPoints)
        .innerJoin(sessions, eq(dataPoints.sessionId, sessions.id))
        .where(
          and(
            eq(dataPoints.goalId, goal.id),
            isNull(dataPoints.deletedAt),
            gte(sessions.sessionDate, opts.from),
            lte(sessions.sessionDate, opts.to)
          )
        )
        .orderBy(asc(sessions.sessionDate));

      const observations = rows.map((r) => ({
        ...r.dataPoint,
        sessionDate: r.sessionDate,
      }));
      if (goal.deletedAt && observations.length === 0) continue;
      goalSummaries.push(summarizeGoal(goal, observations));
    }

    const accommodationRows = await db
      .select()
      .from(accommodationLogs)
      .where(
        and(
          eq(accommodationLogs.studentId, student.id),
          isNull(accommodationLogs.deletedAt),
          gte(accommodationLogs.entryAt, new Date(opts.from)),
          lte(accommodationLogs.entryAt, new Date(`${opts.to}T23:59:59`))
        )
      );

    const usedCount = accommodationRows.filter((r) => r.used).length;
    const ratings = accommodationRows
      .map((r) => r.effectivenessRating)
      .filter((r): r is number => r != null);

    studentSummaries.push({
      student,
      goals: goalSummaries,
      accommodations: {
        logs: accommodationRows,
        usageRatePct:
          accommodationRows.length > 0
            ? Math.round((usedCount / accommodationRows.length) * 100)
            : null,
        avgEffectiveness:
          ratings.length > 0
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : null,
      },
    });
  }

  return {
    rangeFrom: opts.from,
    rangeTo: opts.to,
    generatedAt: new Date().toISOString(),
    students: studentSummaries,
  };
}
