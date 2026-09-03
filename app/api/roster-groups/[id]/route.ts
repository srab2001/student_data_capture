import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, inArray, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { rosterGroups, rosterGroupStudents, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertClassroomScope, assertPermission, requireStaff } from "@/lib/auth/authz";
import { rosterGroupSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  HttpError,
} from "@/lib/api-helpers";

async function activeGroup(id: string, classroomId: string) {
  const validId = z.uuid().parse(id);
  const [group] = await db
    .select()
    .from(rosterGroups)
    .where(
      and(
        eq(rosterGroups.id, validId),
        eq(rosterGroups.classroomId, classroomId),
        isNull(rosterGroups.deletedAt)
      )
    )
    .limit(1);
  if (!group) throw new HttpError("Roster group not found.", 404);
  return group;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageStudents", "You cannot manage roster groups.");
    assertWriteRateLimit(current.id, "roster-groups:put");
    const { id } = await params;
    const group = await activeGroup(id, current.classroomId!);
    const body = rosterGroupSchema.parse(await request.json());

    const matchingStudents = await db
      .select({ id: students.id, classroomId: students.classroomId })
      .from(students)
      .where(and(inArray(students.id, body.studentIds), isNull(students.deletedAt)));
    if (matchingStudents.length !== body.studentIds.length) {
      throw new HttpError("One or more students are unavailable.", 400);
    }
    matchingStudents.forEach((student) =>
      assertClassroomScope(current, student.classroomId)
    );

    const [duplicate] = await db
      .select({ id: rosterGroups.id })
      .from(rosterGroups)
      .where(
        and(
          eq(rosterGroups.classroomId, current.classroomId!),
          ilike(rosterGroups.name, body.name),
          ne(rosterGroups.id, group.id),
          isNull(rosterGroups.deletedAt)
        )
      )
      .limit(1);
    if (duplicate) throw new HttpError("A group with this name already exists.", 409);

    const now = new Date();
    await db.batch([
      db
        .update(rosterGroups)
        .set({ name: body.name, updatedAt: now })
        .where(eq(rosterGroups.id, group.id)),
      db
        .update(rosterGroupStudents)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(rosterGroupStudents.groupId, group.id),
            isNull(rosterGroupStudents.deletedAt)
          )
        ),
      db.insert(rosterGroupStudents).values(
        body.studentIds.map((studentId, position) => ({
          groupId: group.id,
          studentId,
          position,
        }))
      ),
    ]);

    await recordAudit({
      actorStaffId: current.id,
      action: "update",
      tableName: "roster_groups",
      recordId: group.id,
      diff: body,
    });

    return NextResponse.json({
      group: { id: group.id, name: body.name, studentIds: body.studentIds },
    });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertPermission(current, "canManageStudents", "You cannot manage roster groups.");
    assertWriteRateLimit(current.id, "roster-groups:delete");
    const { id } = await params;
    const group = await activeGroup(id, current.classroomId!);

    const now = new Date();
    await db.batch([
      db
        .update(rosterGroups)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(rosterGroups.id, group.id)),
      db
        .update(rosterGroupStudents)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(rosterGroupStudents.groupId, group.id),
            isNull(rosterGroupStudents.deletedAt)
          )
        ),
    ]);

    await recordAudit({
      actorStaffId: current.id,
      action: "soft_delete",
      tableName: "roster_groups",
      recordId: group.id,
    });

    return NextResponse.json({ ok: true });
  });
}
