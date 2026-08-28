import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { accommodationLogs, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertCanModifyEntry } from "@/lib/auth/authz";
import { updateAccommodationLogSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

async function loadScopedLog(id: string, classroomId: string) {
  const [row] = await db
    .select({ log: accommodationLogs, studentClassroomId: students.classroomId })
    .from(accommodationLogs)
    .innerJoin(students, eq(accommodationLogs.studentId, students.id))
    .where(and(eq(accommodationLogs.id, id), isNull(accommodationLogs.deletedAt)))
    .limit(1);

  if (!row || row.studentClassroomId !== classroomId) return null;
  return row.log;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const { id } = await params;
    const log = await loadScopedLog(id, current.classroomId!);
    if (!log) return jsonError("Accommodation log not found.", 404);

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "accommodation_logs",
      recordId: id,
    });

    return NextResponse.json({ accommodationLog: log });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "accommodation-logs:patch");
    const { id } = await params;
    const body = updateAccommodationLogSchema.parse(await request.json());

    const existing = await loadScopedLog(id, current.classroomId!);
    if (!existing) return jsonError("Accommodation log not found.", 404);
    assertCanModifyEntry(current, existing.enteredByStaffId);

    const [updated] = await db
      .update(accommodationLogs)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(accommodationLogs.id, id))
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "accommodation_logs",
      recordId: id,
      diff: body,
    });

    return NextResponse.json({ accommodationLog: updated });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "accommodation-logs:delete");
    const { id } = await params;

    const existing = await loadScopedLog(id, current.classroomId!);
    if (!existing) return jsonError("Accommodation log not found.", 404);
    assertCanModifyEntry(current, existing.enteredByStaffId);

    await db
      .update(accommodationLogs)
      .set({ deletedAt: new Date() })
      .where(eq(accommodationLogs.id, id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "accommodation_logs",
      recordId: id,
    });

    return NextResponse.json({ ok: true });
  });
}
