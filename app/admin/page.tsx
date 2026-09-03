import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { canOpenAdmin } from "@/lib/auth/authz";
import { AdminConsole } from "./AdminConsole";

export default async function AdminPage() {
  const current = await getCurrentStaff();
  if (!current) redirect("/login");
  if (!canOpenAdmin(current)) redirect("/");

  return <AdminConsole current={current} />;
}
