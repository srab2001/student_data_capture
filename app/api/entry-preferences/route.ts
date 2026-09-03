import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { rosterGroups, staff } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertClassroomScope, requireStaff } from "@/lib/auth/authz";
import { entryPreferencesSchema } from "@/lib/validation";
import { DEFAULT_ENTRY_PREFERENCES } from "@/lib/entry-workflow";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  HttpError,
} from "@/lib/api-helpers";

export async function GET() {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const [row] = await db
      .select({ entryPreferences: staff.entryPreferences })
      .from(staff)
      .where(and(eq(staff.id, current.id), isNull(staff.deletedAt)))
      .limit(1);
    const parsed = entryPreferencesSchema.safeParse(row?.entryPreferences);

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "staff_entry_preferences",
      recordId: current.id,
    });

    return NextResponse.json({
      preferences: parsed.success ? parsed.data : DEFAULT_ENTRY_PREFERENCES,
    });
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertWriteRateLimit(current.id, "entry-preferences:put");
    const preferences = entryPreferencesSchema.parse(await request.json());

    if (preferences.selectedGroupId) {
      const [group] = await db
        .select({ classroomId: rosterGroups.classroomId })
        .from(rosterGroups)
        .where(
          and(
            eq(rosterGroups.id, preferences.selectedGroupId),
            isNull(rosterGroups.deletedAt)
          )
        )
        .limit(1);
      if (!group) throw new HttpError("Selected roster group is unavailable.", 400);
      assertClassroomScope(current, group.classroomId);
    }

    const [updated] = await db
      .update(staff)
      .set({ entryPreferences: preferences, updatedAt: new Date() })
      .where(and(eq(staff.id, current.id), isNull(staff.deletedAt)))
      .returning({ entryPreferences: staff.entryPreferences });
    if (!updated) throw new HttpError("Staff member not found.", 404);

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "staff_entry_preferences",
      recordId: current.id,
      diff: preferences,
    });

    return NextResponse.json({ preferences: updated.entryPreferences });
  });
}
