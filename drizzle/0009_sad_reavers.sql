ALTER TABLE "accommodation_logs" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "setting" text;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "activity" text;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "implementation_fidelity" smallint;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "reason_not_used" text;--> statement-breakpoint
ALTER TABLE "data_points" ADD COLUMN "opportunities_observed" integer;--> statement-breakpoint
ALTER TABLE "data_points" ADD COLUMN "observation_duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD CONSTRAINT "accommodation_logs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD CONSTRAINT "accommodation_logs_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accommodation_logs_student_entry_idx" ON "accommodation_logs" USING btree ("student_id","entry_at");--> statement-breakpoint
CREATE INDEX "accommodation_logs_session_id_idx" ON "accommodation_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "accommodation_logs_goal_id_idx" ON "accommodation_logs" USING btree ("goal_id");