"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type StaffOption = { id: string; name: string; role: "teacher" | "aide" };

export default function LoginPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    apiFetch<{ staff: StaffOption[] }>("/api/auth/staff")
      .then((data) => setStaff(data.staff))
      .catch((err) => setError(err.message));
  }, []);

  async function signInAs(staffId: string) {
    setPending(true);
    setError(null);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ staffId }),
      });
      router.push("/entry");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400">
          Prototype sign-in
        </p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Choose who&apos;s signing in
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          This picker stands in for real sign-in during the synthetic-data
          prototype phase. Phase 5 replaces it with HCPSS Google Workspace
          SSO before any real student data is used.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <ul className="mt-6 space-y-2">
          {staff.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => signInAs(s.id)}
                className="flex w-full min-h-11 items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <span>{s.name}</span>
                <span className="font-mono text-xs uppercase text-zinc-400 dark:text-zinc-600">
                  {s.role}
                </span>
              </button>
            </li>
          ))}
          {staff.length === 0 && !error && (
            <li className="text-sm text-zinc-500 dark:text-zinc-500">Loading staff…</li>
          )}
        </ul>
      </main>
    </div>
  );
}
