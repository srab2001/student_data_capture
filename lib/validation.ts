import { z } from "zod";
import { collectionDayValues } from "@/lib/measurement-plans";
import { entryLayoutValues, workflowModeValues } from "@/lib/entry-workflow";
import { isQuantitativeMetric } from "@/lib/progress-monitoring";

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
  "latency_seconds",
  "rubric_score",
  "abc_observation",
  "prompt_level",
  "task_analysis_step",
  "icon_scale",
  "accommodation_used",
] as const;

export const iconSetValues = ["smiley_5", "stars_5", "thumbs_3", "zones_4"] as const;

export const targetFrequencyValues = [
  "session_based",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
] as const;

export const promptLevelValues = [
  "full_physical",
  "partial_physical",
  "gestural",
  "verbal",
  "independent",
] as const;

export const staffRoleValues = ["teacher", "aide", "admin"] as const;

export const staffPermissionSchema = z
  .object({
    canManageUsers: z.boolean(),
    canManageStudents: z.boolean(),
    canManageGoals: z.boolean(),
    canManageColors: z.boolean(),
    canRecordData: z.boolean(),
    canViewReports: z.boolean(),
  })
  .strict();

export const createStaffSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    role: z.enum(staffRoleValues),
    accessEnabled: z.boolean(),
    permissions: staffPermissionSchema,
  })
  .strict();

export const updateStaffSchema = createStaffSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one user field must be changed." }
);

export const classroomColorSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    hexValue: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit color such as #2563EB.")
      .transform((value) => value.toUpperCase()),
    hoverComment: z.string().trim().min(1).max(240),
    sortOrder: z.number().int().min(0).max(1000),
  })
  .strict();

export const updateClassroomColorSchema = classroomColorSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one color field must be changed.",
  });

export const observationEntryKindValues = [
  "legacy_snapshot",
  "correct_trial",
  "incorrect_trial",
  "tally",
  "duration",
  "rating",
  "numeric",
  "rubric_score",
  "abc_observation",
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

const promptHierarchySchema = z
  .array(z.string().trim().min(1).max(100))
  .min(2)
  .max(12)
  .refine((levels) => new Set(levels).size === levels.length, {
    message: "Prompt hierarchy labels must be unique.",
  });

const rubricConfigSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    maxScore: z.number().int().min(1).max(1000),
    criteria: z
      .array(z.string().trim().min(1).max(160))
      .min(1)
      .max(20)
      .refine((criteria) => new Set(criteria).size === criteria.length, {
        message: "Rubric criteria must be unique.",
      }),
  })
  .strict();

const observationDetailsSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("rubric"),
      workSample: z.string().trim().min(1).max(200),
      criterion: z.string().trim().min(1).max(160).nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("abc"),
      antecedent: z.string().trim().min(1).max(1000),
      behavior: z.string().trim().min(1).max(1000),
      consequence: z.string().trim().min(1).max(1000),
    })
    .strict(),
]);

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

export const progressTargetSchema = z
  .object({
    baselineValue: z.number().finite().min(0).max(1_000_000),
    baselineDate: z.iso.date(),
    targetValue: z.number().finite().min(0).max(1_000_000),
    targetDate: z.iso.date(),
    direction: z.enum(["increase", "decrease"]),
  })
  .strict()
  .refine((target) => target.targetDate > target.baselineDate, {
    message: "The target date must be after the baseline date.",
    path: ["targetDate"],
  })
  .refine(
    (target) =>
      target.direction === "increase"
        ? target.targetValue > target.baselineValue
        : target.targetValue < target.baselineValue,
    {
      message: "Target and baseline values must match the selected direction.",
      path: ["targetValue"],
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
    promptHierarchy: promptHierarchySchema.optional(),
    rubricConfig: rubricConfigSchema.optional(),
    measurementPlan: measurementPlanSchema,
    progressTarget: progressTargetSchema.nullable().optional(),
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
  )
  .refine(
    (v) => v.metricType !== "prompt_level" || !!v.promptHierarchy?.length,
    {
      message: "At least two prompt hierarchy levels are required.",
      path: ["promptHierarchy"],
    }
  )
  .refine((v) => v.metricType !== "rubric_score" || !!v.rubricConfig, {
    message: "Rubric configuration is required for rubric scoring.",
    path: ["rubricConfig"],
  })
  .refine(
    (v) => !v.progressTarget || isQuantitativeMetric(v.metricType),
    {
      message: "Aim lines are available only for quantitative goals.",
      path: ["progressTarget"],
    }
  )
  .refine(
    (v) =>
      v.metricType !== "accuracy_pct" ||
      !v.progressTarget ||
      (v.progressTarget.baselineValue <= 100 && v.progressTarget.targetValue <= 100),
    {
      message: "Accuracy aim-line values must be between 0 and 100.",
      path: ["progressTarget"],
    }
  );

export const updateGoalSchema = z
  .object({
    domain: z.enum(goalDomainValues).optional(),
    goalText: z.string().trim().min(1).max(500).optional(),
    metricType: z.enum(metricTypeValues).optional(),
    iconSet: z.enum(iconSetValues).nullable().optional(),
    taskAnalysisSteps: taskAnalysisStepsSchema.nullable().optional(),
    promptHierarchy: promptHierarchySchema.nullable().optional(),
    rubricConfig: rubricConfigSchema.nullable().optional(),
    measurementPlan: measurementPlanSchema.optional(),
    progressTarget: progressTargetSchema.nullable().optional(),
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
    opportunitiesObserved: z.number().int().min(1).max(10_000).optional(),
    observationDurationSeconds: z.number().int().min(1).max(86_400).optional(),
    note: z.string().trim().max(1000).nullable().optional(),
    observationDetails: observationDetailsSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const numericKinds = ["tally", "duration", "numeric", "task_step", "rubric_score"];
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
      ["duration", "numeric", "rubric_score"].includes(value.entryKind) &&
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
    if (
      (value.opportunitiesObserved !== undefined ||
        value.observationDurationSeconds !== undefined) &&
      value.entryKind !== "observation_complete"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Observation exposure belongs on the completed-window event.",
        path: ["observationDurationSeconds"],
      });
    }
    if (value.entryKind !== "note" && value.note !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "note is only allowed for a note event.",
        path: ["note"],
      });
    }
    if (value.entryKind === "rubric_score" && value.observationDetails?.kind !== "rubric") {
      ctx.addIssue({ code: "custom", message: "Rubric details are required.", path: ["observationDetails"] });
    }
    if (value.entryKind === "abc_observation" && value.observationDetails?.kind !== "abc") {
      ctx.addIssue({ code: "custom", message: "ABC details are required.", path: ["observationDetails"] });
    }
    if (
      !["rubric_score", "abc_observation"].includes(value.entryKind) &&
      value.observationDetails !== undefined
    ) {
      ctx.addIssue({ code: "custom", message: "Structured details are not allowed for this observation type.", path: ["observationDetails"] });
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

export const createSessionAbsenceSchema = z
  .object({
    sessionId: z.uuid(),
    studentId: z.uuid(),
  })
  .strict();

export const createAccommodationLogSchema = z
  .object({
    studentId: z.uuid(),
    sessionId: z.uuid().nullable().optional(),
    goalId: z.uuid().nullable().optional(),
    accommodationName: z.string().trim().min(1).max(200),
    used: z.boolean(),
    effectivenessRating: z.number().int().min(1).max(5).nullable().optional(),
    setting: z.string().trim().min(1).max(200).nullable().optional(),
    activity: z.string().trim().min(1).max(200).nullable().optional(),
    implementationFidelity: z.number().int().min(1).max(5).nullable().optional(),
    reasonNotUsed: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict()
  .refine((value) => value.used || value.effectivenessRating == null, {
    message: "Effectiveness can be rated only when the accommodation was used.",
    path: ["effectivenessRating"],
  })
  .refine((value) => value.used || value.implementationFidelity == null, {
    message: "Implementation fidelity can be rated only when the accommodation was used.",
    path: ["implementationFidelity"],
  });

export const studentAccommodationSchema = z
  .object({
    studentId: z.uuid(),
    name: z.string().trim().min(1).max(200),
    setting: z.string().trim().min(1).max(200),
    implementationNotes: z.string().trim().min(1).max(500),
  })
  .strict();

export const updateStudentAccommodationSchema = studentAccommodationSchema
  .omit({ studentId: true })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one accommodation field must be changed.",
  });

export const updateAccommodationLogSchema = z
  .object({
    accommodationName: z.string().trim().min(1).max(200).optional(),
    used: z.boolean().optional(),
    effectivenessRating: z.number().int().min(1).max(5).nullable().optional(),
    sessionId: z.uuid().nullable().optional(),
    goalId: z.uuid().nullable().optional(),
    setting: z.string().trim().min(1).max(200).nullable().optional(),
    activity: z.string().trim().min(1).max(200).nullable().optional(),
    implementationFidelity: z.number().int().min(1).max(5).nullable().optional(),
    reasonNotUsed: z.string().trim().min(1).max(500).nullable().optional(),
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

export const interventionAnnotationSchema = z
  .object({
    goalId: z.uuid(),
    interventionDate: z.iso.date(),
    description: z.string().trim().min(1).max(500),
  })
  .strict();

/**
 * AI-assisted feature request/response shapes (docs/compliance.md
 * "AI-assisted features"). These are validated on the way in (what a
 * teacher may ask for) and, just as importantly, on the way out (what an
 * AI response must look like before this app trusts it as a measurement
 * plan or accommodation) — see lib/ai/goal-wizard.ts and
 * lib/ai/accommodation-chat.ts.
 */

export const goalWizardRequestSchema = z
  .object({
    domain: z.enum(goalDomainValues),
    metricType: z.enum(metricTypeValues),
    skillDescription: z.string().trim().min(1).max(300),
    baselineSummary: z.string().trim().min(1).max(300).nullable().optional(),
  })
  .strict();

const accommodationChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(500),
  })
  .strict();

const ACCOMMODATION_CHAT_MAX_EXCHANGES = 5;

export const accommodationChatRequestSchema = z
  .object({
    studentId: z.uuid(),
    domain: z.enum(goalDomainValues),
    messages: z.array(accommodationChatMessageSchema).min(1).max(2 * ACCOMMODATION_CHAT_MAX_EXCHANGES - 1),
  })
  .strict()
  .refine((value) => value.messages[value.messages.length - 1].role === "user", {
    message: "The conversation must end with the teacher's own message.",
    path: ["messages"],
  })
  .refine(
    (value) =>
      value.messages.filter((message) => message.role === "user").length <=
      ACCOMMODATION_CHAT_MAX_EXCHANGES,
    {
      message: "This suggestion has reached its turn limit — start a new one.",
      path: ["messages"],
    }
  );

export const accommodationChatQuestionSchema = z
  .object({
    kind: z.literal("question"),
    question: z.string().trim().min(1).max(300),
  })
  .strict();

export const accommodationChatSuggestionSchema = z
  .object({
    kind: z.literal("suggestion"),
    name: z.string().trim().min(1).max(200),
    setting: z.string().trim().min(1).max(200),
    implementationNotes: z.string().trim().min(1).max(500),
    rationale: z.string().trim().min(1).max(500),
  })
  .strict();

export const summaryFilterSchema = z
  .object({
    studentId: z.uuid().optional(),
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .strict()
  .refine((value) => value.to >= value.from, {
    message: "The end date cannot be before the start date.",
    path: ["to"],
  })
  .refine(
    (value) =>
      new Date(`${value.to}T12:00:00Z`).getTime() -
        new Date(`${value.from}T12:00:00Z`).getTime() <=
      366 * 24 * 60 * 60 * 1000,
    {
      message: "The reporting range cannot exceed 366 days.",
      path: ["to"],
    }
  );
