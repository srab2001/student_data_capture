import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { createStudentSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { assertWriteRateLimit, handleRoute, jsonError } from "@/lib/api-helpers";

async function loadScopedStudent(id: string, classroomId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.id, id),
        eq(students.classroomId, classroomId),
        isNull(students.deletedAt)
      )
    )
    .limit(1);
  return student ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageStudents", "You cannot manage students.");
    assertWriteRateLimit(current.id, "students:patch");
    const { id: rawId } = await params;
    const id = z.uuid().parse(rawId);
    const body = createStudentSchema.parse(await request.json());
    const existing = await loadScopedStudent(id, current.classroomId!);
    if (!existing) return jsonError("Student not found.", 404);

    const [updated] = await db
      .update(students)
      .set({ displayName: body.displayName, updatedAt: new Date() })
      .where(eq(students.id, existing.id))
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "students",
      recordId: updated.id,
      diff: body,
    });

    return NextResponse.json({ student: updated });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageStudents", "You cannot manage students.");
    assertWriteRateLimit(current.id, "students:delete");
    const { id: rawId } = await params;
    const id = z.uuid().parse(rawId);
    const existing = await loadScopedStudent(id, current.classroomId!);
    if (!existing) return jsonError("Student not found.", 404);

    const now = new Date();
    await db
      .update(students)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(students.id, existing.id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "students",
      recordId: existing.id,
    });

    return NextResponse.json({ ok: true });
  });
}
