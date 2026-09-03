import type { Student } from "@/lib/db/types";

export const entryLayoutValues = ["cards", "grid", "accordion"] as const;
export type EntryLayout = (typeof entryLayoutValues)[number];

export const workflowModeValues = ["roster", "focus", "timers"] as const;
export type WorkflowMode = (typeof workflowModeValues)[number];

export type EntryPreferences = {
  layout: EntryLayout;
  workflowMode: WorkflowMode;
  selectedGroupId: string | null;
};

export type RosterGroupSummary = {
  id: string;
  name: string;
  studentIds: string[];
};

export const DEFAULT_ENTRY_PREFERENCES: EntryPreferences = {
  layout: "cards",
  workflowMode: "roster",
  selectedGroupId: null,
};

export function studentsInSelectedGroup(
  students: Student[],
  groups: RosterGroupSummary[],
  selectedGroupId: string | null
): Student[] {
  if (!selectedGroupId) return students;
  const selected = groups.find((group) => group.id === selectedGroupId);
  if (!selected) return students;
  const memberIds = new Set(selected.studentIds);
  return students.filter((student) => memberIds.has(student.id));
}

export function adjacentStudentId(
  students: Student[],
  currentStudentId: string | null,
  direction: -1 | 1
): string | null {
  if (students.length === 0) return null;
  const currentIndex = students.findIndex((student) => student.id === currentStudentId);
  const startIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = (startIndex + direction + students.length) % students.length;
  return students[nextIndex].id;
}
