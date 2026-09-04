import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { accommodationLogs, studentAccommodations, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertClassroomScope, assertPermission, requireStaff } from "@/lib/auth/authz";
import { assertWriteRateLimit, handleRoute, jsonError } from "@/lib/api-helpers";
import { accommodationChatRequestSchema } from "@/lib/validation";
import { continueAccommodationChat, InvalidAiSuggestionError } from "@/lib/ai/accommodation-chat";
import { AiUnavailableError } from "@/lib/ai/client";
import { recordAudit } from "@/lib/audit";

/**
 * A bounded (max 5-exchange) chat that proposes one concrete accommodation
 * for a teacher to review and save through the existing
 * POST /api/student-accommodations — this route never writes to the
 * database itself (STRATEGY-ai-goal-accommodation-assistant.md Phase A3).
 * The student's own name/ID and narrative implementation notes never
 * leave this route — only structured, aggregated signals do; see
 * lib/ai/redact.ts.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageGoals", "You cannot use the accommodation chat.");
    assertWriteRateLimit(current.id, "ai:accommodation-chat");

    const body = accommodationChatRequestSchema.parse(await request.json());

    const [student] = await db
      .select({ classroomId: students.classroomId })
      .from(students)
      .where(and(eq(students.id, body.studentId), isNull(students.deletedAt)))
      .limit(1);
    if (!student) return jsonError("Unknown student.", 404);
    assertClassroomScope(current, student.classroomId);

    const activeAccommodations = await db
      .select({ name: studentAccommodations.name, setting: studentAccommodations.setting })
      .from(studentAccommodations)
      .where(
        and(
          eq(studentAccommodations.studentId, body.studentId),
          isNull(studentAccommodations.deletedAt)
        )
      );

    const ratingRows = await db
      .select({
        accommodationName: accommodationLogs.accommodationName,
        effectivenessRating: accommodationLogs.effectivenessRating,
      })
      .from(accommodationLogs)
      .where(
        and(
          eq(accommodationLogs.studentId, body.studentId),
          isNotNull(accommodationLogs.effectivenessRating)
        )
      );

    const ratingsByName = new Map<string, number[]>();
    for (const row of ratingRows) {
      if (row.effectivenessRating == null) continue;
      const ratings = ratingsByName.get(row.accommodationName) ?? [];
      ratings.push(row.effectivenessRating);
      ratingsByName.set(row.accommodationName, ratings);
    }

    const existingAccommodations = activeAccommodations.map((accommodation) => ({
      name: accommodation.name,
      setting: accommodation.setting,
      effectivenessRatings: ratingsByName.get(accommodation.name) ?? [],
    }));

    await recordAudit({
      actorStaffId: current.id,
      action: "ai_suggest",
      tableName: "student_accommodations",
      diff: { turn: body.messages.filter((m) => m.role === "user").length },
    });

    try {
      const turn = await continueAccommodationChat(
        { domain: body.domain, existingAccommodations },
        body.messages
      );
      return NextResponse.json({ turn });
    } catch (err) {
      if (err instanceof AiUnavailableError || err instanceof InvalidAiSuggestionError) {
        return jsonError(
          `${err.message} Continue choosing an accommodation manually.`,
          502
        );
      }
      throw err;
    }
  });
}
