import { NextRequest } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertPermission, requireStaff } from "@/lib/auth/authz";
import { getProgressSummary } from "@/lib/summary";
import { recordAudit } from "@/lib/audit";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import { schoolDateIso } from "@/lib/observations";
import { summaryFilterSchema } from "@/lib/validation";
import { csvEscape } from "@/lib/csv";

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return schoolDateIso(d);
}

/**
 * CSV export for manual transfer into Maryland Online IEP (Phase 4).
 * This tool never writes to Maryland Online IEP or any external
 * system — the teacher copies these numbers in by hand.
 */
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canViewReports", "You cannot export reports.");
    if (!current.classroomId) return jsonError("Not assigned to a classroom.", 403);

    const params = request.nextUrl.searchParams;
    const filters = summaryFilterSchema.parse({
      studentId: params.get("studentId") ?? undefined,
      from: params.get("from") ?? defaultFrom(),
      to: params.get("to") ?? schoolDateIso(),
    });

    const summary = await getProgressSummary(current.classroomId, filters);

    const header = [
      "data_label",
      "student",
      "domain",
      "goal",
      "reporting_period_start",
      "reporting_period_end",
      "current_value",
      "trend",
      "collection_compliance",
      "evidence_depth",
      "aim_status",
      "structured_observations",
      "interventions",
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
            g.collectionEvidence.label,
            g.dataSufficiency.label,
            g.aimStatus.label,
            g.dataPoints
              .flatMap((point) => {
                const details = point.observationDetails;
                if (details?.kind === "abc") {
                  return [
                    `${point.sessionDate} ABC — antecedent: ${details.antecedent}; behavior: ${details.behavior}; consequence: ${details.consequence}`,
                  ];
                }
                if (details?.kind === "rubric") {
                  return [
                    `${point.sessionDate} rubric — ${details.workSample}: ${point.valueNumeric}${g.goal.rubricConfig ? `/${g.goal.rubricConfig.maxScore}` : ""}${details.criterion ? ` (${details.criterion})` : ""}`,
                  ];
                }
                return [];
              })
              .join(" | "),
            g.interventions
              .map((annotation) => `${annotation.interventionDate}: ${annotation.description}`)
              .join(" | "),
          ]
            .map((v) => csvEscape(String(v)))
            .join(",")
        );
      }
      for (const support of s.accommodations.bySupport) {
        lines.push(
          [
            dataLabel,
            s.student.displayName,
            "accommodation",
            `${support.accommodationName}${support.setting ? ` — ${support.setting}` : ""}`,
            summary.rangeFrom,
            summary.rangeTo,
            `Used ${support.usedCount}/${support.logCount}; effectiveness ${support.avgEffectiveness ?? "—"}/5 (n=${support.effectivenessN}); fidelity ${support.avgFidelity ?? "—"}/5 (n=${support.fidelityN})`,
            "Descriptive support data only; no causal conclusion",
            "",
            `${support.logCount} logs; ${support.contextLinkedCount} context linked`,
            "",
            "",
            "",
          ].map((value) => csvEscape(String(value))).join(",")
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
