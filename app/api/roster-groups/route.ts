import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { rosterGroups, rosterGroupStudents, students } from "@/lib/db/schema";
import { getCurrentStaff } from "@/lib/auth/session";
import { assertClassroomScope, assertTeacher, requireStaff } from "@/lib/auth/authz";
import { rosterGroupSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import {
  assertWriteRateLimit,
  handleRoute,
  HttpError,
} from "@/lib/api-helpers";

export async function GET() {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    const groupRows = await db
      .select()
      .from(rosterGroups)
      .where(
        and(
          eq(rosterGroups.classroomId, current.classroomId!),
          isNull(rosterGroups.deletedAt)
        )
      )
      .orderBy(asc(rosterGroups.name));

    const memberships =
      groupRows.length === 0
        ? []
        : await db
            .select({
              groupId: rosterGroupStudents.groupId,
              studentId: rosterGroupStudents.studentId,
            })
            .from(rosterGroupStudents)
            .innerJoin(students, eq(rosterGroupStudents.studentId, students.id))
            .where(
              and(
                inArray(
                  rosterGroupStudents.groupId,
                  groupRows.map((group) => group.id)
                ),
                isNull(rosterGroupStudents.deletedAt),
                eq(students.classroomId, current.classroomId!),
                isNull(students.deletedAt)
              )
            )
            .orderBy(asc(rosterGroupStudents.position));

    await recordAudit({
      actorStaffId: current.id,
      action: "read",
      tableName: "roster_groups",
    });

    return NextResponse.json({
      groups: groupRows.map((group) => ({
        id: group.id,
        name: group.name,
        studentIds: memberships
          .filter((membership) => membership.groupId === group.id)
          .map((membership) => membership.studentId),
      })),
    });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const current = requireStaff(await getCurrentStaff());
    assertTeacher(current);
    assertWriteRateLimit(current.id, "roster-groups:post");
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
          isNull(rosterGroups.deletedAt)
        )
      )
      .limit(1);
    if (duplicate) throw new HttpError("A group with this name already exists.", 409);

    const groupId = crypto.randomUUID();
    const [createdRows] = await db.batch([
      db
        .insert(rosterGroups)
        .values({
          id: groupId,
          classroomId: current.classroomId!,
          name: body.name,
          createdByStaffId: current.id,
        })
        .returning(),
      db.insert(rosterGroupStudents).values(
        body.studentIds.map((studentId, position) => ({
          groupId,
          studentId,
          position,
        }))
      ),
    ]);
    const [created] = createdRows;

    await recordAudit({
      actorStaffId: current.id,
      action: "create",
      tableName: "roster_groups",
      recordId: created.id,
      diff: body,
    });

    return NextResponse.json(
      { group: { id: created.id, name: created.name, studentIds: body.studentIds } },
      { status: 201 }
    );
  });
}
