import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/authz";
import { getProgressSummary } from "@/lib/summary";
import { recordAudit } from "@/lib/audit";
import { handleRoute } from "@/lib/api-helpers";

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

/**
 * Read-mostly rollup for PLAAFP prep (Phase 3). Never writes back to
 * Maryland Online IEP or any external system — see Phase 4.
 */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const params = request.nextUrl.searchParams;
    const studentId = params.get("studentId") ?? undefined;
    const from = params.get("from") ?? defaultFrom();
    const to = params.get("to") ?? new Date().toISOString().slice(0, 10);

    const summary = await getProgressSummary(current.classroomId!, { studentId, from, to });

    await recordAudit({ actorStaffId: current.id, action: "read", tableName: "students" });

    return NextResponse.json(summary);
  });
}
