import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/authz";
import { recordAudit } from "@/lib/audit";
import { handleRoute } from "@/lib/api-helpers";

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
