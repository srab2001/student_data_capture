import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { SummaryView } from "./SummaryView";

export default async function SummaryPage() {
  const current = await getCurrentStaff();
  if (!current) redirect("/login");
  if (!current.canViewReports) redirect("/");

  return <SummaryView canManageInterventions={current.canManageGoals} />;
}
