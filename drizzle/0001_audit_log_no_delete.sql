-- audit_log is append-only. This blocks DELETE at the database level so
-- no application role -- including a future admin role -- can remove an
-- entry, regardless of what the application-layer authorization helper
-- allows. See docs/compliance.md "Access control".
CREATE OR REPLACE FUNCTION audit_log_no_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows cannot be deleted';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "audit_log"
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_no_delete();
