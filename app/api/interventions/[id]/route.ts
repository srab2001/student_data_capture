import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  goals,
  interventionAnnotations,
  students,
} from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  HttpError,
} from "@/lib/api-helpers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot retire intervention annotations.");
    assertWriteRateLimit(current.id, "interventions:delete");
    const { id: rawId } = await params;
    const id = z.uuid().parse(rawId);

    const [annotation] = await db
      .select({ id: interventionAnnotations.id })
      .from(interventionAnnotations)
      .innerJoin(goals, eq(interventionAnnotations.goalId, goals.id))
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(
        and(
          eq(interventionAnnotations.id, id),
          eq(students.classroomId, current.classroomId!),
          isNull(students.deletedAt),
          isNull(interventionAnnotations.deletedAt)
        )
      )
      .limit(1);
    if (!annotation) throw new HttpError("Intervention annotation not found.", 404);

    await db
      .update(interventionAnnotations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(interventionAnnotations.id, id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "intervention_annotations",
      recordId: id,
    });

    return NextResponse.json({ ok: true });
  });
}
