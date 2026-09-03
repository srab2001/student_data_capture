import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";

const COOKIE_NAME = "iep_pilot_session";

/**
 * Prototype-only sign-in: a signed cookie naming a staff row, chosen from
 * a picker at /login (see app/login). This exists so Phase 2/3 have
 * something to scope authorization against before real auth exists.
 * Phase 5 (Track B, gated) replaces this with HCPSS Google Workspace SSO
 * — see docs/compliance.md. Do not extend this mechanism; replace it.
 */

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is not set — see .env.local.example");
  }
  return value;
}

function sign(staffId: string): string {
  const mac = createHmac("sha256", secret()).update(staffId).digest("hex");
  return `${staffId}.${mac}`;
}

function verify(token: string): string | null {
  const [staffId, mac] = token.split(".");
  if (!staffId || !mac) return null;
  const expected = createHmac("sha256", secret()).update(staffId).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return staffId;
}

export async function setSessionCookie(staffId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, sign(staffId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export type CurrentStaff = {
  id: string;
  name: string;
  email: string;
  role: "teacher" | "aide" | "admin";
  classroomId: string | null;
  accessEnabled: boolean;
  canManageUsers: boolean;
  canManageStudents: boolean;
  canManageGoals: boolean;
  canManageColors: boolean;
  canRecordData: boolean;
  canViewReports: boolean;
};

export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const staffId = verify(token);
  if (!staffId) return null;

  let row;
  try {
    [row] = await db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.id, staffId),
          eq(staff.accessEnabled, true),
          isNull(staff.deletedAt)
        )
      )
      .limit(1);
  } catch (err) {
    // Treat a database/config problem as "signed out" rather than
    // crashing every page that renders the header (components/Header.tsx).
    console.error("getCurrentStaff: database lookup failed", err);
    return null;
  }

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    classroomId: row.classroomId,
    accessEnabled: row.accessEnabled,
    canManageUsers: row.canManageUsers,
    canManageStudents: row.canManageStudents,
    canManageGoals: row.canManageGoals,
    canManageColors: row.canManageColors,
    canRecordData: row.canRecordData,
    canViewReports: row.canViewReports,
  };
}
