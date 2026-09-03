ALTER TYPE "public"."staff_role" ADD VALUE 'admin';--> statement-breakpoint
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
ALTER TABLE "staff" ADD COLUMN "access_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_manage_users" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_manage_students" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_manage_goals" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_manage_colors" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_record_data" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "can_view_reports" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Preserve the configuration access existing teachers already had and give
-- each established classroom a safe initial manager for the new user/color
-- settings. An administrator can later narrow these explicit permissions.
UPDATE "staff"
SET
	"can_manage_users" = true,
	"can_manage_students" = true,
	"can_manage_goals" = true,
	"can_manage_colors" = true
WHERE "role" = 'teacher' AND "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "classroom_colors" ADD CONSTRAINT "classroom_colors_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_colors" ADD CONSTRAINT "classroom_colors_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classroom_colors_classroom_sort_idx" ON "classroom_colors" USING btree ("classroom_id","sort_order");
