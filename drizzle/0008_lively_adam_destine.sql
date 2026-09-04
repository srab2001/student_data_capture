CREATE TABLE "session_absences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"entered_by_staff_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "session_absences" ADD CONSTRAINT "session_absences_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_absences" ADD CONSTRAINT "session_absences_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_absences" ADD CONSTRAINT "session_absences_entered_by_staff_id_staff_id_fk" FOREIGN KEY ("entered_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_absences_session_student_unique" ON "session_absences" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "session_absences_student_id_idx" ON "session_absences" USING btree ("student_id");