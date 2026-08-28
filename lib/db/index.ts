import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

// Lazy on purpose: this module is imported by lib/auth/session.ts, which
// every page pulls in through components/Header.tsx. Throwing here at
// import time (rather than at first actual query) would take down pages
// that never touch the database — like the signed-out home page — the
// moment DATABASE_URL is unset, e.g. before Vercel env vars are configured.
function getDb(): Db {
  if (cached) return cached;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local and " +
        "fill in your Neon dev connection string — see docs/compliance.md."
    );
  }
  cached = drizzle(neon(process.env.DATABASE_URL), { schema });
  return cached;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
