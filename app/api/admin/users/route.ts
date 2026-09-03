import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { createStaffSchema } from "@/lib/validation";
import { permissionColumns } from "@/lib/staff-permissions";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  jsonError,
} from "@/lib/api-helpers";

export async function GET() {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageUsers", "You cannot manage users.");

    const users = await db
      .select()
      .from(staff)
      .where(
        and(eq(staff.classroomId, current.classroomId!), isNull(staff.deletedAt))
      )
      .orderBy(asc(staff.name));

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "staff",
    });

    return NextResponse.json({ users });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageUsers", "You cannot manage users.");
    assertWriteRateLimit(current.id, "admin-users:post");
    const body = createStaffSchema.parse(await request.json());

    const [duplicate] = await db
      .select({ id: staff.id })
      .from(staff)
      .where(sql`lower(${staff.email}) = ${body.email}`)
      .limit(1);
    if (duplicate) return jsonError("A user with this email already exists.", 409);

    const [created] = await db
      .insert(staff)
      .values({
        name: body.name,
        email: body.email,
        role: body.role,
        classroomId: current.classroomId!,
        accessEnabled: body.accessEnabled,
        ...permissionColumns(body.permissions),
      })
      .returning();

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "staff",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json({ user: created }, { status: 201 });
  });
}
