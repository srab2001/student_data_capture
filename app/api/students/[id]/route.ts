import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/authz";
import { updateStudentSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

async function loadScopedStudent(id: string, classroomId: string) {
  const [row] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, id), isNull(students.deletedAt)))
    .limit(1);

  if (!row || row.classroomId !== classroomId) return null;
  return row;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "students:patch");
    const { id } = await params;
    const body = updateStudentSchema.parse(await request.json());

    const existing = await loadScopedStudent(id, current.classroomId!);
    if (!existing) return jsonError("Student not found.", 404);

    const [updated] = await db
      .update(students)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "students",
      recordId: id,
      diff: body,
    });

    return NextResponse.json({ student: updated });
  });
}

/** Retires (soft-deletes) a student — their past data points and goals are kept as-is. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "students:delete");
    const { id } = await params;

    const existing = await loadScopedStudent(id, current.classroomId!);
    if (!existing) return jsonError("Student not found.", 404);

    await db.update(students).set({ deletedAt: new Date() }).where(eq(students.id, id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "students",
      recordId: id,
    });

    return NextResponse.json({ ok: true });
  });
}
