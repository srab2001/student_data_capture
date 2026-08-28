import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { goals, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/authz";
import { updateGoalSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

async function loadScopedGoal(id: string, classroomId: string) {
  const [row] = await db
    .select({ goal: goals, studentClassroomId: students.classroomId })
    .from(goals)
    .innerJoin(students, eq(goals.studentId, students.id))
    .where(and(eq(goals.id, id), isNull(goals.deletedAt)))
    .limit(1);

  if (!row) return null;
  if (row.studentClassroomId !== classroomId) return null;
  return row.goal;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const { id } = await params;
    const goal = await loadScopedGoal(id, current.classroomId!);
    if (!goal) return jsonError("Goal not found.", 404);

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "goals",
      recordId: id,
    });

    return NextResponse.json({ goal });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "goals:patch");
    const { id } = await params;
    const body = updateGoalSchema.parse(await request.json());

    const existing = await loadScopedGoal(id, current.classroomId!);
    if (!existing) return jsonError("Goal not found.", 404);

    const [updated] = await db
      .update(goals)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "goals",
      recordId: id,
      diff: body,
    });

    return NextResponse.json({ goal: updated });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "goals:delete");
    const { id } = await params;

    const existing = await loadScopedGoal(id, current.classroomId!);
    if (!existing) return jsonError("Goal not found.", 404);

    await db.update(goals).set({ deletedAt: new Date() }).where(eq(goals.id, id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "goals",
      recordId: id,
    });

    return NextResponse.json({ ok: true });
  });
}
