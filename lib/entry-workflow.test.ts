import { describe, expect, it } from "vitest";
import type { Student } from "@/lib/db/types";
import {
  adjacentStudentId,
  studentsInSelectedGroup,
  type RosterGroupSummary,
} from "@/lib/entry-workflow";

const students = [
  { id: "00000000-0000-4000-8000-000000000001", displayName: "Student A" },
  { id: "00000000-0000-4000-8000-000000000002", displayName: "Student B" },
  { id: "00000000-0000-4000-8000-000000000003", displayName: "Student C" },
] as Student[];

const groups: RosterGroupSummary[] = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    name: "Reading group",
    studentIds: [students[2].id, students[0].id],
  },
];

describe("studentsInSelectedGroup", () => {
  it("preserves classroom roster order when filtering a group", () => {
    expect(
      studentsInSelectedGroup(students, groups, groups[0].id).map(
        (student) => student.displayName
      )
    ).toEqual(["Student A", "Student C"]);
  });

  it("falls back to the full roster for a stale saved group", () => {
    expect(studentsInSelectedGroup(students, groups, "missing")).toEqual(students);
  });
});

describe("adjacentStudentId", () => {
  it("moves forward and wraps at the end", () => {
    expect(adjacentStudentId(students, students[2].id, 1)).toBe(students[0].id);
  });

  it("moves backward and wraps at the beginning", () => {
    expect(adjacentStudentId(students, students[0].id, -1)).toBe(students[2].id);
  });

  it("returns null for an empty roster", () => {
    expect(adjacentStudentId([], null, 1)).toBeNull();
  });
});
