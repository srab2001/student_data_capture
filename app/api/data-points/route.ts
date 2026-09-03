import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { dataPoints, goals, students, sessions } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertClassroomScope, assertPermission, assertStudentDataAccess } from "@/lib/auth/authz";
import { createDataPointSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { handleRoute, assertWriteRateLimit, jsonError } from "@/lib/api-helpers";
import { isObservationCompatible } from "@/lib/observations";
import { ICON_SETS, PROMPT_LEVELS, type IconSetKey } from "@/lib/icon-sets";

/** Scoped list of data points. Optional ?goalId= / ?sessionId= filters. */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertStudentDataAccess(current);
    const goalId = request.nextUrl.searchParams.get("goalId");
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    const rows = await db
      .select({ dataPoint: dataPoints, studentClassroomId: students.classroomId })
      .from(dataPoints)
      .innerJoin(goals, eq(dataPoints.goalId, goals.id))
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(
        and(
          eq(students.classroomId, current.classroomId!),
          isNull(dataPoints.deletedAt),
          goalId ? eq(dataPoints.goalId, goalId) : undefined,
          sessionId ? eq(dataPoints.sessionId, sessionId) : undefined
        )
      )
      .orderBy(asc(dataPoints.entryAt));

    await recordAudit({ actorStaffId: current.id, action: "read", tableName: "data_points" });

    return NextResponse.json({ dataPoints: rows.map((r) => r.dataPoint) });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canRecordData", "You cannot record observations.");
    assertWriteRateLimit(current.id, "data-points:post");
    const body = createDataPointSchema.parse(await request.json());

    // Resolve an idempotent retry before checking the current goal state. The
    // original response may have been lost just before a goal was versioned.
    const [duplicate] = await db
      .select({ dataPoint: dataPoints, studentClassroomId: students.classroomId })
      .from(dataPoints)
      .innerJoin(goals, eq(dataPoints.goalId, goals.id))
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(eq(dataPoints.clientRequestId, body.clientRequestId))
      .limit(1);

    if (duplicate) {
      assertClassroomScope(current, duplicate.studentClassroomId);
      return NextResponse.json({ dataPoint: duplicate.dataPoint });
    }

    const [goalRow] = await db
      .select({
        metricType: goals.metricType,
        iconSet: goals.iconSet,
        taskAnalysisSteps: goals.taskAnalysisSteps,
        promptHierarchy: goals.promptHierarchy,
        rubricConfig: goals.rubricConfig,
        studentClassroomId: students.classroomId,
      })
      .from(goals)
      .innerJoin(students, eq(goals.studentId, students.id))
      .where(and(eq(goals.id, body.goalId), isNull(goals.deletedAt)))
      .limit(1);
    if (!goalRow) return jsonError("Unknown goal.", 404);
    assertClassroomScope(current, goalRow.studentClassroomId);

    if (!isObservationCompatible(goalRow.metricType, body.entryKind)) {
      return jsonError(
        `Observation type ${body.entryKind} is not valid for ${goalRow.metricType}.`,
        400
      );
    }
    if (
      goalRow.metricType === "frequency_count" &&
      body.entryKind === "observation_complete" &&
      body.opportunitiesObserved === undefined &&
      body.observationDurationSeconds === undefined
    ) {
      return jsonError(
        "Enter the actual observation duration or number of opportunities before completing the frequency window.",
        400
      );
    }
    if (
      goalRow.metricType === "prompt_level" &&
      !(goalRow.promptHierarchy?.length
        ? goalRow.promptHierarchy.includes(body.valueEnum ?? "")
        : PROMPT_LEVELS.some((level) => level.value === body.valueEnum))
    ) {
      return jsonError("Unknown prompt-level value.", 400);
    }
    if (goalRow.metricType === "icon_scale") {
      const iconSet = (goalRow.iconSet ?? "smiley_5") as IconSetKey;
      if (!ICON_SETS[iconSet].some((option) => option.value === body.valueEnum)) {
        return jsonError("Unknown icon-scale value.", 400);
      }
    }
    if (
      goalRow.metricType === "accommodation_used" &&
      body.valueEnum !== "used" &&
      body.valueEnum !== "not_used"
    ) {
      return jsonError("Accommodation value must be used or not_used.", 400);
    }
    if (
      goalRow.metricType === "task_analysis_step" &&
      body.valueNumeric !== undefined &&
      body.valueNumeric > (goalRow.taskAnalysisSteps?.length ?? 0)
    ) {
      return jsonError("Task-analysis step is outside this goal's configured steps.", 400);
    }
    if (
      goalRow.metricType === "rubric_score" &&
      body.valueNumeric !== undefined &&
      body.valueNumeric > (goalRow.rubricConfig?.maxScore ?? 0)
    ) {
      return jsonError("Rubric score exceeds this goal's configured maximum.", 400);
    }
    if (
      goalRow.metricType === "rubric_score" &&
      body.observationDetails?.kind === "rubric" &&
      body.observationDetails.criterion !== null &&
      !goalRow.rubricConfig?.criteria.includes(body.observationDetails.criterion)
    ) {
      return jsonError("Unknown rubric criterion.", 400);
    }

    const [sessionRow] = await db
      .select({ classroomId: sessions.classroomId })
      .from(sessions)
      .where(and(eq(sessions.id, body.sessionId), isNull(sessions.deletedAt)))
      .limit(1);
    if (!sessionRow) return jsonError("Unknown session.", 404);
    assertClassroomScope(current, sessionRow.classroomId);

    const [created] = await db
      .insert(dataPoints)
      .values({ ...body, enteredByStaffId: current.id })
      .onConflictDoNothing({ target: dataPoints.clientRequestId })
      .returning();

    if (!created) {
      const [concurrentDuplicate] = await db
        .select({ dataPoint: dataPoints, studentClassroomId: students.classroomId })
        .from(dataPoints)
        .innerJoin(goals, eq(dataPoints.goalId, goals.id))
        .innerJoin(students, eq(goals.studentId, students.id))
        .where(eq(dataPoints.clientRequestId, body.clientRequestId))
        .limit(1);
      if (!concurrentDuplicate) return jsonError("Observation could not be saved.", 409);
      assertClassroomScope(current, concurrentDuplicate.studentClassroomId);
      return NextResponse.json({ dataPoint: concurrentDuplicate.dataPoint });
    }

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "data_points",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json({ dataPoint: created }, { status: 201 });
  });
}
