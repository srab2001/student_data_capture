ALTER TYPE "public"."metric_type" ADD VALUE 'latency_seconds' BEFORE 'prompt_level';--> statement-breakpoint
ALTER TYPE "public"."metric_type" ADD VALUE 'rubric_score' BEFORE 'prompt_level';--> statement-breakpoint
ALTER TYPE "public"."metric_type" ADD VALUE 'abc_observation' BEFORE 'prompt_level';--> statement-breakpoint
ALTER TYPE "public"."observation_entry_kind" ADD VALUE 'rubric_score' BEFORE 'task_step';--> statement-breakpoint
ALTER TYPE "public"."observation_entry_kind" ADD VALUE 'abc_observation' BEFORE 'task_step';--> statement-breakpoint
ALTER TYPE "public"."staff_role" ADD VALUE 'admin';--> statement-breakpoint
ALTER TYPE "public"."target_frequency" ADD VALUE 'session_based' BEFORE 'weekly';--> statement-breakpoint
ALTER TYPE "public"."target_frequency" ADD VALUE 'quarterly';--> statement-breakpoint
CREATE TABLE "classroom_colors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"classroom_id" uuid NOT NULL,
	"name" text NOT NULL,
	"hex_value" text NOT NULL,
	"hover_comment" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by_staff_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "intervention_annotations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"goal_id" uuid NOT NULL,
	"intervention_date" date NOT NULL,
	"description" text NOT NULL,
	"created_by_staff_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "setting" text;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "activity" text;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "implementation_fidelity" smallint;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD COLUMN "reason_not_used" text;--> statement-breakpoint
ALTER TABLE "data_points" ADD COLUMN "opportunities_observed" integer;--> statement-breakpoint
ALTER TABLE "data_points" ADD COLUMN "observation_duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "data_points" ADD COLUMN "observation_details" jsonb;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "prompt_hierarchy" jsonb;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "rubric_config" jsonb;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "progress_target" jsonb;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "access_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_manage_users" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_manage_students" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_manage_goals" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_manage_colors" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_record_data" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_view_reports" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Preserve the configuration access that active teachers had before explicit
-- capabilities existed. An administrator can narrow these permissions later.
UPDATE "staff"
SET
	"can_manage_users" = true,
	"can_manage_students" = true,
	"can_manage_goals" = true,
	"can_manage_colors" = true
WHERE "role" = 'teacher' AND "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "student_accommodations" ADD COLUMN "setting" text;--> statement-breakpoint
ALTER TABLE "student_accommodations" ADD COLUMN "implementation_notes" text;--> statement-breakpoint
ALTER TABLE "student_accommodations" ADD COLUMN "created_by_staff_id" uuid;--> statement-breakpoint
ALTER TABLE "classroom_colors" ADD CONSTRAINT "classroom_colors_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_colors" ADD CONSTRAINT "classroom_colors_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_annotations" ADD CONSTRAINT "intervention_annotations_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_annotations" ADD CONSTRAINT "intervention_annotations_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classroom_colors_classroom_sort_idx" ON "classroom_colors" USING btree ("classroom_id","sort_order");--> statement-breakpoint
CREATE INDEX "intervention_annotations_goal_date_idx" ON "intervention_annotations" USING btree ("goal_id","intervention_date");--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD CONSTRAINT "accommodation_logs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD CONSTRAINT "accommodation_logs_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_accommodations" ADD CONSTRAINT "student_accommodations_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accommodation_logs_student_entry_idx" ON "accommodation_logs" USING btree ("student_id","entry_at");--> statement-breakpoint
CREATE INDEX "accommodation_logs_session_id_idx" ON "accommodation_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "accommodation_logs_goal_id_idx" ON "accommodation_logs" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "student_accommodations_student_id_idx" ON "student_accommodations" USING btree ("student_id");--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD CONSTRAINT "accommodation_logs_effectiveness_range" CHECK ("accommodation_logs"."effectiveness_rating" IS NULL OR "accommodation_logs"."effectiveness_rating" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "accommodation_logs" ADD CONSTRAINT "accommodation_logs_fidelity_range" CHECK ("accommodation_logs"."implementation_fidelity" IS NULL OR "accommodation_logs"."implementation_fidelity" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "data_points" ADD CONSTRAINT "data_points_opportunities_positive" CHECK ("data_points"."opportunities_observed" IS NULL OR "data_points"."opportunities_observed" > 0);--> statement-breakpoint
ALTER TABLE "data_points" ADD CONSTRAINT "data_points_observation_duration_positive" CHECK ("data_points"."observation_duration_seconds" IS NULL OR "data_points"."observation_duration_seconds" > 0);
