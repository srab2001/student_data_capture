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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { MeasurementPlan } from "@/lib/measurement-plans";
import type { EntryPreferences } from "@/lib/entry-workflow";

// See docs/compliance.md — this file is the source of truth for what data
// this app stores. Do not add a field here without updating that document
// first.

export const staffRoleEnum = pgEnum("staff_role", ["teacher", "aide"]);

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
  "weekly",
  "biweekly",
  "monthly",
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
  // Teacher: the classroom they own. Aide: the same classroom as their
  // assigned teacher. Null only until a staff member is assigned.
  classroomId: uuid("classroom_id").references(() => classrooms.id),
  // Small, non-instructional UI preference object. The currently focused
  // student is deliberately not persisted.
  entryPreferences: jsonb("entry_preferences").$type<EntryPreferences>(),
  ...timestamps,
});

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
    // Versioned, structured directions for collecting defensible evidence.
    // Nullable only so pre-Phase-2 goals can be upgraded deliberately rather
    // than receiving fabricated baselines or mastery criteria in a migration.
    measurementPlan: jsonb("measurement_plan").$type<MeasurementPlan>(),
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
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("data_points_client_request_id_unique").on(table.clientRequestId),
    index("data_points_goal_session_entry_at_idx").on(
      table.goalId,
      table.sessionId,
      table.entryAt
    ),
  ]
);

export const accommodationLogs = pgTable("accommodation_logs", {
  ...identity,
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id),
  accommodationName: text("accommodation_name").notNull(),
  used: boolean("used").notNull(),
  // Rendered with the same icon-degree component as icon_scale goals,
  // not a separate control (Phase 3).
  effectivenessRating: smallint("effectiveness_rating"),
  entryAt: timestamp("entry_at", { withTimezone: true }).notNull().defaultNow(),
  enteredByStaffId: uuid("entered_by_staff_id")
    .notNull()
    .references(() => staff.id),
  ...timestamps,
});

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
