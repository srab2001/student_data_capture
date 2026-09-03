import { describe, expect, it } from "vitest";
import {
  assertPermission,
  assertStudentDataAccess,
  canOpenAdmin,
} from "@/lib/auth/authz";
import type { CurrentStaff } from "@/lib/auth/session";
import { ROLE_PERMISSION_PRESETS } from "@/lib/staff-permissions";
import { auditTableLabel, changedFieldNames } from "@/lib/admin-audit";
import {
  classroomColorSchema,
  createStaffSchema,
  updateStaffSchema,
} from "@/lib/validation";

function current(overrides: Partial<CurrentStaff> = {}): CurrentStaff {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Synthetic Staff",
    email: "synthetic.staff@example.invalid",
    role: "aide",
    classroomId: "00000000-0000-4000-8000-000000000002",
    accessEnabled: true,
    ...ROLE_PERMISSION_PRESETS.aide,
    ...overrides,
  };
}

describe("admin authorization", () => {
  it("opens the admin console only for a configuration capability", () => {
    expect(canOpenAdmin(current())).toBe(false);
    expect(canOpenAdmin(current({ canManageColors: true }))).toBe(true);
  });

  it("enforces each explicit capability independently of role label", () => {
    const teacherWithoutGoalAccess = current({ role: "teacher", canManageGoals: false });
    expect(() => assertPermission(teacherWithoutGoalAccess, "canManageGoals")).toThrow();
    expect(() =>
      assertPermission(current({ role: "aide", canManageGoals: true }), "canManageGoals")
    ).not.toThrow();
  });

  it("denies student reads when every student-data capability is off", () => {
    const userManagerOnly = current({
      canManageUsers: true,
      canRecordData: false,
      canViewReports: false,
    });
    expect(() => assertStudentDataAccess(userManagerOnly)).toThrow();
    expect(() =>
      assertStudentDataAccess(current({ canRecordData: false, canViewReports: true }))
    ).not.toThrow();
  });

  it("gives the admin preset all six capabilities", () => {
    expect(Object.values(ROLE_PERMISSION_PRESETS.admin).every(Boolean)).toBe(true);
  });
});

describe("admin validation", () => {
  it("normalizes a valid user email and requires a complete permission set", () => {
    const parsed = createStaffSchema.parse({
      name: "Synthetic Administrator",
      email: " ADMIN@EXAMPLE.INVALID ",
      role: "admin",
      accessEnabled: true,
      permissions: ROLE_PERMISSION_PRESETS.admin,
    });
    expect(parsed.email).toBe("admin@example.invalid");

    expect(
      createStaffSchema.safeParse({
        name: "Incomplete",
        email: "incomplete@example.invalid",
        role: "teacher",
        accessEnabled: true,
        permissions: { canManageGoals: true },
      }).success
    ).toBe(false);
  });

  it("rejects an empty user update", () => {
    expect(updateStaffSchema.safeParse({}).success).toBe(false);
  });

  it("normalizes six-digit colors and requires an explanation", () => {
    expect(
      classroomColorSchema.parse({
        name: "Ready",
        hexValue: "#2f855a",
        hoverComment: "Ready to continue independently.",
        sortOrder: 1,
      }).hexValue
    ).toBe("#2F855A");

    expect(
      classroomColorSchema.safeParse({
        name: "Unknown",
        hexValue: "green",
        hoverComment: "",
        sortOrder: 0,
      }).success
    ).toBe(false);
  });
});

describe("admin audit summaries", () => {
  it("exposes field names without returning field values", () => {
    expect(
      changedFieldNames({
        studentId: "hidden-scope-id",
        email: "private@example.invalid",
        permissions: { canManageUsers: true },
      })
    ).toEqual(["email", "permissions"]);
    expect(changedFieldNames("not an object")).toEqual([]);
  });

  it("uses readable labels with a safe fallback", () => {
    expect(auditTableLabel("student_accommodations")).toBe("Student support");
    expect(auditTableLabel("future_table")).toBe("future table");
  });
});
