import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { getProgressSummary } from "@/lib/summary";
import { recordAudit } from "@/lib/audit";
import { handleRoute } from "@/lib/api-helpers";
import { schoolDateIso } from "@/lib/observations";
import { summaryFilterSchema } from "@/lib/validation";

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return schoolDateIso(d);
}

/**
 * Read-mostly rollup for PLAAFP prep (Phase 3). Never writes back to
 * Maryland Online IEP or any external system — see Phase 4.
 */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canViewReports", "You cannot view reports.");
    const params = request.nextUrl.searchParams;
    const filters = summaryFilterSchema.parse({
      studentId: params.get("studentId") ?? undefined,
      from: params.get("from") ?? defaultFrom(),
      to: params.get("to") ?? schoolDateIso(),
    });

    const summary = await getProgressSummary(current.classroomId!, filters);

    await recordAudit({ actorStaffId: current.id, action: "read", tableName: "students" });

    return NextResponse.json(summary);
  });
}
