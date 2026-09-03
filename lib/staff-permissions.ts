import type { CurrentStaff } from "@/lib/auth/session";

export type StaffPermissions = Pick<
  CurrentStaff,
  | "canManageUsers"
  | "canManageStudents"
  | "canManageGoals"
  | "canManageColors"
  | "canRecordData"
  | "canViewReports"
>;

export const STAFF_PERMISSION_KEYS = [
  "canManageUsers",
  "canManageStudents",
  "canManageGoals",
  "canManageColors",
  "canRecordData",
  "canViewReports",
] as const satisfies readonly (keyof StaffPermissions)[];

export const ROLE_PERMISSION_PRESETS: Record<
  CurrentStaff["role"],
  StaffPermissions
> = {
  teacher: {
    canManageUsers: false,
    canManageStudents: true,
    canManageGoals: true,
    canManageColors: false,
    canRecordData: true,
    canViewReports: true,
  },
  aide: {
    canManageUsers: false,
    canManageStudents: false,
    canManageGoals: false,
    canManageColors: false,
    canRecordData: true,
    canViewReports: true,
  },
  admin: {
    canManageUsers: true,
    canManageStudents: true,
    canManageGoals: true,
    canManageColors: true,
    canRecordData: true,
    canViewReports: true,
  },
};

export function permissionColumns(permissions: StaffPermissions) {
  return {
    canManageUsers: permissions.canManageUsers,
    canManageStudents: permissions.canManageStudents,
    canManageGoals: permissions.canManageGoals,
    canManageColors: permissions.canManageColors,
    canRecordData: permissions.canRecordData,
    canViewReports: permissions.canViewReports,
  };
}
