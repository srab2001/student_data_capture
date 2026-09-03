CREATE TABLE "roster_group_students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roster_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"classroom_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by_staff_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "entry_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "roster_group_students" ADD CONSTRAINT "roster_group_students_group_id_roster_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."roster_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_group_students" ADD CONSTRAINT "roster_group_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_groups" ADD CONSTRAINT "roster_groups_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_groups" ADD CONSTRAINT "roster_groups_created_by_staff_id_staff_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roster_group_students_group_id_idx" ON "roster_group_students" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "roster_group_students_student_id_idx" ON "roster_group_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "roster_groups_classroom_id_idx" ON "roster_groups" USING btree ("classroom_id");