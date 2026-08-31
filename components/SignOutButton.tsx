"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} className="btn btn-ghost">
      Sign out
    </button>
  );
}
