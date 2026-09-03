import type {
  students,
  goals,
  sessions,
  dataPoints,
  accommodationLogs,
  studentAccommodations,
  staff,
} from "./schema";

export type Student = typeof students.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type DataPoint = typeof dataPoints.$inferSelect;
export type AccommodationLog = typeof accommodationLogs.$inferSelect;
export type StudentAccommodation = typeof studentAccommodations.$inferSelect;
export type Staff = typeof staff.$inferSelect;
