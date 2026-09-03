"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type StaffOption = { id: string; name: string; role: "teacher" | "aide" | "admin" };

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
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="card elev-sm w-full max-w-md" style={{ padding: "var(--space-8)" }}>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-accent-700)" }}>
          Prototype sign-in
        </p>
        <h2 className="mt-2">Choose who&apos;s signing in</h2>
        <p className="text-muted mt-2 text-sm leading-6">
          This picker stands in for real sign-in during the synthetic-data
          prototype phase. Phase 5 replaces it with HCPSS Google Workspace
          SSO before any real student data is used.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-sm" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}

        <ul className="mt-6 flex flex-col gap-2">
          {staff.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => signInAs(s.id)}
                className="btn btn-secondary flex w-full items-center justify-between"
                style={{ justifyContent: "space-between" }}
              >
                <span>{s.name}</span>
                <span className="text-muted text-xs uppercase" style={{ fontFamily: "ui-monospace, monospace" }}>
                  {s.role}
                </span>
              </button>
            </li>
          ))}
          {staff.length === 0 && !error && <li className="text-muted text-sm">Loading staff…</li>}
        </ul>
      </main>
    </div>
  );
}
