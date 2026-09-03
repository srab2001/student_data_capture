import type {
  students,
  goals,
  sessions,
  dataPoints,
  accommodationLogs,
  staff,
  rosterGroups,
  rosterGroupStudents,
} from "./schema";

export type Student = typeof students.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type DataPoint = typeof dataPoints.$inferSelect;
export type AccommodationLog = typeof accommodationLogs.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type RosterGroup = typeof rosterGroups.$inferSelect;
export type RosterGroupStudent = typeof rosterGroupStudents.$inferSelect;
