import type { CurrentStaff } from "@/lib/auth/session";

/**
 * Single shared authorization helper (docs/compliance.md "Access
 * control"). Every route in app/api handles read/write access through
 * these functions rather than inline role checks, so a future
 * future caseload- or building-wide scope can be added here without
 * rewriting every route.
 *
 * Today's rules are capability-based within one classroom. Role names provide
 * presets and context, while the explicit capability fields on CurrentStaff
 * are the source of truth for configurable access.
 */

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function requireStaff(current: CurrentStaff | null): CurrentStaff {
  if (!current) {
    throw new AuthzError("Not signed in.", 401);
  }
  if (!current.classroomId) {
    throw new AuthzError("Staff member is not assigned to a classroom yet.", 403);
  }
  return current;
}

type StaffPermission =
  | "canManageUsers"
  | "canManageStudents"
  | "canManageGoals"
  | "canManageColors"
  | "canRecordData"
  | "canViewReports";

export function assertPermission(
  current: CurrentStaff,
  permission: StaffPermission,
  message = "You do not have permission to perform this action."
) {
  if (!current[permission]) {
    throw new AuthzError(message, 403);
  }
}

export function canOpenAdmin(current: CurrentStaff): boolean {
  return (
    current.canManageUsers ||
    current.canManageStudents ||
    current.canManageGoals ||
    current.canManageColors
  );
}

export function assertStudentDataAccess(current: CurrentStaff) {
  if (
    !current.canRecordData &&
    !current.canViewReports &&
    !current.canManageStudents &&
    !current.canManageGoals
  ) {
    throw new AuthzError("You do not have access to student data.", 403);
  }
}

/** Can this staff member see/act within this classroom at all? */
export function assertClassroomScope(current: CurrentStaff, classroomId: string) {
  if (current.classroomId !== classroomId) {
    throw new AuthzError("Not authorized for this classroom.", 403);
  }
}

/**
 * Can this staff member modify (update/soft-delete) a record entered by
 * `enteredByStaffId`? Teachers can modify anything in their classroom;
 * aides can only modify their own past entries.
 */
export function canModifyEntry(current: CurrentStaff, enteredByStaffId: string): boolean {
  if (current.role === "teacher" || current.role === "admin") return true;
  return current.id === enteredByStaffId;
}

export function assertCanModifyEntry(current: CurrentStaff, enteredByStaffId: string) {
  if (!canModifyEntry(current, enteredByStaffId)) {
    throw new AuthzError(
      "Aides cannot edit or delete another staff member's entries.",
      403
    );
  }
}
