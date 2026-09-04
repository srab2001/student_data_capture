import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionAbsences, sessions, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import {
  requireStaff,
  assertClassroomScope,
  assertPermission,
  assertStudentDataAccess,
} from "@/lib/auth/authz";
import { createSessionAbsenceSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

/** Scoped list of session absences. Optional ?sessionId= filter. */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertStudentDataAccess(current);
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    const rows = await db
      .select({ absence: sessionAbsences, studentClassroomId: students.classroomId })
      .from(sessionAbsences)
      .innerJoin(students, eq(sessionAbsences.studentId, students.id))
      .where(
        and(
          eq(students.classroomId, current.classroomId!),
          isNull(sessionAbsences.deletedAt),
          sessionId ? eq(sessionAbsences.sessionId, sessionId) : undefined
        )
      );

    await recordAudit({ actorStaffId: current.id, action: "read", tableName: "session_absences" });

    return NextResponse.json({ absences: rows.map((r) => r.absence) });
  });
}

/**
 * Marks a student absent for a session. Idempotent: marking an
 * already-absent student just returns the existing row, and re-marking
 * after an undo revives the same row (via the session+student unique
 * index) instead of erroring on a duplicate.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canRecordData", "You cannot record attendance.");
    assertWriteRateLimit(current.id, "session-absences:post");
    const body = createSessionAbsenceSchema.parse(await request.json());

    const [sessionRow] = await db
      .select({ classroomId: sessions.classroomId })
      .from(sessions)
      .where(and(eq(sessions.id, body.sessionId), isNull(sessions.deletedAt)))
      .limit(1);
    if (!sessionRow) return jsonError("Unknown session.", 404);
    assertClassroomScope(current, sessionRow.classroomId);

    const [studentRow] = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(and(eq(students.id, body.studentId), isNull(students.deletedAt)))
      .limit(1);
    if (!studentRow) return jsonError("Unknown student.", 404);
    assertClassroomScope(current, studentRow.classroomId);

    const [existing] = await db
      .select()
      .from(sessionAbsences)
      .where(
        and(
          eq(sessionAbsences.sessionId, body.sessionId),
          eq(sessionAbsences.studentId, body.studentId)
        )
      )
      .limit(1);

    let absence;
    if (existing && !existing.deletedAt) {
      absence = existing;
    } else if (existing) {
      [absence] = await db
        .update(sessionAbsences)
        .set({ deletedAt: null, enteredByStaffId: current.id, updatedAt: new Date() })
        .where(eq(sessionAbsences.id, existing.id))
        .returning();
    } else {
      [absence] = await db
        .insert(sessionAbsences)
        .values({ sessionId: body.sessionId, studentId: body.studentId, enteredByStaffId: current.id })
        .returning();
    }

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "session_absences",
      recordId: absence.id,
      diff: body,
    });

    return NextResponse.json({ absence }, { status: 201 });
  });
}
