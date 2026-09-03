import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { studentAccommodations, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { updateStudentAccommodationSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { assertWriteRateLimit, handleRoute, jsonError } from "@/lib/api-helpers";

async function loadScopedAccommodation(id: string, classroomId: string) {
  const [row] = await db
    .select({ accommodation: studentAccommodations, classroomId: students.classroomId })
    .from(studentAccommodations)
    .innerJoin(students, eq(studentAccommodations.studentId, students.id))
    .where(
      and(
        eq(studentAccommodations.id, id),
        isNull(studentAccommodations.deletedAt),
        isNull(students.deletedAt)
      )
    )
    .limit(1);
  return row?.classroomId === classroomId ? row.accommodation : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot configure accommodations.");
    assertWriteRateLimit(current.id, "student-accommodations:patch");
    const { id } = await params;
    const body = updateStudentAccommodationSchema.parse(await request.json());
    const existing = await loadScopedAccommodation(id, current.classroomId!);
    if (!existing) return jsonError("Accommodation not found.", 404);

    const [updated] = await db
      .update(studentAccommodations)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(studentAccommodations.id, id))
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "student_accommodations",
      recordId: id,
      diff: body,
    });
    return NextResponse.json({ accommodation: updated });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot configure accommodations.");
    assertWriteRateLimit(current.id, "student-accommodations:delete");
    const { id } = await params;
    const existing = await loadScopedAccommodation(id, current.classroomId!);
    if (!existing) return jsonError("Accommodation not found.", 404);

    await db
      .update(studentAccommodations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(studentAccommodations.id, id));
    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "student_accommodations",
      recordId: id,
    });
    return NextResponse.json({ ok: true });
  });
}
