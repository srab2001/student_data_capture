import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog, staff } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { handleRoute } from "@/lib/api-helpers";
import { recordAudit } from "@/lib/audit";
import { ADMIN_AUDIT_LIMIT, changedFieldNames } from "@/lib/admin-audit";

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(ADMIN_AUDIT_LIMIT),
}).strict();

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageUsers", "You cannot review audit history.");
    const query = auditQuerySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const rows = await db
      .select({
        id: auditLog.id,
        actorName: staff.name,
        action: auditLog.action,
        tableName: auditLog.tableName,
        recordId: auditLog.recordId,
        at: auditLog.at,
        diff: auditLog.diff,
      })
      .from(auditLog)
      .innerJoin(staff, eq(auditLog.actorStaffId, staff.id))
      .where(eq(staff.classroomId, current.classroomId!))
      .orderBy(desc(auditLog.at))
      .limit(query.limit);

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "audit_log",
    });

    return NextResponse.json({
      entries: rows.map(({ diff, ...row }) => ({
        ...row,
        changedFields: changedFieldNames(diff),
      })),
    });
  });
}
