import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthzError } from "@/lib/auth/authz";
import { checkRateLimit } from "@/lib/rate-limit";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Wraps a route handler body so every route gets the same error shape
 * for auth failures, validation failures, and unexpected errors, instead
 * of each route re-implementing try/catch.
 */
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthzError || err instanceof HttpError) {
      return jsonError(err.message, err.status);
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: err.issues },
        { status: 400 }
      );
    }
    console.error(err);
    return jsonError("Unexpected server error.", 500);
  }
}

/** Apply the write-endpoint rate limit for a given staff member. Throws
 * a 429 AuthzError-shaped response when exceeded. */
export function assertWriteRateLimit(staffId: string, routeKey: string) {
  const { ok, retryAfterMs } = checkRateLimit(`${routeKey}:${staffId}`);
  if (!ok) {
    throw new HttpError(
      `Too many requests — retry in ${Math.ceil((retryAfterMs ?? 1000) / 1000)}s.`,
      429
    );
  }
}
