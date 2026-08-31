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

function statusColor(status: string) {
  if (status === "Complete") return "var(--color-accent-2-700)";
  if (status.startsWith("Gated")) return "#b91c1c";
  return "var(--color-accent-700)";
}

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="card elev-sm w-full max-w-2xl" style={{ padding: "var(--space-8)" }}>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest">
          HCPSS · Special Education · Prototype
        </p>
        <h1 className="mt-2">IEP Capture Pilot</h1>
        <p className="mt-3 text-base leading-7">
          A single-classroom prototype for fast, in-classroom IEP progress
          data capture — built independently by a teacher, not yet reviewed
          by HCPSS IT or the district&apos;s data privacy office.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="tag tag-outline">Synthetic data only</span>
          <span className="tag tag-neutral">Track A — prototype</span>
        </div>

        <h2 className="mt-8" style={{ fontSize: 16 }}>
          Build phases
        </h2>
        <ul className="mt-3" style={{ borderTop: "1px solid var(--color-neutral-200)" }}>
          {PHASES.map((phase) => (
            <li
              key={phase.id}
              className="flex items-center justify-between py-2.5 text-sm"
              style={{ borderBottom: "1px solid var(--color-neutral-200)" }}
            >
              <span>
                <span className="text-muted">{phase.id}</span> — {phase.label}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: statusColor(phase.status), fontFamily: "ui-monospace, monospace" }}
              >
                {phase.status}
              </span>
            </li>
          ))}
        </ul>

        <div
          className="mt-8 flex flex-col gap-2 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid var(--color-neutral-200)" }}
        >
          <a
            href="https://claude.ai/code/artifact/f42a3d9c-ee1a-4b8d-860d-e8a4326da173"
            className="font-semibold underline underline-offset-4"
          >
            Full plan &amp; compliance review
          </a>
          <Link href="/help" className="text-muted text-xs underline underline-offset-4">
            User guide
          </Link>
        </div>
      </main>
    </div>
  );
}
