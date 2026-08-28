import { z } from "zod";

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

export const createGoalSchema = z
  .object({
    studentId: z.uuid(),
    domain: z.enum(goalDomainValues),
    goalText: z.string().trim().min(1).max(500),
    metricType: z.enum(metricTypeValues),
    iconSet: z.enum(iconSetValues).optional(),
    targetFrequency: z.enum(targetFrequencyValues),
  })
  .strict()
  .refine((v) => (v.metricType === "icon_scale" ? !!v.iconSet : true), {
    message: "iconSet is required when metricType is icon_scale",
    path: ["iconSet"],
  });

export const updateGoalSchema = z
  .object({
    domain: z.enum(goalDomainValues).optional(),
    goalText: z.string().trim().min(1).max(500).optional(),
    metricType: z.enum(metricTypeValues).optional(),
    iconSet: z.enum(iconSetValues).nullable().optional(),
    targetFrequency: z.enum(targetFrequencyValues).optional(),
  })
  .strict();

export const createDataPointSchema = z
  .object({
    goalId: z.uuid(),
    sessionId: z.uuid(),
    valueNumeric: z.number().int().optional(),
    valueEnum: z.string().trim().min(1).max(100).optional(),
    trialsTotal: z.number().int().nonnegative().optional(),
    trialsCorrect: z.number().int().nonnegative().optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.trialsCorrect === undefined ||
      v.trialsTotal === undefined ||
      v.trialsCorrect <= v.trialsTotal,
    { message: "trialsCorrect cannot exceed trialsTotal", path: ["trialsCorrect"] }
  );

export const updateDataPointSchema = z
  .object({
    valueNumeric: z.number().int().optional(),
    valueEnum: z.string().trim().min(1).max(100).optional(),
    trialsTotal: z.number().int().nonnegative().optional(),
    trialsCorrect: z.number().int().nonnegative().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const createAccommodationLogSchema = z
  .object({
    studentId: z.uuid(),
    accommodationName: z.string().trim().min(1).max(200),
    used: z.boolean(),
    effectivenessRating: z.number().int().min(1).max(5).optional(),
  })
  .strict();

export const updateAccommodationLogSchema = z
  .object({
    accommodationName: z.string().trim().min(1).max(200).optional(),
    used: z.boolean().optional(),
    effectivenessRating: z.number().int().min(1).max(5).nullable().optional(),
  })
  .strict();
