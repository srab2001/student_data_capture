import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  smallint,
  index,
  uniqueIndex,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { MeasurementPlan } from "@/lib/measurement-plans";
import type { EntryPreferences } from "@/lib/entry-workflow";
import type { ProgressTarget } from "@/lib/progress-monitoring";
import type { ObservationDetails, RubricConfig } from "@/lib/student-data-plan";

// See docs/compliance.md — this file is the source of truth for what data
// this app stores. Do not add a field here without updating that document
// first.

export const staffRoleEnum = pgEnum("staff_role", ["teacher", "aide", "admin"]);

export const goalDomainEnum = pgEnum("goal_domain", [
  "academic",
  "behavioral",
  "independence",
  "accommodation",
]);

export const metricTypeEnum = pgEnum("metric_type", [
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
]);

export const iconSetEnum = pgEnum("icon_set", [
  "smiley_5",
  "stars_5",
  "thumbs_3",
  "zones_4",
]);

export const targetFrequencyEnum = pgEnum("target_frequency", [
  "daily",
  "session_based",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
]);

export const promptLevelEnum = pgEnum("prompt_level", [
  "full_physical",
  "partial_physical",
  "gestural",
  "verbal",
  "independent",
]);

// New data_points are immutable observation events. Existing aggregate rows
// are migrated as legacy_snapshot so historical synthetic data remains
// readable while every new tap can be preserved independently.
export const observationEntryKindEnum = pgEnum("observation_entry_kind", [
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
]);

const identity = {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
};

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

// One classroom per teacher, for this single-classroom pilot. Every
// staff-to-student authorization decision (Phase 2) is scoped through
// this table rather than a flat student list.
export const classrooms = pgTable("classrooms", {
  ...identity,
  name: text("name").notNull(),
  ...timestamps,
});

export const staff = pgTable("staff", {
  ...identity,
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: staffRoleEnum("role").notNull(),
  // Every role is scoped to one classroom in this pilot. Null only until a
  // staff member is assigned.
  classroomId: uuid("classroom_id").references(() => classrooms.id),
  // Admin-configurable, classroom-scoped access. Role labels provide useful
  // presets, but these explicit capabilities are the authorization source of
  // truth so a teacher or aide can receive only the access they need.
  accessEnabled: boolean("access_enabled").notNull().default(true),
  canManageUsers: boolean("can_manage_users").notNull().default(false),
  canManageStudents: boolean("can_manage_students").notNull().default(false),
  canManageGoals: boolean("can_manage_goals").notNull().default(false),
  canManageColors: boolean("can_manage_colors").notNull().default(false),
  canRecordData: boolean("can_record_data").notNull().default(true),
  canViewReports: boolean("can_view_reports").notNull().default(true),
  // Small, non-instructional UI preference object. The currently focused
  // student is deliberately not persisted.
  entryPreferences: jsonb("entry_preferences").$type<EntryPreferences>(),
  ...timestamps,
});

// Classroom-wide color meanings are a visual legend, not a replacement for
// text. Every swatch is rendered with its label and an explanation available
// on hover and keyboard focus.
export const classroomColors = pgTable(
  "classroom_colors",
  {
    ...identity,
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id),
    name: text("name").notNull(),
    hexValue: text("hex_value").notNull(),
    hoverComment: text("hover_comment").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdByStaffId: uuid("created_by_staff_id")
      .notNull()
      .references(() => staff.id),
    ...timestamps,
  },
  (table) => [
    index("classroom_colors_classroom_sort_idx").on(
      table.classroomId,
      table.sortOrder
    ),
  ]
);

export const students = pgTable("students", {
  ...identity,
  displayName: text("display_name").notNull(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id),
  // Synthetic-data guardrail (docs/compliance.md): every student-
  // identifiable row traces back to this flag. Never flip to false
  // outside a sign-off — see .githooks/pre-commit.
  isSynthetic: boolean("is_synthetic").notNull().default(true),
  ...timestamps,
});

export const rosterGroups = pgTable(
  "roster_groups",
  {
    ...identity,
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id),
    name: text("name").notNull(),
    createdByStaffId: uuid("created_by_staff_id")
      .notNull()
      .references(() => staff.id),
    ...timestamps,
  },
  (table) => [index("roster_groups_classroom_id_idx").on(table.classroomId)]
);

export const rosterGroupStudents = pgTable(
  "roster_group_students",
  {
    ...identity,
    groupId: uuid("group_id")
      .notNull()
      .references(() => rosterGroups.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("roster_group_students_group_id_idx").on(table.groupId),
    index("roster_group_students_student_id_idx").on(table.studentId),
  ]
);

export const goals = pgTable(
  "goals",
  {
    ...identity,
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    domain: goalDomainEnum("domain").notNull(),
    goalText: text("goal_text").notNull(),
    metricType: metricTypeEnum("metric_type").notNull(),
    // Only meaningful when metricType = 'icon_scale'. Decided once at goal
    // setup, not chosen per entry (see Phase 3 UI).
    iconSet: iconSetEnum("icon_set"),
    // Goal-specific labels replace the former hard-coded 1-5 task analysis.
    taskAnalysisSteps: jsonb("task_analysis_steps").$type<string[]>(),
    // Student-specific least-to-most or most-to-least assistance sequence.
    promptHierarchy: jsonb("prompt_hierarchy").$type<string[]>(),
    // Scoring frame for work samples; stored on the versioned goal so old
    // scores retain the rubric that was in effect when they were collected.
    rubricConfig: jsonb("rubric_config").$type<RubricConfig>(),
    // Versioned, structured directions for collecting defensible evidence.
    // Nullable only so pre-Phase-2 goals can be upgraded deliberately rather
    // than receiving fabricated baselines or mastery criteria in a migration.
    measurementPlan: jsonb("measurement_plan").$type<MeasurementPlan>(),
    // Optional because existing narrative criteria must never be parsed into
    // fabricated numeric targets. Quantitative goals can add this explicitly.
    progressTarget: jsonb("progress_target").$type<ProgressTarget>(),
    // A measurement-definition edit creates a new goal version and retires
    // the previous row instead of reinterpreting historical observations.
    supersedesGoalId: uuid("supersedes_goal_id").references(
      (): AnyPgColumn => goals.id
    ),
    targetFrequency: targetFrequencyEnum("target_frequency").notNull(),
    ...timestamps,
  },
  (table) => [index("goals_supersedes_goal_id_idx").on(table.supersedesGoalId)]
);

export const sessions = pgTable("sessions", {
  ...identity,
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id),
  sessionDate: date("session_date").notNull(),
  periodLabel: text("period_label").notNull(),
  ...timestamps,
});

// Marks one student absent for one classroom session, so "no data logged"
// (goal not addressed) and "student wasn't here" never look identical on
// the entry screen or in the progress summary. Distinct from data_points'
// own observation-window-completion markers, which record a confirmed
// zero for a present student, not their absence.
export const sessionAbsences = pgTable(
  "session_absences",
  {
    ...identity,
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    enteredByStaffId: uuid("entered_by_staff_id")
      .notNull()
      .references(() => staff.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("session_absences_session_student_unique").on(
      table.sessionId,
      table.studentId
    ),
    index("session_absences_student_id_idx").on(table.studentId),
  ]
);

export const dataPoints = pgTable(
  "data_points",
  {
    ...identity,
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    enteredByStaffId: uuid("entered_by_staff_id")
      .notNull()
      .references(() => staff.id),
    entryAt: timestamp("entry_at", { withTimezone: true }).notNull().defaultNow(),
    entryKind: observationEntryKindEnum("entry_kind")
      .notNull()
      .default("legacy_snapshot"),
    // Generated on the Chromebook before a write is queued. The unique
    // value makes offline retries idempotent.
    clientRequestId: uuid("client_request_id"),
    valueNumeric: integer("value_numeric"),
    // Prompt-level readings, task-analysis step labels, and icon_scale
    // readings (e.g. "3_of_5") all live here rather than in separate
    // columns per metric type.
    valueEnum: text("value_enum"),
    trialsTotal: integer("trials_total"),
    trialsCorrect: integer("trials_correct"),
    // Actual exposure for this observation. These values live on the event,
    // not only in the plan, so rates remain comparable when a lesson ends
    // early or offers a different number of opportunities.
    opportunitiesObserved: integer("opportunities_observed"),
    observationDurationSeconds: integer("observation_duration_seconds"),
    note: text("note"),
    // Structured details used only for rubric and ABC events. A discriminated
    // union prevents narrative fields from being confused across event types.
    observationDetails: jsonb("observation_details").$type<ObservationDetails>(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("data_points_client_request_id_unique").on(table.clientRequestId),
    index("data_points_goal_session_entry_at_idx").on(
      table.goalId,
      table.sessionId,
      table.entryAt
    ),
    check(
      "data_points_opportunities_positive",
      sql`${table.opportunitiesObserved} IS NULL OR ${table.opportunitiesObserved} > 0`
    ),
    check(
      "data_points_observation_duration_positive",
      sql`${table.observationDurationSeconds} IS NULL OR ${table.observationDurationSeconds} > 0`
    ),
  ]
);

export const studentAccommodations = pgTable(
  "student_accommodations",
  {
    ...identity,
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id),
    name: text("name").notNull(),
    // Nullable only for supports created before the setting and directions
    // fields existed. Admin reconciliation completes these legacy rows before
    // they appear in the entry picker; new API writes require both fields.
    setting: text("setting"),
    implementationNotes: text("implementation_notes"),
    createdByStaffId: uuid("created_by_staff_id")
      .references(() => staff.id),
    ...timestamps,
  },
  (table) => [index("student_accommodations_student_id_idx").on(table.studentId)]
);

export const accommodationLogs = pgTable("accommodation_logs", {
  ...identity,
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  sessionId: uuid("session_id").references(() => sessions.id),
  goalId: uuid("goal_id").references(() => goals.id),
  accommodationName: text("accommodation_name").notNull(),
  used: boolean("used").notNull(),
  // Rendered with the same icon-degree component as icon_scale goals,
  // not a separate control (Phase 3).
  effectivenessRating: smallint("effectiveness_rating"),
  setting: text("setting"),
  activity: text("activity"),
  implementationFidelity: smallint("implementation_fidelity"),
  reasonNotUsed: text("reason_not_used"),
  entryAt: timestamp("entry_at", { withTimezone: true }).notNull().defaultNow(),
  enteredByStaffId: uuid("entered_by_staff_id")
    .notNull()
    .references(() => staff.id),
  ...timestamps,
}, (table) => [
  index("accommodation_logs_student_entry_idx").on(table.studentId, table.entryAt),
  index("accommodation_logs_session_id_idx").on(table.sessionId),
  index("accommodation_logs_goal_id_idx").on(table.goalId),
  check(
    "accommodation_logs_effectiveness_range",
    sql`${table.effectivenessRating} IS NULL OR ${table.effectivenessRating} BETWEEN 1 AND 5`
  ),
  check(
    "accommodation_logs_fidelity_range",
    sql`${table.implementationFidelity} IS NULL OR ${table.implementationFidelity} BETWEEN 1 AND 5`
  ),
]);

export const interventionAnnotations = pgTable(
  "intervention_annotations",
  {
    ...identity,
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id),
    interventionDate: date("intervention_date").notNull(),
    description: text("description").notNull(),
    createdByStaffId: uuid("created_by_staff_id")
      .notNull()
      .references(() => staff.id),
    ...timestamps,
  },
  (table) => [
    index("intervention_annotations_goal_date_idx").on(
      table.goalId,
      table.interventionDate
    ),
  ]
);

// Append-only. A `no_delete` trigger (see migration) blocks DELETE at the
// database level so no application role — including a future admin role
// — can remove an entry, not just the current authorization helper.
export const auditLog = pgTable("audit_log", {
  ...identity,
  actorStaffId: uuid("actor_staff_id").references(() => staff.id),
  action: text("action").notNull(),
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  diff: jsonb("diff"),
});
