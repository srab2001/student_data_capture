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
ALTER TABLE "goals" ADD COLUMN "progress_target" jsonb;--> statement-breakpoint
ALTER TABLE "intervention_annotations" ADD CONSTRAINT "intervention_annotations_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_annotations" ADD CONSTRAINT "intervention_annotations_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intervention_annotations_goal_date_idx" ON "intervention_annotations" USING btree ("goal_id","intervention_date");