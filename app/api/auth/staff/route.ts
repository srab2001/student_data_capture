import { NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { handleRoute } from "@/lib/api-helpers";

/**
 * Lists staff for the prototype sign-in picker (app/login). Deliberately
 * unauthenticated — it's the pre-login step. This entire mechanism is
 * replaced by Google Workspace SSO in Phase 5 (Track B, gated); see
 * lib/auth/session.ts.
 */
export async function GET() {
  return handleRoute(async () => {
    const rows = await db
      .select({ id: staff.id, name: staff.name, role: staff.role })
      .from(staff)
      .where(isNull(staff.deletedAt));
    return NextResponse.json({ staff: rows });
  });
}
