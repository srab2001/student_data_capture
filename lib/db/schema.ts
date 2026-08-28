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
} from "drizzle-orm/pg-core";

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

export const goals = pgTable("goals", {
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
  targetFrequency: targetFrequencyEnum("target_frequency").notNull(),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  ...identity,
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id),
  sessionDate: date("session_date").notNull(),
  periodLabel: text("period_label").notNull(),
  ...timestamps,
});

export const dataPoints = pgTable("data_points", {
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
  valueNumeric: integer("value_numeric"),
  // Prompt-level readings, task-analysis step labels, and icon_scale
  // readings (e.g. "3_of_5") all live here rather than in separate
  // columns per metric type.
  valueEnum: text("value_enum"),
  trialsTotal: integer("trials_total"),
  trialsCorrect: integer("trials_correct"),
  note: text("note"),
  ...timestamps,
});

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
