ALTER TYPE "public"."metric_type" ADD VALUE IF NOT EXISTS 'latency_seconds' BEFORE 'prompt_level';--> statement-breakpoint
ALTER TYPE "public"."metric_type" ADD VALUE IF NOT EXISTS 'rubric_score' BEFORE 'prompt_level';--> statement-breakpoint
ALTER TYPE "public"."metric_type" ADD VALUE IF NOT EXISTS 'abc_observation' BEFORE 'prompt_level';--> statement-breakpoint
ALTER TYPE "public"."observation_entry_kind" ADD VALUE IF NOT EXISTS 'rubric_score' BEFORE 'task_step';--> statement-breakpoint
ALTER TYPE "public"."observation_entry_kind" ADD VALUE IF NOT EXISTS 'abc_observation' BEFORE 'task_step';--> statement-breakpoint
ALTER TYPE "public"."target_frequency" ADD VALUE IF NOT EXISTS 'session_based' BEFORE 'weekly';--> statement-breakpoint
ALTER TYPE "public"."target_frequency" ADD VALUE IF NOT EXISTS 'quarterly';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_accommodations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"name" text NOT NULL,
	"setting" text NOT NULL,
	"implementation_notes" text NOT NULL,
	"created_by_staff_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "data_points" ADD COLUMN IF NOT EXISTS "observation_details" jsonb;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "prompt_hierarchy" jsonb;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "rubric_config" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_accommodations" ADD CONSTRAINT "student_accommodations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_accommodations" ADD CONSTRAINT "student_accommodations_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_accommodations_student_id_idx" ON "student_accommodations" USING btree ("student_id");
