import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionAbsences, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertCanModifyEntry } from "@/lib/auth/authz";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

async function loadScopedAbsence(id: string, classroomId: string) {
  const [row] = await db
    .select({ absence: sessionAbsences, studentClassroomId: students.classroomId })
    .from(sessionAbsences)
    .innerJoin(students, eq(sessionAbsences.studentId, students.id))
    .where(and(eq(sessionAbsences.id, id), isNull(sessionAbsences.deletedAt)))
    .limit(1);

  if (!row || row.studentClassroomId !== classroomId) return null;
  return row.absence;
}

/** Undoes an absence mark — the student's goal-entry controls become active again. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "session-absences:delete");
    const { id } = await params;

    const existing = await loadScopedAbsence(id, current.classroomId!);
    if (!existing) return jsonError("Absence mark not found.", 404);
    assertCanModifyEntry(current, existing.enteredByStaffId);

    await db
      .update(sessionAbsences)
      .set({ deletedAt: new Date() })
      .where(eq(sessionAbsences.id, id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "session_absences",
      recordId: id,
    });

    return NextResponse.json({ ok: true });
  });
}
