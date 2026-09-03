import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accommodationLogs,
  goals,
  sessions,
  studentAccommodations,
  students,
} from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import {
  requireStaff,
  assertCanModifyEntry,
  assertClassroomScope,
  assertPermission,
  assertStudentDataAccess,
} from "@/lib/auth/authz";
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
    assertStudentDataAccess(current);
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
    assertPermission(current, "canRecordData", "You cannot correct accommodations.");
    assertWriteRateLimit(current.id, "accommodation-logs:patch");
    const { id } = await params;
    const body = updateAccommodationLogSchema.parse(await request.json());

    const existing = await loadScopedLog(id, current.classroomId!);
    if (!existing) return jsonError("Accommodation log not found.", 404);
    assertCanModifyEntry(current, existing.enteredByStaffId);

    if (body.accommodationName) {
      const [configured] = await db
        .select({ id: studentAccommodations.id })
        .from(studentAccommodations)
        .where(
          and(
            eq(studentAccommodations.studentId, existing.studentId),
            eq(studentAccommodations.name, body.accommodationName),
            isNull(studentAccommodations.deletedAt)
          )
        )
        .limit(1);
      if (!configured) {
        return jsonError("This accommodation is not active in the student's data plan.", 400);
      }
    }

    const used = body.used ?? existing.used;
    const effectiveness = "effectivenessRating" in body
      ? body.effectivenessRating
      : existing.effectivenessRating;
    const fidelity = "implementationFidelity" in body
      ? body.implementationFidelity
      : existing.implementationFidelity;
    if (!used && (effectiveness !== null || fidelity !== null)) {
      return jsonError(
        "Effectiveness and implementation fidelity can be rated only when the accommodation was used.",
        400
      );
    }

    if (body.goalId) {
      const [goal] = await db
        .select({ studentId: goals.studentId })
        .from(goals)
        .where(and(eq(goals.id, body.goalId), isNull(goals.deletedAt)))
        .limit(1);
      if (!goal || goal.studentId !== existing.studentId) {
        return jsonError("The related goal must be active for this student.", 400);
      }
    }

    if (body.sessionId) {
      const [session] = await db
        .select({ classroomId: sessions.classroomId })
        .from(sessions)
        .where(and(eq(sessions.id, body.sessionId), isNull(sessions.deletedAt)))
        .limit(1);
      if (!session) return jsonError("Unknown session.", 404);
      assertClassroomScope(current, session.classroomId);
    }

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
    assertPermission(current, "canRecordData", "You cannot correct accommodations.");
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
