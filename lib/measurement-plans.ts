export const collectionDayValues = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type CollectionDay = (typeof collectionDayValues)[number];
export type CollectorRole = "teacher" | "aide" | "either";

/**
 * The complete procedure for measuring one version of a goal. The plan lives
 * on the goal row so a replacement goal automatically preserves the plan that
 * was in effect for every historical observation.
 */
export type MeasurementPlan = {
  baseline: string;
  observableDefinition: string;
  measurementMethod: string;
  masteryCriterion: string;
  collectionDays: CollectionDay[];
  observationsRequired: number;
  setting: string;
  opportunitiesRequired: number | null;
  observationWindowMinutes: number | null;
  responsibleRole: CollectorRole;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type MeasurementPlanStatus = {
  kind: "incomplete" | "not_due" | "due" | "complete";
  isDue: boolean;
  isComplete: boolean;
  label: string;
};

const DAY_BY_INDEX: CollectionDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const COLLECTION_DAY_LABEL: Record<CollectionDay, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function weekdayForDate(dateIso: string): CollectionDay {
  // Noon avoids a date shift at daylight-saving boundaries.
  return DAY_BY_INDEX[new Date(`${dateIso}T12:00:00`).getDay()];
}

export function measurementPlanStatus(
  plan: MeasurementPlan | null,
  {
    dateIso,
    staffRole,
    observationCount,
  }: {
    dateIso: string;
    staffRole: "teacher" | "aide";
    observationCount: number;
  }
): MeasurementPlanStatus {
  if (!plan) {
    return {
      kind: "incomplete",
      isDue: true,
      isComplete: observationCount > 0,
      label:
        observationCount > 0
          ? "Logged · measurement plan incomplete"
          : "Measurement plan incomplete",
    };
  }

  if (dateIso < plan.effectiveFrom) {
    return { kind: "not_due", isDue: false, isComplete: false, label: "Not active yet" };
  }
  if (plan.effectiveTo && dateIso > plan.effectiveTo) {
    return { kind: "not_due", isDue: false, isComplete: false, label: "Plan ended" };
  }
  if (plan.responsibleRole !== "either" && plan.responsibleRole !== staffRole) {
    return {
      kind: "not_due",
      isDue: false,
      isComplete: false,
      label: `Assigned to ${plan.responsibleRole}`,
    };
  }
  const weekday = weekdayForDate(dateIso);
  if (!plan.collectionDays.includes(weekday)) {
    return { kind: "not_due", isDue: false, isComplete: false, label: "Not scheduled today" };
  }

  const isComplete = observationCount >= plan.observationsRequired;
  return {
    kind: isComplete ? "complete" : "due",
    isDue: true,
    isComplete,
    label: isComplete
      ? `${observationCount}/${plan.observationsRequired} collected`
      : `${observationCount}/${plan.observationsRequired} observations due`,
  };
}
