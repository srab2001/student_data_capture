import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { accommodationLogs, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertClassroomScope } from "@/lib/auth/authz";
import { createAccommodationLogSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

/** Scoped list of accommodation logs. Optional ?studentId= filter. */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const studentId = request.nextUrl.searchParams.get("studentId");

    const rows = await db
      .select({ log: accommodationLogs, studentClassroomId: students.classroomId })
      .from(accommodationLogs)
      .innerJoin(students, eq(accommodationLogs.studentId, students.id))
      .where(
        and(
          eq(students.classroomId, current.classroomId!),
          isNull(accommodationLogs.deletedAt),
          studentId ? eq(accommodationLogs.studentId, studentId) : undefined
        )
      );

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "accommodation_logs",
    });

    return NextResponse.json({ accommodationLogs: rows.map((r) => r.log) });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "accommodation-logs:post");
    const body = createAccommodationLogSchema.parse(await request.json());

    const [student] = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(and(eq(students.id, body.studentId), isNull(students.deletedAt)))
      .limit(1);
    if (!student) return jsonError("Unknown student.", 404);
    assertClassroomScope(current, student.classroomId);

    const [created] = await db
      .insert(accommodationLogs)
      .values({ ...body, enteredByStaffId: current.id })
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "accommodation_logs",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json({ accommodationLog: created }, { status: 201 });
  });
}
