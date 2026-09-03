import type { CurrentStaff } from "@/lib/auth/session";

/**
 * Single shared authorization helper (docs/compliance.md "Access
 * control"). Every route in app/api handles read/write access through
 * these functions rather than inline role checks, so a future
 * case-manager or admin role (caseload- or building-wide scope) can be
 * added here without rewriting every route.
 *
 * Today's rules:
 * - teacher: full access to their own classroom's students only.
 * - aide: same classroom scope as their assigned teacher; can create
 *   entries but not edit or delete another staff member's past entries.
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

export function assertTeacher(current: CurrentStaff) {
  if (current.role !== "teacher") {
    throw new AuthzError("Only teachers can manage roster groups.", 403);
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
  if (current.role === "teacher") return true;
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
