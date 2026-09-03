import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { goals, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertClassroomScope, assertPermission, assertStudentDataAccess } from "@/lib/auth/authz";
import { createGoalSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

/** Scoped list of goals. Optional ?studentId= filter. */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertStudentDataAccess(current);
    const studentId = request.nextUrl.searchParams.get("studentId");

    const rows = await db
      .select({ goal: goals, studentClassroomId: students.classroomId })
      .from(goals)
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(
        and(
          eq(students.classroomId, current.classroomId!),
          isNull(goals.deletedAt),
          studentId ? eq(goals.studentId, studentId) : undefined
        )
      );

    await recordAudit({ actorStaffId: current.id, action: "read", tableName: "goals" });

    return NextResponse.json({ goals: rows.map((r) => r.goal) });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot create goals.");
    assertWriteRateLimit(current.id, "goals:post");
    const body = createGoalSchema.parse(await request.json());

    const [student] = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(and(eq(students.id, body.studentId), isNull(students.deletedAt)))
      .limit(1);

    if (!student) return jsonError("Unknown student.", 404);
    assertClassroomScope(current, student.classroomId);

    const [created] = await db.insert(goals).values(body).returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "goals",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json({ goal: created }, { status: 201 });
  });
}
