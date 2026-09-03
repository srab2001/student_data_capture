import type { Goal } from "@/lib/db/types";
import type { MeasurementPlan } from "@/lib/measurement-plans";
import {
  evidenceUnitCount,
  type ObservationValues,
} from "@/lib/observations";

export const quantitativeMetricValues = [
  "accuracy_pct",
  "fluency_rate",
  "frequency_count",
  "duration_seconds",
  "latency_seconds",
  "rubric_score",
  "task_analysis_step",
] as const;

export type QuantitativeMetric = (typeof quantitativeMetricValues)[number];

export type ProgressTarget = {
  baselineValue: number;
  baselineDate: string;
  targetValue: number;
  targetDate: string;
  direction: "increase" | "decrease";
};

export type DatedObservation = ObservationValues & { sessionDate: string };

export type CollectionEvidence = {
  kind: "plan_incomplete" | "not_scheduled" | "complete" | "needs_attention";
  scheduledDays: number;
  completedDays: number;
  expectedEvidence: number | null;
  collectedEvidence: number;
  compliancePct: number | null;
  offScheduleEvidence: number;
  label: string;
};

export type TrendAnalysis = {
  kind: "insufficient" | "direction_not_configured" | "favorable" | "unfavorable" | "no_change";
  label: string;
  sampleCount: number;
  observationDays: number;
  dateFrom: string | null;
  dateTo: string | null;
  earlyAverage: number | null;
  recentAverage: number | null;
  change: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
};

export type DataSufficiency = {
  kind: "none" | "limited" | "descriptive";
  observationDays: number;
  label: string;
};

export type AimStatus = {
  kind: "not_configured" | "no_data" | "on_track" | "off_track";
  label: string;
  expectedValue: number | null;
};

const DAY_BY_INDEX = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function isQuantitativeMetric(
  metricType: Goal["metricType"] | string
): metricType is QuantitativeMetric {
  return quantitativeMetricValues.includes(metricType as QuantitativeMetric);
}

function isoDateAtNoon(dateIso: string): Date {
  return new Date(`${dateIso}T12:00:00Z`);
}

function addUtcDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function scheduledCollectionDates(
  plan: MeasurementPlan,
  from: string,
  to: string
): string[] {
  const first = from > plan.effectiveFrom ? from : plan.effectiveFrom;
  const last = plan.effectiveTo && plan.effectiveTo < to ? plan.effectiveTo : to;
  if (last < first) return [];

  const dates: string[] = [];
  for (let cursor = isoDateAtNoon(first); isoDate(cursor) <= last; cursor = addUtcDay(cursor)) {
    if (plan.collectionDays.includes(DAY_BY_INDEX[cursor.getUTCDay()])) {
      dates.push(isoDate(cursor));
    }
  }
  return dates;
}

export function collectionEvidenceForRange(
  metricType: Goal["metricType"],
  observations: DatedObservation[],
  plan: MeasurementPlan | null,
  from: string,
  to: string
): CollectionEvidence {
  const observationsByDate = new Map<string, DatedObservation[]>();
  for (const observation of observations) {
    const rows = observationsByDate.get(observation.sessionDate) ?? [];
    rows.push(observation);
    observationsByDate.set(observation.sessionDate, rows);
  }

  if (!plan) {
    return {
      kind: "plan_incomplete",
      scheduledDays: 0,
      completedDays: 0,
      expectedEvidence: null,
      collectedEvidence: observations.filter((row) => row.entryKind !== "note").length,
      compliancePct: null,
      offScheduleEvidence: 0,
      label: "Collection plan incomplete",
    };
  }

  const scheduledDates = scheduledCollectionDates(plan, from, to);
  if (scheduledDates.length === 0) {
    const offScheduleEvidence = [...observationsByDate.values()].reduce(
      (total, rows) => total + evidenceUnitCount(metricType, rows, plan),
      0
    );
    return {
      kind: "not_scheduled",
      scheduledDays: 0,
      completedDays: 0,
      expectedEvidence: 0,
      collectedEvidence: 0,
      compliancePct: null,
      offScheduleEvidence,
      label: `No scheduled collection days in this range${
        offScheduleEvidence > 0
          ? ` · ${offScheduleEvidence} optional/off-schedule`
          : ""
      }`,
    };
  }

  let completedDays = 0;
  let collectedEvidence = 0;
  for (const date of scheduledDates) {
    const count = evidenceUnitCount(metricType, observationsByDate.get(date) ?? [], plan);
    collectedEvidence += Math.min(count, plan.observationsRequired);
    if (count >= plan.observationsRequired) completedDays += 1;
  }

  const expectedEvidence = scheduledDates.length * plan.observationsRequired;
  const compliancePct = Math.round((collectedEvidence / expectedEvidence) * 100);
  const scheduledSet = new Set(scheduledDates);
  let offScheduleEvidence = 0;
  for (const [date, rows] of observationsByDate) {
    if (!scheduledSet.has(date)) {
      offScheduleEvidence += evidenceUnitCount(metricType, rows, plan);
    }
  }
  return {
    kind: compliancePct >= 100 ? "complete" : "needs_attention",
    scheduledDays: scheduledDates.length,
    completedDays,
    expectedEvidence,
    collectedEvidence,
    compliancePct,
    offScheduleEvidence,
    label: `${collectedEvidence}/${expectedEvidence} planned observations · ${compliancePct}%${
      offScheduleEvidence > 0 ? ` · ${offScheduleEvidence} optional/off-schedule` : ""
    }`,
  };
}

export function dataSufficiencyForRange(observations: DatedObservation[]): DataSufficiency {
  const dates = new Set(
    observations
      .filter((observation) => observation.entryKind !== "note")
      .map((observation) => observation.sessionDate)
  );
  if (dates.size === 0) {
    return { kind: "none", observationDays: 0, label: "No observation days" };
  }
  if (dates.size < 3) {
    return {
      kind: "limited",
      observationDays: dates.size,
      label: `${dates.size} observation ${dates.size === 1 ? "day" : "days"} · interpret cautiously`,
    };
  }
  return {
    kind: "descriptive",
    observationDays: dates.size,
    label: `${dates.size} observation days available for a descriptive trend`,
  };
}

export function numericValueForReading(
  metricType: Goal["metricType"],
  reading: {
    valueNumeric: number | null;
    trialsTotal: number | null;
    trialsCorrect: number | null;
    opportunitiesObserved?: number | null;
    observationDurationSeconds?: number | null;
  }
): number | null {
  if (metricType === "accuracy_pct") {
    if (!reading.trialsTotal) return null;
    return Math.round(((reading.trialsCorrect ?? 0) / reading.trialsTotal) * 1000) / 10;
  }
  if (metricType === "frequency_count" && reading.valueNumeric !== null) {
    if (reading.observationDurationSeconds) {
      return Math.round(
        ((reading.valueNumeric * 60) / reading.observationDurationSeconds) * 10
      ) / 10;
    }
    if (reading.opportunitiesObserved) {
      return Math.round(
        ((reading.valueNumeric * 100) / reading.opportunitiesObserved) * 10
      ) / 10;
    }
  }
  return isQuantitativeMetric(metricType) ? reading.valueNumeric : null;
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

export function trendAnalysisForRange(
  metricType: Goal["metricType"],
  observations: DatedObservation[],
  target: ProgressTarget | null
): TrendAnalysis {
  const values = observations
    .flatMap((observation) => {
      const value = numericValueForReading(metricType, observation);
      return value === null ? [] : [{ date: observation.sessionDate, value }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const days = new Set(values.map((item) => item.date)).size;
  const base = {
    sampleCount: values.length,
    observationDays: days,
    dateFrom: values[0]?.date ?? null,
    dateTo: values.at(-1)?.date ?? null,
  };
  if (values.length < 3) {
    return {
      kind: "insufficient",
      label: `${values.length} reading${values.length === 1 ? "" : "s"} · insufficient for a recent trend`,
      ...base,
      earlyAverage: null,
      recentAverage: null,
      change: null,
      rangeMin: values.length ? Math.min(...values.map((item) => item.value)) : null,
      rangeMax: values.length ? Math.max(...values.map((item) => item.value)) : null,
    };
  }

  const midpoint = Math.floor(values.length / 2);
  const early = values.slice(0, midpoint);
  const recent = values.slice(midpoint);
  const average = (items: typeof values) =>
    items.reduce((sum, item) => sum + item.value, 0) / items.length;
  const earlyAverage = rounded(average(early));
  const recentAverage = rounded(average(recent));
  const change = rounded(recentAverage - earlyAverage);
  const rangeMin = rounded(Math.min(...values.map((item) => item.value)));
  const rangeMax = rounded(Math.max(...values.map((item) => item.value)));
  const changeLabel = `${change > 0 ? "+" : ""}${change}`;
  if (change === 0) {
    return {
      kind: "no_change",
      label: `No recent-window change · n=${values.length} · range ${rangeMin}–${rangeMax}`,
      ...base,
      earlyAverage,
      recentAverage,
      change,
      rangeMin,
      rangeMax,
    };
  }
  if (!target) {
    return {
      kind: "direction_not_configured",
      label: `Change ${changeLabel} · direction not configured · n=${values.length} · range ${rangeMin}–${rangeMax}`,
      ...base,
      earlyAverage,
      recentAverage,
      change,
      rangeMin,
      rangeMax,
    };
  }
  const favorable = target.direction === "increase" ? change > 0 : change < 0;
  return {
    kind: favorable ? "favorable" : "unfavorable",
    label: `${favorable ? "Favorable" : "Needs review"} ${changeLabel} · n=${values.length} · range ${rangeMin}–${rangeMax}`,
    ...base,
    earlyAverage,
    recentAverage,
    change,
    rangeMin,
    rangeMax,
  };
}

export function aimValueOnDate(target: ProgressTarget, dateIso: string): number {
  if (dateIso <= target.baselineDate) return target.baselineValue;
  if (dateIso >= target.targetDate) return target.targetValue;
  const start = isoDateAtNoon(target.baselineDate).getTime();
  const end = isoDateAtNoon(target.targetDate).getTime();
  const current = isoDateAtNoon(dateIso).getTime();
  const progress = (current - start) / (end - start);
  return target.baselineValue + (target.targetValue - target.baselineValue) * progress;
}

export function aimStatusForLatest(
  target: ProgressTarget | null,
  latest: { sessionDate: string; value: number } | null
): AimStatus {
  if (!target) {
    return { kind: "not_configured", label: "Aim line not configured", expectedValue: null };
  }
  if (!latest) {
    return { kind: "no_data", label: "No numeric reading to compare", expectedValue: null };
  }

  const expectedValue = aimValueOnDate(target, latest.sessionDate);
  const onTrack =
    target.direction === "increase"
      ? latest.value >= expectedValue
      : latest.value <= expectedValue;
  const relation = target.direction === "increase" ? "at or above" : "at or below";
  return {
    kind: onTrack ? "on_track" : "off_track",
    label: onTrack
      ? `Latest reading is ${relation} the aim line`
      : `Latest reading is not yet ${relation} the aim line`,
    expectedValue: Math.round(expectedValue * 10) / 10,
  };
}
