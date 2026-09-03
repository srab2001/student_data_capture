import type {
  students,
  goals,
  sessions,
  dataPoints,
  accommodationLogs,
  staff,
  rosterGroups,
  rosterGroupStudents,
  interventionAnnotations,
  classroomColors,
  studentAccommodations,
} from "./schema";

export type Student = typeof students.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type DataPoint = typeof dataPoints.$inferSelect;
export type AccommodationLog = typeof accommodationLogs.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type RosterGroup = typeof rosterGroups.$inferSelect;
export type RosterGroupStudent = typeof rosterGroupStudents.$inferSelect;
export type InterventionAnnotation = typeof interventionAnnotations.$inferSelect;
export type ClassroomColor = typeof classroomColors.$inferSelect;
export type StudentAccommodation = typeof studentAccommodations.$inferSelect;
