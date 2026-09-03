import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { dataPoints, goals, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertCanModifyEntry } from "@/lib/auth/authz";
import { updateDataPointSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";

async function loadScopedDataPoint(id: string, classroomId: string) {
  const [row] = await db
    .select({ dataPoint: dataPoints, studentClassroomId: students.classroomId })
    .from(dataPoints)
    .innerJoin(goals, eq(dataPoints.goalId, goals.id))
    .innerJoin(students, eq(goals.studentId, students.id))
    .where(and(eq(dataPoints.id, id), isNull(dataPoints.deletedAt)))
    .limit(1);

  if (!row || row.studentClassroomId !== classroomId) return null;
  return row.dataPoint;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const { id } = await params;
    const dataPoint = await loadScopedDataPoint(id, current.classroomId!);
    if (!dataPoint) return jsonError("Data point not found.", 404);

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "data_points",
      recordId: id,
    });

    return NextResponse.json({ dataPoint });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "data-points:patch");
    const { id } = await params;
    const body = updateDataPointSchema.parse(await request.json());

    const existing = await loadScopedDataPoint(id, current.classroomId!);
    if (!existing) return jsonError("Data point not found.", 404);
    assertCanModifyEntry(current, existing.enteredByStaffId);
    if (existing.entryKind !== "legacy_snapshot") {
      return jsonError(
        "Observation events are immutable. Undo the event and record a corrected observation.",
        409
      );
    }

    const [updated] = await db
      .update(dataPoints)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(dataPoints.id, id))
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "data_points",
      recordId: id,
      diff: body,
    });

    return NextResponse.json({ dataPoint: updated });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "data-points:delete");
    const { id } = await params;

    const existing = await loadScopedDataPoint(id, current.classroomId!);
    if (!existing) return jsonError("Data point not found.", 404);
    assertCanModifyEntry(current, existing.enteredByStaffId);

    await db.update(dataPoints).set({ deletedAt: new Date() }).where(eq(dataPoints.id, id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "data_points",
      recordId: id,
    });

    return NextResponse.json({ ok: true });
  });
}
