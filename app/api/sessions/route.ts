import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, assertStudentDataAccess, requireStaff } from "@/lib/auth/authz";
import { handleRoute, assertWriteRateLimit } from "@/lib/api-helpers";

const createSessionSchema = z
  .object({
    sessionDate: z.iso.date(),
    periodLabel: z.string().trim().min(1).max(100),
  })
  .strict();

/** Scoped list of sessions for the signed-in staff member's classroom. */
export async function GET() {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertStudentDataAccess(current);
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.classroomId, current.classroomId!), isNull(sessions.deletedAt)));
    return NextResponse.json({ sessions: rows });
  });
}

/**
 * Find-or-create the session for a given date + period in the staff
 * member's classroom. The entry screen calls this once per sweep rather
 * than making the teacher manage sessions by hand.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canRecordData", "You cannot create data-collection sessions.");
    assertWriteRateLimit(current.id, "sessions:post");
    const body = createSessionSchema.parse(await request.json());

    const [existing] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.classroomId, current.classroomId!),
          eq(sessions.sessionDate, body.sessionDate),
          eq(sessions.periodLabel, body.periodLabel),
          isNull(sessions.deletedAt)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ session: existing });
    }

    const [created] = await db
      .insert(sessions)
      .values({
        classroomId: current.classroomId!,
        sessionDate: body.sessionDate,
        periodLabel: body.periodLabel,
      })
      .returning();

    return NextResponse.json({ session: created }, { status: 201 });
  });
}
