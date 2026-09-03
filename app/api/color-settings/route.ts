import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { classroomColors } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { classroomColorSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  jsonError,
} from "@/lib/api-helpers";

export async function GET() {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const colors = await db
      .select()
      .from(classroomColors)
      .where(
        and(
          eq(classroomColors.classroomId, current.classroomId!),
          isNull(classroomColors.deletedAt)
        )
      )
      .orderBy(asc(classroomColors.sortOrder), asc(classroomColors.name));

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "classroom_colors",
    });
    return NextResponse.json({ colors });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageColors", "You cannot manage colors.");
    assertWriteRateLimit(current.id, "color-settings:post");
    const body = classroomColorSchema.parse(await request.json());

    const [duplicate] = await db
      .select({ id: classroomColors.id })
      .from(classroomColors)
      .where(
        and(
          eq(classroomColors.classroomId, current.classroomId!),
          sql`lower(${classroomColors.name}) = lower(${body.name})`,
          isNull(classroomColors.deletedAt)
        )
      )
      .limit(1);
    if (duplicate) return jsonError("That color name is already in use.", 409);

    const [created] = await db
      .insert(classroomColors)
      .values({
        ...body,
        classroomId: current.classroomId!,
        createdByStaffId: current.id,
      })
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "classroom_colors",
      recordId: created.id,
      diff: body,
    });
    return NextResponse.json({ color: created }, { status: 201 });
  });
}
