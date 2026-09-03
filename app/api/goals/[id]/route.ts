import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { dataPoints, goals, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/authz";
import { createGoalSchema, updateGoalSchema } from "@/lib/validation";
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

    const nextDefinition = createGoalSchema.parse({
      studentId: existing.studentId,
      domain: body.domain ?? existing.domain,
      goalText: body.goalText ?? existing.goalText,
      metricType: body.metricType ?? existing.metricType,
      iconSet:
        (body.metricType ?? existing.metricType) === "icon_scale"
          ? (body.iconSet ?? existing.iconSet ?? undefined)
          : undefined,
      taskAnalysisSteps:
        (body.metricType ?? existing.metricType) === "task_analysis_step"
          ? (body.taskAnalysisSteps ?? existing.taskAnalysisSteps ?? undefined)
          : undefined,
      measurementPlan: body.measurementPlan ?? existing.measurementPlan ?? undefined,
      targetFrequency: body.targetFrequency ?? existing.targetFrequency,
    });

    const changesMeasurementDefinition =
      nextDefinition.goalText !== existing.goalText ||
      nextDefinition.metricType !== existing.metricType ||
      (nextDefinition.iconSet ?? null) !== existing.iconSet ||
      JSON.stringify(nextDefinition.taskAnalysisSteps ?? null) !==
        JSON.stringify(existing.taskAnalysisSteps ?? null) ||
      JSON.stringify(nextDefinition.measurementPlan) !==
        JSON.stringify(existing.measurementPlan);

    if (changesMeasurementDefinition) {
      const [existingObservation] = await db
        .select({ id: dataPoints.id })
        .from(dataPoints)
        .where(and(eq(dataPoints.goalId, id), isNull(dataPoints.deletedAt)))
        .limit(1);

      if (existingObservation) {
        const replacementId = crypto.randomUUID();
        const now = new Date();
        const [createdRows] = await db.batch([
          db
            .insert(goals)
            .values({
              id: replacementId,
              ...nextDefinition,
              supersedesGoalId: existing.id,
            })
            .returning(),
          db
            .update(goals)
            .set({ deletedAt: now, updatedAt: now })
            .where(eq(goals.id, existing.id)),
        ]);
        const [replacement] = createdRows;

        await recordAudit({
          actorStaffId: current.id,
          action: "create",
          tableName: "goals",
          recordId: replacement.id,
          diff: { supersedesGoalId: existing.id, ...nextDefinition },
        });
        await recordAudit({
          actorStaffId: current.id,
          action: "soft_delete",
          tableName: "goals",
          recordId: existing.id,
          diff: { replacedByGoalId: replacement.id },
        });

        return NextResponse.json({ goal: replacement, replacedGoalId: existing.id });
      }
    }

    const [updated] = await db
      .update(goals)
      .set({
        ...body,
        iconSet: nextDefinition.iconSet ?? null,
        taskAnalysisSteps: nextDefinition.taskAnalysisSteps ?? null,
        measurementPlan: nextDefinition.measurementPlan,
        updatedAt: new Date(),
      })
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
