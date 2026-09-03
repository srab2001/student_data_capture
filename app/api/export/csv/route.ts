import { NextRequest } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/authz";
import { getProgressSummary } from "@/lib/summary";
import { recordAudit } from "@/lib/audit";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import { schoolDateIso } from "@/lib/observations";

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return schoolDateIso(d);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * CSV export for manual transfer into Maryland Online IEP (Phase 4).
 * This tool never writes to Maryland Online IEP or any external
 * system — the teacher copies these numbers in by hand.
 */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    if (!current.classroomId) return jsonError("Not assigned to a classroom.", 403);

    const params = request.nextUrl.searchParams;
    const studentId = params.get("studentId") ?? undefined;
    const from = params.get("from") ?? defaultFrom();
    const to = params.get("to") ?? schoolDateIso();

    const summary = await getProgressSummary(current.classroomId, { studentId, from, to });

    const header = [
      "data_label",
      "student",
      "domain",
      "goal",
      "reporting_period_start",
      "reporting_period_end",
      "current_value",
      "trend",
    ];
    const lines = [header.join(",")];

    for (const s of summary.students) {
      const dataLabel = s.student.isSynthetic ? "SYNTHETIC" : "REAL";
      for (const g of s.goals) {
        lines.push(
          [
            dataLabel,
            s.student.displayName,
            g.goal.domain,
            g.goal.goalText,
            summary.rangeFrom,
            summary.rangeTo,
            g.currentValueLabel,
            g.trendLabel,
          ]
            .map((v) => csvEscape(String(v)))
            .join(",")
        );
      }
    }

    await recordAudit({ actorStaffId: current.id, action: "read", tableName: "students" });

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="iep-progress-${summary.rangeFrom}-to-${summary.rangeTo}.csv"`,
      },
    });
  });
}
