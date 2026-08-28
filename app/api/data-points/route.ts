import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { dataPoints, goals, students, sessions } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertClassroomScope } from "@/lib/auth/authz";
import { createDataPointSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

/** Scoped list of data points. Optional ?goalId= / ?sessionId= filters. */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const goalId = request.nextUrl.searchParams.get("goalId");
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    const rows = await db
      .select({ dataPoint: dataPoints, studentClassroomId: students.classroomId })
      .from(dataPoints)
      .innerJoin(goals, eq(dataPoints.goalId, goals.id))
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(
        and(
          eq(students.classroomId, current.classroomId!),
          isNull(dataPoints.deletedAt),
          goalId ? eq(dataPoints.goalId, goalId) : undefined,
          sessionId ? eq(dataPoints.sessionId, sessionId) : undefined
        )
      );

    await recordAudit({ actorStaffId: current.id, action: "read", tableName: "data_points" });

    return NextResponse.json({ dataPoints: rows.map((r) => r.dataPoint) });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "data-points:post");
    const body = createDataPointSchema.parse(await request.json());

    const [goalRow] = await db
      .select({ studentClassroomId: students.classroomId })
      .from(goals)
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(and(eq(goals.id, body.goalId), isNull(goals.deletedAt)))
      .limit(1);
    if (!goalRow) return jsonError("Unknown goal.", 404);
    assertClassroomScope(current, goalRow.studentClassroomId);

    const [sessionRow] = await db
      .select({ classroomId: sessions.classroomId })
      .from(sessions)
      .where(and(eq(sessions.id, body.sessionId), isNull(sessions.deletedAt)))
      .limit(1);
    if (!sessionRow) return jsonError("Unknown session.", 404);
    assertClassroomScope(current, sessionRow.classroomId);

    const [created] = await db
      .insert(dataPoints)
      .values({ ...body, enteredByStaffId: current.id })
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "data_points",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json({ dataPoint: created }, { status: 201 });
  });
}
