CREATE TYPE "public"."observation_entry_kind" AS ENUM('legacy_snapshot', 'correct_trial', 'incorrect_trial', 'tally', 'duration', 'rating', 'numeric', 'task_step', 'accommodation', 'note');--> statement-breakpoint
ALTER TABLE "data_points" ADD COLUMN "entry_kind" "observation_entry_kind" DEFAULT 'legacy_snapshot' NOT NULL;--> statement-breakpoint
ALTER TABLE "data_points" ADD COLUMN "client_request_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "task_analysis_steps" jsonb;--> statement-breakpoint
UPDATE "goals"
SET "task_analysis_steps" = '["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]'::jsonb
WHERE "metric_type" = 'task_analysis_step' AND "task_analysis_steps" IS NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "supersedes_goal_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_supersedes_goal_id_goals_id_fk" FOREIGN KEY ("supersedes_goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_points_client_request_id_unique" ON "data_points" USING btree ("client_request_id");--> statement-breakpoint
CREATE INDEX "data_points_goal_session_entry_at_idx" ON "data_points" USING btree ("goal_id","session_id","entry_at");--> statement-breakpoint
CREATE INDEX "goals_supersedes_goal_id_idx" ON "goals" USING btree ("supersedes_goal_id");
