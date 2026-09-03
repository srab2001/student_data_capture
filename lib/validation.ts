import { z } from "zod";
import { collectionDayValues } from "@/lib/measurement-plans";
import { entryLayoutValues, workflowModeValues } from "@/lib/entry-workflow";

/**
 * Field-level validation for every write to goals, data_points, and
 * accommodation_logs. Every schema is `.strict()`: an extra field is
 * rejected rather than silently accepted, so the approved data list in
 * docs/compliance.md stays the actual ceiling on what this app stores,
 * not just documentation of it.
 */

export const goalDomainValues = [
  "academic",
  "behavioral",
  "independence",
  "accommodation",
] as const;

export const metricTypeValues = [
  "accuracy_pct",
  "fluency_rate",
  "frequency_count",
  "duration_seconds",
  "prompt_level",
  "task_analysis_step",
  "icon_scale",
  "accommodation_used",
] as const;

export const iconSetValues = ["smiley_5", "stars_5", "thumbs_3", "zones_4"] as const;

export const targetFrequencyValues = ["daily", "weekly", "biweekly", "monthly"] as const;

export const promptLevelValues = [
  "full_physical",
  "partial_physical",
  "gestural",
  "verbal",
  "independent",
] as const;

export const observationEntryKindValues = [
  "legacy_snapshot",
  "correct_trial",
  "incorrect_trial",
  "tally",
  "duration",
  "rating",
  "numeric",
  "task_step",
  "accommodation",
  "observation_complete",
  "note",
] as const;

const taskAnalysisStepsSchema = z
  .array(z.string().trim().min(1).max(100))
  .min(1)
  .max(20)
  .refine((steps) => new Set(steps).size === steps.length, {
    message: "Task-analysis step labels must be unique.",
  });

export const measurementPlanSchema = z
  .object({
    baseline: z.string().trim().min(1).max(300),
    observableDefinition: z.string().trim().min(1).max(500),
    measurementMethod: z.string().trim().min(1).max(500),
    masteryCriterion: z.string().trim().min(1).max(300),
    collectionDays: z.array(z.enum(collectionDayValues)).min(1).max(7),
    observationsRequired: z.number().int().min(1).max(100),
    setting: z.string().trim().min(1).max(200),
    opportunitiesRequired: z.number().int().min(1).max(100).nullable(),
    observationWindowMinutes: z.number().int().min(1).max(480).nullable(),
    responsibleRole: z.enum(["teacher", "aide", "either"]),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().nullable(),
  })
  .strict()
  .refine((plan) => new Set(plan.collectionDays).size === plan.collectionDays.length, {
    message: "Collection days must be unique.",
    path: ["collectionDays"],
  })
  .refine(
    (plan) =>
      plan.opportunitiesRequired !== null || plan.observationWindowMinutes !== null,
    {
      message: "Enter either the number of opportunities or an observation window.",
      path: ["opportunitiesRequired"],
    }
  )
  .refine(
    (plan) => !plan.effectiveTo || plan.effectiveTo >= plan.effectiveFrom,
    {
      message: "The end date cannot be before the start date.",
      path: ["effectiveTo"],
    }
  );

export const createGoalSchema = z
  .object({
    studentId: z.uuid(),
    domain: z.enum(goalDomainValues),
    goalText: z.string().trim().min(1).max(500),
    metricType: z.enum(metricTypeValues),
    iconSet: z.enum(iconSetValues).optional(),
    taskAnalysisSteps: taskAnalysisStepsSchema.optional(),
    measurementPlan: measurementPlanSchema,
    targetFrequency: z.enum(targetFrequencyValues),
  })
  .strict()
  .refine((v) => (v.metricType === "icon_scale" ? !!v.iconSet : true), {
    message: "iconSet is required when metricType is icon_scale",
    path: ["iconSet"],
  })
  .refine(
    (v) => v.metricType !== "task_analysis_step" || !!v.taskAnalysisSteps?.length,
    {
      message: "At least one task-analysis step is required.",
      path: ["taskAnalysisSteps"],
    }
  );

export const updateGoalSchema = z
  .object({
    domain: z.enum(goalDomainValues).optional(),
    goalText: z.string().trim().min(1).max(500).optional(),
    metricType: z.enum(metricTypeValues).optional(),
    iconSet: z.enum(iconSetValues).nullable().optional(),
    taskAnalysisSteps: taskAnalysisStepsSchema.nullable().optional(),
    measurementPlan: measurementPlanSchema.optional(),
    targetFrequency: z.enum(targetFrequencyValues).optional(),
  })
  .strict();

export const createDataPointSchema = z
  .object({
    goalId: z.uuid(),
    sessionId: z.uuid(),
    entryKind: z.enum(observationEntryKindValues).exclude(["legacy_snapshot"]),
    clientRequestId: z.uuid(),
    entryAt: z.iso.datetime().transform((value) => new Date(value)),
    valueNumeric: z.number().int().optional(),
    valueEnum: z.string().trim().min(1).max(100).optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const numericKinds = ["tally", "duration", "numeric", "task_step"];
    const enumKinds = ["rating", "accommodation"];
    if (numericKinds.includes(value.entryKind) && value.valueNumeric === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "valueNumeric is required for this observation type.",
        path: ["valueNumeric"],
      });
    }
    if (value.entryKind === "tally" && value.valueNumeric !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "A tally event must have valueNumeric 1.",
        path: ["valueNumeric"],
      });
    }
    if (
      ["duration", "numeric"].includes(value.entryKind) &&
      value.valueNumeric !== undefined &&
      value.valueNumeric < 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "The numeric value cannot be negative.",
        path: ["valueNumeric"],
      });
    }
    if (
      value.entryKind === "task_step" &&
      value.valueNumeric !== undefined &&
      value.valueNumeric < 1
    ) {
      ctx.addIssue({
        code: "custom",
        message: "A task-analysis step must be at least 1.",
        path: ["valueNumeric"],
      });
    }
    if (enumKinds.includes(value.entryKind) && !value.valueEnum) {
      ctx.addIssue({
        code: "custom",
        message: "valueEnum is required for this observation type.",
        path: ["valueEnum"],
      });
    }
    if (value.entryKind === "note" && value.note === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "note is required for a note event.",
        path: ["note"],
      });
    }
    if (!numericKinds.includes(value.entryKind) && value.valueNumeric !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "valueNumeric is not allowed for this observation type.",
        path: ["valueNumeric"],
      });
    }
    if (!enumKinds.includes(value.entryKind) && value.valueEnum !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "valueEnum is not allowed for this observation type.",
        path: ["valueEnum"],
      });
    }
    if (value.entryKind !== "note" && value.note !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "note is only allowed for a note event.",
        path: ["note"],
      });
    }
  });

export const updateDataPointSchema = z
  .object({
    valueNumeric: z.number().int().optional(),
    valueEnum: z.string().trim().min(1).max(100).optional(),
    trialsTotal: z.number().int().nonnegative().optional(),
    trialsCorrect: z.number().int().nonnegative().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const createStudentSchema = z
  .object({
    displayName: z.string().trim().min(1).max(200),
  })
  .strict();

export const updateStudentSchema = z
  .object({
    displayName: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export const createStudentAccommodationSchema = z
  .object({
    studentId: z.uuid(),
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export const updateStudentAccommodationSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export const createAccommodationLogSchema = z
  .object({
    studentId: z.uuid(),
    accommodationName: z.string().trim().min(1).max(200),
    used: z.boolean(),
    effectivenessRating: z.number().int().min(1).max(5).nullable().optional(),
  })
  .strict();

export const updateAccommodationLogSchema = z
  .object({
    accommodationName: z.string().trim().min(1).max(200).optional(),
    used: z.boolean().optional(),
    effectivenessRating: z.number().int().min(1).max(5).nullable().optional(),
  })
  .strict();

export const rosterGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    studentIds: z
      .array(z.uuid())
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Each student can appear only once in a group.",
      }),
  })
  .strict();

export const entryPreferencesSchema = z
  .object({
    layout: z.enum(entryLayoutValues),
    workflowMode: z.enum(workflowModeValues),
    selectedGroupId: z.uuid().nullable(),
  })
  .strict();
