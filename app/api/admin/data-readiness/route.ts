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
          id: studentAccommodations.id,
          studentId: studentAccommodations.studentId,
          studentName: students.displayName,
          name: studentAccommodations.name,
          setting: studentAccommodations.setting,
          implementationNotes: studentAccommodations.implementationNotes,
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

    const configured = new Map(
      configuredRows.map((row) => [
        `${row.studentId}:${normalized(row.name)}`,
        row,
      ])
    );
    const reconciliation = new Map<
      string,
      {
        accommodationId: string | null;
        studentId: string;
        studentName: string;
        name: string;
        logCount: number;
      }
    >();
    for (const row of configuredRows) {
      if (row.setting && row.implementationNotes) continue;
      const key = `${row.studentId}:${normalized(row.name)}`;
      reconciliation.set(key, {
        accommodationId: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        name: row.name,
        logCount: 0,
      });
    }
    for (const row of historicalRows) {
      const key = `${row.studentId}:${normalized(row.name)}`;
      const configuredRow = configured.get(key);
      if (configuredRow?.setting && configuredRow.implementationNotes) continue;
      const existing = reconciliation.get(key);
      if (existing) existing.logCount += 1;
      else {
        reconciliation.set(key, {
          accommodationId: null,
          ...row,
          logCount: 1,
        });
      }
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
        historicalAccommodationsToReconcile: reconciliation.size,
      },
      goalsMissingPlan,
      unmatchedAccommodations: [...reconciliation.values()].sort(
        (a, b) =>
          a.studentName.localeCompare(b.studentName) || a.name.localeCompare(b.name)
      ),
    });
  });
}
