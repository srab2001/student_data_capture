import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { studentAccommodations, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import {
  assertClassroomScope,
  assertPermission,
  assertStudentDataAccess,
  requireStaff,
} from "@/lib/auth/authz";
import { studentAccommodationSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { assertWriteRateLimit, handleRoute, jsonError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertStudentDataAccess(current);
    const studentId = request.nextUrl.searchParams.get("studentId");

    const rows = await db
      .select({ accommodation: studentAccommodations })
      .from(studentAccommodations)
      .innerJoin(students, eq(studentAccommodations.studentId, students.id))
      .where(
        and(
          eq(students.classroomId, current.classroomId!),
          isNull(students.deletedAt),
          isNull(studentAccommodations.deletedAt),
          studentId ? eq(studentAccommodations.studentId, studentId) : undefined
        )
      )
      .orderBy(asc(studentAccommodations.name));

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "student_accommodations",
    });

    return NextResponse.json({ accommodations: rows.map((row) => row.accommodation) });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot configure accommodations.");
    assertWriteRateLimit(current.id, "student-accommodations:post");
    const body = studentAccommodationSchema.parse(await request.json());

    const [student] = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(and(eq(students.id, body.studentId), isNull(students.deletedAt)))
      .limit(1);
    if (!student) return jsonError("Unknown student.", 404);
    assertClassroomScope(current, student.classroomId);

    const [duplicate] = await db
      .select({ id: studentAccommodations.id })
      .from(studentAccommodations)
      .where(
        and(
          eq(studentAccommodations.studentId, body.studentId),
          eq(studentAccommodations.name, body.name),
          isNull(studentAccommodations.deletedAt)
        )
      )
      .limit(1);
    if (duplicate) {
      return jsonError("That accommodation is already active for this student.", 409);
    }

    const [created] = await db
      .insert(studentAccommodations)
      .values({ ...body, createdByStaffId: current.id })
      .returning();

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
