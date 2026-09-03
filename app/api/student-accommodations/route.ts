import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { studentAccommodations, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertClassroomScope } from "@/lib/auth/authz";
import { createStudentAccommodationSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

/** Scoped list of configured accommodations. Optional ?studentId= filter. */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const studentId = request.nextUrl.searchParams.get("studentId");

    const rows = await db
      .select({ accommodation: studentAccommodations, studentClassroomId: students.classroomId })
      .from(studentAccommodations)
      .innerJoin(students, eq(studentAccommodations.studentId, students.id))
      .where(
        and(
          eq(students.classroomId, current.classroomId!),
          isNull(studentAccommodations.deletedAt),
          studentId ? eq(studentAccommodations.studentId, studentId) : undefined
        )
      );

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "student_accommodations",
    });

    return NextResponse.json({ accommodations: rows.map((r) => r.accommodation) });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "student-accommodations:post");
    const body = createStudentAccommodationSchema.parse(await request.json());

    const [student] = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(and(eq(students.id, body.studentId), isNull(students.deletedAt)))
      .limit(1);

    if (!student) return jsonError("Unknown student.", 404);
    assertClassroomScope(current, student.classroomId);

    const [created] = await db.insert(studentAccommodations).values(body).returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "student_accommodations",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json({ accommodation: created }, { status: 201 });
  });
}
