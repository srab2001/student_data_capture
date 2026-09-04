import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { requireStaff, assertPermission } from "@/lib/auth/authz";
import { assertWriteRateLimit, handleRoute, jsonError } from "@/lib/api-helpers";
import { goalWizardRequestSchema } from "@/lib/validation";
import { proposeMeasurementPlan, InvalidAiSuggestionError } from "@/lib/ai/goal-wizard";
import { AiUnavailableError } from "@/lib/ai/client";
import { recordAudit } from "@/lib/audit";

/**
 * Proposes a MeasurementPlan for a teacher to review and save through the
 * existing POST /api/goals — this route never writes to the database
 * itself (STRATEGY-ai-goal-accommodation-assistant.md Phase A1). No
 * student name or ID is ever accepted here, let alone sent to the AI —
 * see lib/ai/redact.ts.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot use the goal wizard.");
    assertWriteRateLimit(current.id, "ai:goal-wizard");

    const body = goalWizardRequestSchema.parse(await request.json());

    await recordAudit({
      actorStaffId: current.id,
      action: "ai_suggest",
      tableName: "goals",
      diff: { requestedFields: Object.keys(body) },
    });

    try {
      const measurementPlan = await proposeMeasurementPlan(body);
      return NextResponse.json({ measurementPlan });
    } catch (err) {
      if (err instanceof AiUnavailableError || err instanceof InvalidAiSuggestionError) {
        return jsonError(
          `${err.message} Continue filling in the measurement plan manually.`,
          502
        );
      }
      throw err;
    }
  });
}
