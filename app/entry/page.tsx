import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { canOpenAdmin } from "@/lib/auth/authz";
import { EntryScreen } from "./EntryScreen";

export default async function EntryPage() {
  const current = await getCurrentStaff();
  if (!current) redirect("/login");
  if (!current.canRecordData) {
    if (canOpenAdmin(current)) redirect("/admin");
    if (current.canViewReports) redirect("/summary");
    redirect("/help");
  }

  return (
    <EntryScreen
      currentStaffId={current.id}
      currentStaffName={current.name}
      currentStaffRole={current.role === "aide" ? "aide" : "teacher"}
      canManageStudents={current.canManageStudents}
      canManageGoals={current.canManageGoals}
    />
  );
}
