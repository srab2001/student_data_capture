export const ADMIN_AUDIT_LIMIT = 50;

export const AUDIT_TABLE_LABELS: Record<string, string> = {
  goals: "Goal",
  data_points: "Observation",
  accommodation_logs: "Accommodation log",
  students: "Student",
  roster_groups: "Roster group",
  staff_entry_preferences: "Entry preference",
  intervention_annotations: "Intervention note",
  staff: "User",
  classroom_colors: "Color guide",
  student_accommodations: "Student support",
  audit_log: "Audit history",
};

export function auditTableLabel(tableName: string): string {
  return AUDIT_TABLE_LABELS[tableName] ?? tableName.replaceAll("_", " ");
}

export function changedFieldNames(diff: unknown): string[] {
  if (!diff || typeof diff !== "object" || Array.isArray(diff)) return [];
  return Object.keys(diff as Record<string, unknown>)
    .filter((key) => key !== "studentId" && key !== "classroomId")
    .sort();
}
