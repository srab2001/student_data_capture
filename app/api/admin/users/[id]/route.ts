import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { updateStaffSchema } from "@/lib/validation";
import { permissionColumns } from "@/lib/staff-permissions";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  jsonError,
} from "@/lib/api-helpers";

async function loadScopedUser(id: string, classroomId: string) {
  const [user] = await db
    .select()
    .from(staff)
    .where(
      and(
        eq(staff.id, id),
        eq(staff.classroomId, classroomId),
        isNull(staff.deletedAt)
      )
    )
    .limit(1);
  return user ?? null;
}

async function hasAnotherUserManager(classroomId: string, excludedId: string) {
  const [other] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(
      and(
        eq(staff.classroomId, classroomId),
        ne(staff.id, excludedId),
        eq(staff.accessEnabled, true),
        eq(staff.canManageUsers, true),
        isNull(staff.deletedAt)
      )
    )
    .limit(1);
  return !!other;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageUsers", "You cannot manage users.");
    assertWriteRateLimit(current.id, "admin-users:patch");
    const { id: rawId } = await params;
    const id = z.uuid().parse(rawId);
    const body = updateStaffSchema.parse(await request.json());
    const existing = await loadScopedUser(id, current.classroomId!);
    if (!existing) return jsonError("User not found.", 404);

    if (
      id === current.id &&
      (body.accessEnabled === false || body.permissions?.canManageUsers === false)
    ) {
      return jsonError("You cannot remove your own user-management access.", 409);
    }

    const removesManager =
      existing.accessEnabled &&
      existing.canManageUsers &&
      (body.accessEnabled === false || body.permissions?.canManageUsers === false);
    if (
      removesManager &&
      !(await hasAnotherUserManager(current.classroomId!, existing.id))
    ) {
      return jsonError("At least one active user manager is required.", 409);
    }

    if (body.email && body.email !== existing.email) {
      const [duplicate] = await db
        .select({ id: staff.id })
        .from(staff)
        .where(sql`lower(${staff.email}) = ${body.email}`)
        .limit(1);
      if (duplicate) return jsonError("A user with this email already exists.", 409);
    }

    const [updated] = await db
      .update(staff)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.accessEnabled !== undefined
          ? { accessEnabled: body.accessEnabled }
          : {}),
        ...(body.permissions ? permissionColumns(body.permissions) : {}),
        updatedAt: new Date(),
      })
      .where(eq(staff.id, existing.id))
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "staff",
      recordId: updated.id,
      diff: body,
    });

    return NextResponse.json({ user: updated });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageUsers", "You cannot manage users.");
    assertWriteRateLimit(current.id, "admin-users:delete");
    const { id: rawId } = await params;
    const id = z.uuid().parse(rawId);
    const existing = await loadScopedUser(id, current.classroomId!);
    if (!existing) return jsonError("User not found.", 404);
    if (id === current.id) return jsonError("You cannot retire your own user.", 409);

    if (
      existing.accessEnabled &&
      existing.canManageUsers &&
      !(await hasAnotherUserManager(current.classroomId!, existing.id))
    ) {
      return jsonError("At least one active user manager is required.", 409);
    }

    const now = new Date();
    await db
      .update(staff)
      .set({ accessEnabled: false, deletedAt: now, updatedAt: now })
      .where(eq(staff.id, existing.id));

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "staff",
      recordId: existing.id,
    });

    return NextResponse.json({ ok: true });
  });
}
