import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { setSessionCookie } from "@/lib/auth/session";
import { handleRoute, jsonError } from "@/lib/api-helpers";

const bodySchema = z.object({ staffId: z.uuid() }).strict();

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = bodySchema.parse(await request.json());

    const [row] = await db
      .select({ id: staff.id })
      .from(staff)
      .where(
        and(
          eq(staff.id, body.staffId),
          eq(staff.accessEnabled, true),
          isNull(staff.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      return jsonError("Unknown staff member.", 404);
    }

    await setSessionCookie(row.id);
    return NextResponse.json({ ok: true });
  });
}
