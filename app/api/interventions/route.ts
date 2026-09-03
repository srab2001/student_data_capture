import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  goals,
  interventionAnnotations,
  students,
} from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, assertStudentDataAccess, requireStaff } from "@/lib/auth/authz";
import { interventionAnnotationSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  HttpError,
} from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertStudentDataAccess(current);
    const rawGoalId = request.nextUrl.searchParams.get("goalId");
    const goalId = rawGoalId ? z.uuid().parse(rawGoalId) : undefined;

    const rows = await db
      .select({ annotation: interventionAnnotations })
      .from(interventionAnnotations)
      .innerJoin(goals, eq(interventionAnnotations.goalId, goals.id))
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(
        and(
          eq(students.classroomId, current.classroomId!),
          isNull(students.deletedAt),
          isNull(interventionAnnotations.deletedAt),
          goalId ? eq(interventionAnnotations.goalId, goalId) : undefined
        )
      )
      .orderBy(asc(interventionAnnotations.interventionDate));

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "intervention_annotations",
    });

    return NextResponse.json({ interventions: rows.map((row) => row.annotation) });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot add intervention annotations.");
    assertWriteRateLimit(current.id, "interventions:post");
    const body = interventionAnnotationSchema.parse(await request.json());

    const [goal] = await db
      .select({ id: goals.id })
      .from(goals)
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(
        and(
          eq(goals.id, body.goalId),
          eq(students.classroomId, current.classroomId!),
          isNull(goals.deletedAt),
          isNull(students.deletedAt)
        )
      )
      .limit(1);
    if (!goal) throw new HttpError("Goal not found.", 404);

    const [created] = await db
      .insert(interventionAnnotations)
      .values({ ...body, createdByStaffId: current.id })
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "intervention_annotations",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json({ intervention: created }, { status: 201 });
  });
}
