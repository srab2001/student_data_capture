import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/authz";
import { createStudentSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit } from "@/lib/api-helpers";

/**
 * Scoped roster for the signed-in staff member's own classroom. The
 * frontend must never request or display students outside this scope —
 * this route is the only place that boundary is enforced (Phase 3).
 */
export async function GET() {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());

    const rows = await db
      .select()
      .from(students)
      .where(and(eq(students.classroomId, current.classroomId!), isNull(students.deletedAt)));

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "students",
    });

    return NextResponse.json({ students: rows });
  });
}

/**
 * Adds a student to the signed-in staff member's own classroom.
 * `isSynthetic` is always true here, never client-settable — this app
 * only ever creates real, identifiable students once Track B is signed
 * off (docs/compliance.md), and that gate is enforced app-wide, not
 * just at seed time.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "students:post");
    const body = createStudentSchema.parse(await request.json());

    const [created] = await db
      .insert(students)
      .values({
        displayName: body.displayName,
        classroomId: current.classroomId!,
        isSynthetic: true,
      })
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "students",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json({ student: created }, { status: 201 });
  });
}
