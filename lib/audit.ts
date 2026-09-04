import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

/**
 * Structured audit logging for every read and write to student data and
 * classroom workflow configuration (docs/compliance.md "Access
 * control"). audit_log is append-only at the database level — see the
 * no-delete trigger in drizzle/0001_audit_log_no_delete.sql — so this is
 * the only way rows are ever added, never removed.
 *
 * "ai_suggest" records that a teacher asked the goal wizard or
 * accommodation chat for help. Its `diff` must only ever record which
 * fields were requested (see the AI routes under app/api/ai/), never the
 * AI's response content or the request payload sent to it — logging that
 * would duplicate student-adjacent detail in a table this app has
 * otherwise kept free of it.
 */
export async function recordAudit(entry: {
  actorStaffId: string | null;
  action: "create" | "read" | "update" | "soft_delete" | "ai_suggest";
  tableName:
    | "goals"
    | "data_points"
    | "accommodation_logs"
    | "students"
    | "student_accommodations"
    | "session_absences"
    | "roster_groups"
    | "staff_entry_preferences"
    | "intervention_annotations"
    | "staff"
    | "classroom_colors"
    | "audit_log";
  recordId?: string;
  diff?: unknown;
}) {
  await db.insert(auditLog).values({
    actorStaffId: entry.actorStaffId,
    action: entry.action,
    tableName: entry.tableName,
    recordId: entry.recordId,
    diff: entry.diff ?? null,
  });
}
