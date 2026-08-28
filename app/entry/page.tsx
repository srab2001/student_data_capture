import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { EntryScreen } from "./EntryScreen";

export default async function EntryPage() {
  const current = await getCurrentStaff();
  if (!current) redirect("/login");

  return <EntryScreen currentStaffName={current.name} />;
}
