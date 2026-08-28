import Link from "next/link";

const PHASES = [
  { id: "0", label: "Discovery, governance & prototype setup", status: "Complete" },
  { id: "1", label: "Data model & schema design", status: "Complete" },
  { id: "2", label: "Backend / API layer", status: "Complete" },
  { id: "3", label: "Frontend / UI build", status: "Complete" },
  { id: "4", label: "Maryland Online IEP alignment", status: "Complete" },
  { id: "5", label: "Security, access control & audit logging", status: "Gated — Track B" },
  { id: "6", label: "Testing & pilot", status: "Dry-run only — Track A" },
  { id: "7", label: "Sponsorship pitch & real-data rollout", status: "Gated — Track B" },
];

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400">
          HCPSS · Special Education · Prototype
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
          IEP Capture Pilot
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          A single-classroom prototype for fast, in-classroom IEP progress
          data capture — built independently by a teacher, not yet reviewed
          by HCPSS IT or the district&apos;s data privacy office.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-mono text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Synthetic data only
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 font-mono text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Track A — prototype
          </span>
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Build phases
        </h2>
        <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
          {PHASES.map((phase) => (
            <li
              key={phase.id}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                <span className="font-mono text-zinc-400 dark:text-zinc-600">
                  {phase.id}
                </span>{" "}
                — {phase.label}
              </span>
              <span
                className={
                  phase.status === "Complete"
                    ? "font-mono text-xs text-emerald-700 dark:text-emerald-400"
                    : phase.status.startsWith("Gated")
                      ? "font-mono text-xs text-red-700 dark:text-red-400"
                      : "font-mono text-xs text-amber-700 dark:text-amber-400"
                }
              >
                {phase.status}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-2 border-t border-zinc-100 pt-6 text-sm dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://claude.ai/code/artifact/f42a3d9c-ee1a-4b8d-860d-e8a4326da173"
            className="font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
          >
            Full plan &amp; compliance review
          </a>
          <Link
            href="/help"
            className="font-mono text-xs text-zinc-400 underline underline-offset-4 dark:text-zinc-600"
          >
            User guide
          </Link>
        </div>
      </main>
    </div>
  );
}
