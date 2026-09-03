import type { DataPoint, Goal } from "@/lib/db/types";
import type { observationEntryKindValues } from "@/lib/validation";
import type { MeasurementPlan } from "@/lib/measurement-plans";

export type ObservationEntryKind = (typeof observationEntryKindValues)[number];

export type ObservationValues = Pick<
  DataPoint,
  | "entryKind"
  | "entryAt"
  | "createdAt"
  | "valueNumeric"
  | "valueEnum"
  | "trialsTotal"
  | "trialsCorrect"
  | "note"
>;

export type AggregatedObservation = {
  valueNumeric: number | null;
  valueEnum: string | null;
  trialsTotal: number;
  trialsCorrect: number;
  note: string | null;
  observationCount: number;
};

const COMPATIBLE_KINDS: Record<Goal["metricType"], ObservationEntryKind[]> = {
  accuracy_pct: ["legacy_snapshot", "correct_trial", "incorrect_trial", "note"],
  fluency_rate: ["legacy_snapshot", "numeric", "note"],
  frequency_count: ["legacy_snapshot", "tally", "observation_complete", "note"],
  duration_seconds: ["legacy_snapshot", "duration", "observation_complete", "note"],
  prompt_level: ["legacy_snapshot", "rating", "note"],
  task_analysis_step: ["legacy_snapshot", "task_step", "note"],
  icon_scale: ["legacy_snapshot", "rating", "note"],
  accommodation_used: ["legacy_snapshot", "accommodation", "note"],
};

export function isObservationCompatible(
  metricType: Goal["metricType"],
  entryKind: ObservationEntryKind
): boolean {
  return COMPATIBLE_KINDS[metricType].includes(entryKind);
}

function eventTime(event: ObservationValues): number {
  const value = event.entryAt ?? event.createdAt;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Derive the value shown for one goal/session from immutable events. Legacy
 * snapshots are folded in first so existing pilot data remains readable.
 */
export function aggregateObservationEvents(
  metricType: Goal["metricType"],
  events: ObservationValues[]
): AggregatedObservation {
  const aggregate: AggregatedObservation = {
    valueNumeric: null,
    valueEnum: null,
    trialsTotal: 0,
    trialsCorrect: 0,
    note: null,
    observationCount: 0,
  };

  const sorted = [...events].sort((a, b) => eventTime(a) - eventTime(b));

  for (const event of sorted) {
    if (!isObservationCompatible(metricType, event.entryKind)) continue;

    if (event.entryKind !== "note") aggregate.observationCount += 1;

    switch (event.entryKind) {
      case "legacy_snapshot":
        if (metricType === "accuracy_pct") {
          aggregate.trialsTotal += event.trialsTotal ?? 0;
          aggregate.trialsCorrect += event.trialsCorrect ?? 0;
        } else if (
          metricType === "frequency_count" ||
          metricType === "duration_seconds"
        ) {
          aggregate.valueNumeric =
            (aggregate.valueNumeric ?? 0) + (event.valueNumeric ?? 0);
        } else if (event.valueNumeric != null) {
          aggregate.valueNumeric = event.valueNumeric;
        }
        if (event.valueEnum != null) aggregate.valueEnum = event.valueEnum;
        if (event.note != null) aggregate.note = event.note;
        break;
      case "correct_trial":
        aggregate.trialsTotal += 1;
        aggregate.trialsCorrect += 1;
        break;
      case "incorrect_trial":
        aggregate.trialsTotal += 1;
        break;
      case "tally":
      case "duration":
        aggregate.valueNumeric =
          (aggregate.valueNumeric ?? 0) + (event.valueNumeric ?? 0);
        break;
      case "numeric":
      case "task_step":
        aggregate.valueNumeric = event.valueNumeric;
        break;
      case "rating":
      case "accommodation":
        aggregate.valueEnum = event.valueEnum;
        break;
      case "observation_complete":
        if (
          (metricType === "frequency_count" || metricType === "duration_seconds") &&
          aggregate.valueNumeric === null
        ) {
          aggregate.valueNumeric = 0;
        }
        break;
      case "note":
        aggregate.note = event.note;
        break;
    }
  }

  return aggregate;
}

/**
 * Count complete measurement samples, which is intentionally different from
 * counting raw taps. Accuracy trials are grouped into configured opportunity
 * sets; frequency requires an explicit completed observation window so zero
 * occurrences remain valid evidence.
 */
export function evidenceUnitCount(
  metricType: Goal["metricType"],
  events: ObservationValues[],
  plan: MeasurementPlan
): number {
  const compatible = events.filter((event) =>
    isObservationCompatible(metricType, event.entryKind)
  );

  if (metricType === "accuracy_pct") {
    const trials = compatible.reduce((count, event) => {
      if (event.entryKind === "correct_trial" || event.entryKind === "incorrect_trial") {
        return count + 1;
      }
      if (event.entryKind === "legacy_snapshot") return count + (event.trialsTotal ?? 0);
      return count;
    }, 0);
    return Math.floor(trials / (plan.opportunitiesRequired ?? 1));
  }

  if (metricType === "frequency_count") {
    return compatible.filter(
      (event) =>
        event.entryKind === "observation_complete" || event.entryKind === "legacy_snapshot"
    ).length;
  }

  if (metricType === "duration_seconds") {
    return compatible.filter(
      (event) =>
        event.entryKind === "duration" ||
        event.entryKind === "observation_complete" ||
        event.entryKind === "legacy_snapshot"
    ).length;
  }

  return compatible.filter(
    (event) => event.entryKind !== "note" && event.entryKind !== "observation_complete"
  ).length;
}

/** Format a calendar date in the device's local timezone, not UTC. */
export function localDateIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar date for the pilot district when no browser date is available. */
export function schoolDateIso(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
