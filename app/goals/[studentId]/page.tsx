import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { GoalsManager } from "./GoalsManager";

export default async function GoalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ goalId?: string }>;
}) {
  const current = await getCurrentStaff();
  if (!current) redirect("/login");
  if (!current.canManageGoals) redirect("/");

  const { studentId } = await params;
  const { goalId } = await searchParams;
  return <GoalsManager studentId={studentId} initialGoalId={goalId} />;
}
