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
    <button
      type="button"
      onClick={signOut}
      className="min-h-11 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      Sign out
    </button>
  );
}
