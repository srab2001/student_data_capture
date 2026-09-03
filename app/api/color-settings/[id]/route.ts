import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { classroomColors } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { updateClassroomColorSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  jsonError,
} from "@/lib/api-helpers";

async function loadScopedColor(id: string, classroomId: string) {
  const [color] = await db
    .select()
    .from(classroomColors)
    .where(
      and(
        eq(classroomColors.id, id),
        eq(classroomColors.classroomId, classroomId),
        isNull(classroomColors.deletedAt)
      )
    )
    .limit(1);
  return color ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageColors", "You cannot manage colors.");
    assertWriteRateLimit(current.id, "color-settings:patch");
    const { id: rawId } = await params;
    const id = z.uuid().parse(rawId);
    const body = updateClassroomColorSchema.parse(await request.json());
    const existing = await loadScopedColor(id, current.classroomId!);
    if (!existing) return jsonError("Color not found.", 404);

    if (body.name && body.name !== existing.name) {
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
    }

    const [updated] = await db
      .update(classroomColors)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(classroomColors.id, existing.id))
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "classroom_colors",
      recordId: updated.id,
      diff: body,
    });
    return NextResponse.json({ color: updated });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageColors", "You cannot manage colors.");
    assertWriteRateLimit(current.id, "color-settings:delete");
    const { id: rawId } = await params;
    const id = z.uuid().parse(rawId);
    const existing = await loadScopedColor(id, current.classroomId!);
    if (!existing) return jsonError("Color not found.", 404);

    const now = new Date();
    await db
      .update(classroomColors)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(classroomColors.id, existing.id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "classroom_colors",
      recordId: existing.id,
    });
    return NextResponse.json({ ok: true });
  });
}
