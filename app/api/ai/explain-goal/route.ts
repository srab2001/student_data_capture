import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertStudentDataAccess } from "@/lib/auth/authz";
import { assertWriteRateLimit, handleRoute, jsonError } from "@/lib/api-helpers";
import { explainGoalRequestSchema } from "@/lib/validation";
import { explainGoalItem, InvalidAiSuggestionError } from "@/lib/ai/explain-goal";
import { AiUnavailableError } from "@/lib/ai/client";
import { recordAudit } from "@/lib/audit";

/**
 * Read-only "explain this goal" helper for the entry and summary screens.
 * Never writes to the database — only domain/metricType/goalText/
 * measurementPlan are ever sent to the AI, never a student name or ID
 * (see lib/ai/redact.ts). Available to anyone who can see the goal at
 * all (recording data, viewing reports, or managing it), not just staff
 * who can manage goals.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertStudentDataAccess(current);
    assertWriteRateLimit(current.id, "ai:explain-goal");

    const body = explainGoalRequestSchema.parse(await request.json());

    await recordAudit({
      actorStaffId: current.id,
      action: "ai_suggest",
      tableName: "goals",
      diff: { requestedFields: Object.keys(body) },
    });

    try {
      const explanation = await explainGoalItem({
        domain: body.domain,
        metricType: body.metricType,
        goalText: body.goalText,
        measurementPlan: body.measurementPlan ?? null,
      });
      return NextResponse.json({ explanation });
    } catch (err) {
      if (err instanceof AiUnavailableError || err instanceof InvalidAiSuggestionError) {
        return jsonError(err.message, 502);
      }
      throw err;
    }
  });
}
