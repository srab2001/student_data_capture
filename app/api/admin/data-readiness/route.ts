import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accommodationLogs,
  goals,
  studentAccommodations,
  students,
} from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { handleRoute } from "@/lib/api-helpers";
import { recordAudit } from "@/lib/audit";

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

export async function GET() {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot review data readiness.");

    const [goalRows, configuredRows, historicalRows] = await Promise.all([
      db
        .select({
          id: goals.id,
          studentId: goals.studentId,
          studentName: students.displayName,
          goalText: goals.goalText,
          metricType: goals.metricType,
          measurementPlan: goals.measurementPlan,
          promptHierarchy: goals.promptHierarchy,
        })
        .from(goals)
        .innerJoin(students, eq(goals.studentId, students.id))
        .where(
          and(
            eq(students.classroomId, current.classroomId!),
            isNull(students.deletedAt),
            isNull(goals.deletedAt)
          )
        )
        .orderBy(asc(students.displayName), asc(goals.goalText)),
      db
        .select({
          studentId: studentAccommodations.studentId,
          name: studentAccommodations.name,
        })
        .from(studentAccommodations)
        .innerJoin(students, eq(studentAccommodations.studentId, students.id))
        .where(
          and(
            eq(students.classroomId, current.classroomId!),
            isNull(students.deletedAt),
            isNull(studentAccommodations.deletedAt)
          )
        ),
      db
        .select({
          studentId: accommodationLogs.studentId,
          studentName: students.displayName,
          name: accommodationLogs.accommodationName,
        })
        .from(accommodationLogs)
        .innerJoin(students, eq(accommodationLogs.studentId, students.id))
        .where(
          and(
            eq(students.classroomId, current.classroomId!),
            isNull(students.deletedAt),
            isNull(accommodationLogs.deletedAt)
          )
        ),
    ]);

    const configured = new Set(
      configuredRows.map((row) => `${row.studentId}:${normalized(row.name)}`)
    );
    const historical = new Map<
      string,
      { studentId: string; studentName: string; name: string; logCount: number }
    >();
    for (const row of historicalRows) {
      const key = `${row.studentId}:${normalized(row.name)}`;
      if (configured.has(key)) continue;
      const existing = historical.get(key);
      if (existing) existing.logCount += 1;
      else historical.set(key, { ...row, logCount: 1 });
    }

    const goalsMissingPlan = goalRows
      .filter((row) => row.measurementPlan === null)
      .map((row) => ({
        id: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        goalText: row.goalText,
        metricType: row.metricType,
      }));
    const promptGoalsUsingDefault = goalRows.filter(
      (row) => row.metricType === "prompt_level" && !row.promptHierarchy?.length
    ).length;

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "goals",
    });

    return NextResponse.json({
      summary: {
        activeGoals: goalRows.length,
        goalsMissingPlan: goalsMissingPlan.length,
        promptGoalsUsingDefault,
        historicalAccommodationsToReconcile: historical.size,
      },
      goalsMissingPlan,
      unmatchedAccommodations: [...historical.values()].sort(
        (a, b) =>
          a.studentName.localeCompare(b.studentName) || a.name.localeCompare(b.name)
      ),
    });
  });
}
