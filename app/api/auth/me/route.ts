import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { handleRoute } from "@/lib/api-helpers";

export async function GET() {
  return handleRoute(async () => {
    const staff = await getCurrentStaff();
    return NextResponse.json({ staff });
  });
}
