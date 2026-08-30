import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { GoalsManager } from "./GoalsManager";

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const current = await getCurrentStaff();
  if (!current) redirect("/login");

  const { studentId } = await params;
  return <GoalsManager studentId={studentId} />;
}
