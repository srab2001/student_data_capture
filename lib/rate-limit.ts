/**
 * Best-effort rate limiting for write endpoints.
 *
 * This is an in-memory token bucket, which is honest but limited on
 * Vercel's serverless functions: each cold instance starts a fresh
 * bucket, and traffic isn't guaranteed to hit the same instance twice.
 * It still catches a runaway client (e.g. a buggy retry loop) hitting a
 * single warm instance. If this app ever needs real cross-instance rate
 * limiting, replace this with a shared store (Vercel KV / Upstash
 * Redis) — do not treat this module as sufficient on its own.
 */

const WINDOW_MS = 10_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const buckets = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(key: string): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, retryAfterMs: WINDOW_MS - (now - bucket.windowStart) };
  }

  bucket.count += 1;
  return { ok: true };
}
