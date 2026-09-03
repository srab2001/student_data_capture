/**
 * Generates a synthetic classroom for local development. Refuses to run
 * against anything that doesn't look like a Neon dev branch, and sets
 * is_synthetic = true on every student row it creates.
 *
 * Usage: npm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";
import type { MeasurementPlan } from "../lib/measurement-plans";
import type { ProgressTarget } from "../lib/progress-monitoring";

const FIRST_NAMES = [
  "Maya", "Deshawn", "Priya", "Owen", "Sofia", "Malik", "Ava", "Noah", "Ines", "Elijah",
];
const LAST_INITIALS = ["R", "K", "T", "L", "M", "B", "C", "D", "F", "G"];

const GOAL_LIBRARY: Array<{
  domain: (typeof schema.goalDomainEnum.enumValues)[number];
  goalText: string;
  metricType: (typeof schema.metricTypeEnum.enumValues)[number];
  iconSet?: (typeof schema.iconSetEnum.enumValues)[number];
  targetFrequency: (typeof schema.targetFrequencyEnum.enumValues)[number];
  progressTarget?: ProgressTarget;
  taskAnalysisSteps?: string[];
  promptHierarchy?: string[];
  rubricConfig?: { title: string; maxScore: number; criteria: string[] };
}> = [
  {
    domain: "academic",
    goalText: "Read grade-level passages with 90% accuracy",
    metricType: "accuracy_pct",
    targetFrequency: "weekly",
    progressTarget: { baselineValue: 60, baselineDate: "2026-01-01", targetValue: 90, targetDate: "2027-01-01", direction: "increase" },
  },
  {
    domain: "academic",
    goalText: "Increase oral reading fluency (correct words per minute)",
    metricType: "fluency_rate",
    targetFrequency: "weekly",
    progressTarget: { baselineValue: 20, baselineDate: "2026-01-01", targetValue: 60, targetDate: "2027-01-01", direction: "increase" },
  },
  {
    domain: "behavioral",
    goalText: "Reduce call-outs during independent work",
    metricType: "frequency_count",
    targetFrequency: "daily",
    progressTarget: { baselineValue: 8, baselineDate: "2026-01-01", targetValue: 2, targetDate: "2027-01-01", direction: "decrease" },
  },
  {
    domain: "behavioral",
    goalText: "Rate self-perceived on-task engagement each session",
    metricType: "icon_scale",
    iconSet: "smiley_5",
    targetFrequency: "daily",
  },
  {
    domain: "independence",
    goalText: "Complete multi-step morning routine with fading support",
    metricType: "prompt_level",
    targetFrequency: "daily",
  },
  {
    domain: "independence",
    goalText: "Complete a 5-step hygiene task analysis independently",
    metricType: "task_analysis_step",
    targetFrequency: "weekly",
    progressTarget: { baselineValue: 1, baselineDate: "2026-01-01", targetValue: 5, targetDate: "2027-01-01", direction: "increase" },
  },
  {
    domain: "behavioral",
    goalText: "Stay in regulated zone during transitions",
    metricType: "icon_scale",
    iconSet: "zones_4",
    targetFrequency: "daily",
  },
  {
    domain: "academic",
    goalText: "Sustain attention to task (duration in seconds)",
    metricType: "duration_seconds",
    targetFrequency: "daily",
    progressTarget: { baselineValue: 30, baselineDate: "2026-01-01", targetValue: 300, targetDate: "2027-01-01", direction: "increase" },
  },
  {
    domain: "behavioral",
    goalText: "Begin the assigned task within 30 seconds of the direction",
    metricType: "latency_seconds",
    targetFrequency: "daily",
    progressTarget: { baselineValue: 90, baselineDate: "2026-01-01", targetValue: 30, targetDate: "2027-01-01", direction: "decrease" },
  },
  {
    domain: "academic",
    goalText: "Write an organized paragraph using the classroom rubric",
    metricType: "rubric_score",
    targetFrequency: "weekly",
    rubricConfig: { title: "Paragraph rubric", maxScore: 4, criteria: ["Organization", "Evidence", "Conventions"] },
    progressTarget: { baselineValue: 1, baselineDate: "2026-01-01", targetValue: 4, targetDate: "2027-01-01", direction: "increase" },
  },
  {
    domain: "behavioral",
    goalText: "Document observable escalation episodes using ABC data",
    metricType: "abc_observation",
    targetFrequency: "session_based",
  },
  {
    domain: "accommodation",
    goalText: "Receive the assigned visual schedule during transitions",
    metricType: "accommodation_used",
    targetFrequency: "daily",
  },
];

const ACCOMMODATIONS = [
  "Extended time",
  "Preferential seating",
  "Visual schedule",
  "Noise-cancelling headphones",
  "Chunked assignments",
];

const METHOD_BY_METRIC: Record<
  (typeof schema.metricTypeEnum.enumValues)[number],
  string
> = {
  accuracy_pct: "Present 10 discrete opportunities and record each as correct or incorrect.",
  fluency_rate: "Complete one one-minute probe and enter the correct responses per minute.",
  frequency_count: "Tally each occurrence during the defined observation window.",
  duration_seconds: "Start the timer when the behavior begins and stop it when the behavior ends.",
  latency_seconds: "Start the timer at the prompt and stop it when the student begins the response.",
  rubric_score: "Name the work sample and record the score against the configured rubric criterion.",
  abc_observation: "Record the antecedent, observable behavior, and immediate consequence.",
  prompt_level: "Record the least intrusive prompt needed to complete the routine.",
  task_analysis_step: "Record the highest task-analysis step completed independently.",
  icon_scale: "Select one rating immediately after the scheduled activity.",
  accommodation_used: "Record whether the planned accommodation was delivered.",
};

function syntheticMeasurementPlan(
  goal: (typeof GOAL_LIBRARY)[number]
): MeasurementPlan {
  const weekly = goal.targetFrequency === "weekly";
  return {
    baseline: "Synthetic baseline — replace with the IEP baseline before real use.",
    observableDefinition: `Synthetic operational definition for: ${goal.goalText}`,
    measurementMethod: METHOD_BY_METRIC[goal.metricType],
    masteryCriterion: "Synthetic mastery criterion — replace with the criterion in the IEP.",
    collectionDays: weekly
      ? ["wednesday"]
      : ["monday", "tuesday", "wednesday", "thursday", "friday"],
    observationsRequired: 1,
    setting: "Synthetic pilot classroom activity",
    opportunitiesRequired:
      goal.metricType === "frequency_count" || goal.metricType === "duration_seconds"
        ? null
        : goal.metricType === "accuracy_pct"
          ? 10
          : 1,
    observationWindowMinutes:
      goal.metricType === "frequency_count" || goal.metricType === "duration_seconds"
        ? 15
        : null,
    responsibleRole: "either",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
  };
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set — see .env.local.example");
  }

  const host = new URL(databaseUrl).host;
  // Guardrail from docs/compliance.md: seed scripts must refuse to run
  // against anything that looks like a production database.
  if (!/dev|test|local|synthetic/i.test(host) && !host.includes("neon.tech")) {
    throw new Error(
      `Refusing to seed: "${host}" doesn't look like a Neon dev database. ` +
        `If this really is your dev branch, rename it to include "dev".`
    );
  }
  if (/prod/i.test(host)) {
    throw new Error(`Refusing to seed: "${host}" looks like a production database.`);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  console.log(`Seeding synthetic classroom against ${host} ...`);

  const [classroom] = await db
    .insert(schema.classrooms)
    .values({ name: "Room 12 — Synthetic Pilot Classroom" })
    .returning();

  const [teacher] = await db
    .insert(schema.staff)
    .values({
      name: "Synthetic Teacher",
      email: "synthetic.teacher@example.invalid",
      role: "teacher",
      classroomId: classroom.id,
      canManageStudents: true,
      canManageGoals: true,
    })
    .returning();

  const [aide] = await db
    .insert(schema.staff)
    .values({
      name: "Synthetic Aide",
      email: "synthetic.aide@example.invalid",
      role: "aide",
      classroomId: classroom.id,
    })
    .returning();

  const [admin] = await db
    .insert(schema.staff)
    .values({
      name: "Synthetic Admin",
      email: "synthetic.admin@example.invalid",
      role: "admin",
      classroomId: classroom.id,
      canManageUsers: true,
      canManageStudents: true,
      canManageGoals: true,
      canManageColors: true,
      canRecordData: true,
      canViewReports: true,
    })
    .returning();

  await db.insert(schema.classroomColors).values([
    {
      classroomId: classroom.id,
      name: "Ready",
      hexValue: "#2F855A",
      hoverComment: "The student is ready to begin or continue independently.",
      sortOrder: 1,
      createdByStaffId: admin.id,
    },
    {
      classroomId: classroom.id,
      name: "Check in",
      hexValue: "#D97706",
      hoverComment: "Pause and check whether the student needs a prompt or support.",
      sortOrder: 2,
      createdByStaffId: admin.id,
    },
    {
      classroomId: classroom.id,
      name: "Immediate support",
      hexValue: "#B91C1C",
      hoverComment: "The student may need immediate adult support or a planned regulation strategy.",
      sortOrder: 3,
      createdByStaffId: admin.id,
    },
  ]);

  const studentCount = randomInt(8, 10);
  const students = await db
    .insert(schema.students)
    .values(
      Array.from({ length: studentCount }, (_, i) => ({
        displayName: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_INITIALS[i % LAST_INITIALS.length]}.`,
        classroomId: classroom.id,
        isSynthetic: true,
      }))
    )
    .returning();

  const [readingGroup] = await db
    .insert(schema.rosterGroups)
    .values({
      classroomId: classroom.id,
      name: "Synthetic reading group",
      createdByStaffId: teacher.id,
    })
    .returning();
  await db.insert(schema.rosterGroupStudents).values(
    students.slice(0, Math.min(4, students.length)).map((student, position) => ({
      groupId: readingGroup.id,
      studentId: student.id,
      position,
    }))
  );

  const goalsByStudent = new Map<string, (typeof schema.goals.$inferSelect)[]>();
  for (const student of students) {
    await db.insert(schema.studentAccommodations).values(
      ACCOMMODATIONS.slice(0, 3).map((name) => ({
        studentId: student.id,
        name,
        setting: "Synthetic pilot classroom and assessments",
        implementationNotes: `Provide ${name.toLowerCase()} as described in the synthetic IEP plan.`,
        createdByStaffId: admin.id,
      }))
    );
  }
  for (const [studentIndex, student] of students.entries()) {
    const goalCount = randomInt(2, 4);
    const randomized = [...GOAL_LIBRARY].sort(() => Math.random() - 0.5);
    const requiredMetric = [
      "duration_seconds",
      "latency_seconds",
      "rubric_score",
      "abc_observation",
      "accommodation_used",
    ][studentIndex];
    const requiredGoal = requiredMetric
      ? GOAL_LIBRARY.find((goal) => goal.metricType === requiredMetric)
      : undefined;
    const chosen = requiredGoal
      ? [requiredGoal, ...randomized.filter((goal) => goal !== requiredGoal)].slice(0, goalCount)
      : randomized.slice(0, goalCount);
    const inserted = await db
      .insert(schema.goals)
      .values(
        chosen.map((g) => ({
          studentId: student.id,
          domain: g.domain,
          goalText: g.goalText,
          metricType: g.metricType,
          iconSet: g.iconSet,
          targetFrequency: g.targetFrequency,
          measurementPlan: syntheticMeasurementPlan(g),
          progressTarget: g.progressTarget,
          taskAnalysisSteps:
            g.metricType === "task_analysis_step"
              ? g.taskAnalysisSteps ?? ["Gather materials", "Open directions", "Complete task", "Check work", "Submit"]
              : undefined,
          promptHierarchy:
            g.metricType === "prompt_level"
              ? g.promptHierarchy ?? ["Full physical", "Partial physical", "Gestural", "Verbal", "Independent"]
              : undefined,
          rubricConfig: g.rubricConfig,
        }))
      )
      .returning();
    goalsByStudent.set(student.id, inserted);
  }

  // Several weeks of sessions, one per school day.
  const weeks = 4;
  const sessionDates: string[] = [];
  const today = new Date();
  for (let d = weeks * 7; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);
    if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends
    sessionDates.push(day.toISOString().slice(0, 10));
  }

  const sessions = await db
    .insert(schema.sessions)
    .values(
      sessionDates.map((date) => ({
        classroomId: classroom.id,
        sessionDate: date,
        periodLabel: "Period 3 — Resource",
      }))
    )
    .returning();

  const dataPointRows: (typeof schema.dataPoints.$inferInsert)[] = [];
  const iconReadings: Record<string, string[]> = {
    smiley_5: ["1_of_5", "2_of_5", "3_of_5", "4_of_5", "5_of_5"],
    zones_4: ["blue", "green", "yellow", "red"],
    stars_5: ["1_of_5", "2_of_5", "3_of_5", "4_of_5", "5_of_5"],
    thumbs_3: ["down", "sideways", "up"],
  };

  for (const student of students) {
    const goals = goalsByStudent.get(student.id) ?? [];
    for (const session of sessions) {
      // Not every goal gets logged every session — matches real classroom
      // usage more than a dense grid would.
      for (const goal of goals) {
        if (Math.random() > 0.7) continue;
        const enteredBy = Math.random() > 0.5 ? teacher.id : aide.id;
        const base = {
          goalId: goal.id,
          sessionId: session.id,
          enteredByStaffId: enteredBy,
        };

        switch (goal.metricType) {
          case "accuracy_pct": {
            const total = randomInt(10, 20);
            const correct = randomInt(Math.round(total * 0.6), total);
            for (let trial = 0; trial < total; trial += 1) {
              dataPointRows.push({
                ...base,
                entryKind: trial < correct ? "correct_trial" : "incorrect_trial",
                clientRequestId: crypto.randomUUID(),
              });
            }
            break;
          }
          case "fluency_rate":
            dataPointRows.push({
              ...base,
              entryKind: "numeric",
              clientRequestId: crypto.randomUUID(),
              valueNumeric: randomInt(20, 60),
            });
            break;
          case "frequency_count": {
            const count = randomInt(0, 8);
            for (let occurrence = 0; occurrence < count; occurrence += 1) {
              dataPointRows.push({
                ...base,
                entryKind: "tally",
                clientRequestId: crypto.randomUUID(),
                valueNumeric: 1,
              });
            }
            dataPointRows.push({
              ...base,
              entryKind: "observation_complete",
              clientRequestId: crypto.randomUUID(),
              observationDurationSeconds: randomInt(10, 20) * 60,
            });
            break;
          }
          case "duration_seconds":
            dataPointRows.push({
              ...base,
              entryKind: "duration",
              clientRequestId: crypto.randomUUID(),
              valueNumeric: randomInt(30, 600),
            });
            break;
          case "latency_seconds":
            dataPointRows.push({
              ...base,
              entryKind: "duration",
              clientRequestId: crypto.randomUUID(),
              valueNumeric: randomInt(10, 120),
            });
            break;
          case "rubric_score":
            dataPointRows.push({
              ...base,
              entryKind: "rubric_score",
              clientRequestId: crypto.randomUUID(),
              valueNumeric: randomInt(1, goal.rubricConfig?.maxScore ?? 4),
              observationDetails: {
                kind: "rubric",
                workSample: `Synthetic paragraph ${session.sessionDate}`,
                criterion: pick(goal.rubricConfig?.criteria ?? ["Organization"]),
              },
            });
            break;
          case "abc_observation":
            dataPointRows.push({
              ...base,
              entryKind: "abc_observation",
              clientRequestId: crypto.randomUUID(),
              observationDetails: {
                kind: "abc",
                antecedent: "Synthetic transition direction was presented.",
                behavior: "Synthetic observable response occurred.",
                consequence: "Synthetic planned support was provided.",
              },
            });
            break;
          case "prompt_level":
            dataPointRows.push({
              ...base,
              entryKind: "rating",
              clientRequestId: crypto.randomUUID(),
              valueEnum: pick(
                goal.promptHierarchy ?? [
                  "full_physical",
                  "partial_physical",
                  "gestural",
                  "verbal",
                  "independent",
                ]
              ),
            });
            break;
          case "task_analysis_step":
            dataPointRows.push({
              ...base,
              entryKind: "task_step",
              clientRequestId: crypto.randomUUID(),
              valueNumeric: randomInt(1, goal.taskAnalysisSteps?.length ?? 5),
            });
            break;
          case "icon_scale":
            dataPointRows.push({
              ...base,
              entryKind: "rating",
              clientRequestId: crypto.randomUUID(),
              valueEnum: pick(iconReadings[goal.iconSet ?? "smiley_5"]),
            });
            break;
          case "accommodation_used":
            dataPointRows.push({
              ...base,
              entryKind: "accommodation",
              clientRequestId: crypto.randomUUID(),
              valueEnum: Math.random() > 0.1 ? "used" : "not_used",
            });
            break;
        }
      }

      // Occasional accommodation log for this student/session.
      if (Math.random() > 0.6) {
        const enteredBy = Math.random() > 0.5 ? teacher.id : aide.id;
        const accommodationName = pick(ACCOMMODATIONS.slice(0, 3));
        const used = Math.random() > 0.1;
        const relatedGoal = pick(goals);
        await db.insert(schema.accommodationLogs).values({
          studentId: student.id,
          sessionId: session.id,
          goalId: relatedGoal?.id ?? null,
          accommodationName,
          used,
          effectivenessRating: used ? randomInt(1, 5) : null,
          setting: "Synthetic pilot classroom and assessments",
          activity: "Synthetic instructional activity",
          implementationFidelity: used ? randomInt(1, 5) : null,
          reasonNotUsed: used ? null : "Synthetic reason: support was not needed in this activity.",
          entryAt: new Date(`${session.sessionDate}T10:00:00Z`),
          enteredByStaffId: enteredBy,
        });
      }
    }
  }

  // Batch insert data points (chunked to stay under any single-request limits).
  const chunkSize = 200;
  for (let i = 0; i < dataPointRows.length; i += chunkSize) {
    await db.insert(schema.dataPoints).values(dataPointRows.slice(i, i + chunkSize));
  }

  const firstGoal = goalsByStudent.get(students[0].id)?.[0];
  if (firstGoal) {
    await db.insert(schema.interventionAnnotations).values({
      goalId: firstGoal.id,
      interventionDate: sessionDates[Math.max(0, sessionDates.length - 10)],
      description: "Synthetic intervention — began a visual task checklist.",
      createdByStaffId: teacher.id,
    });
  }

  console.log(
    `Seeded 1 classroom, 2 staff, ${students.length} students, 1 roster group, ` +
      `${sessions.length} sessions, ${dataPointRows.length} data points.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
