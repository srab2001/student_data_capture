"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Readiness = {
  summary: {
    activeGoals: number;
    goalsMissingPlan: number;
    promptGoalsUsingDefault: number;
    historicalAccommodationsToReconcile: number;
  };
  goalsMissingPlan: Array<{
    id: string;
    studentId: string;
    studentName: string;
    goalText: string;
    metricType: string;
  }>;
  unmatchedAccommodations: Array<{
    accommodationId: string | null;
    studentId: string;
    studentName: string;
    name: string;
    logCount: number;
  }>;
};

function ReconcileAccommodation({
  item,
  onReconciled,
}: {
  item: Readiness["unmatchedAccommodations"][number];
  onReconciled: () => void;
}) {
  const [setting, setSetting] = useState("");
  const [directions, setDirections] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch(
        item.accommodationId
          ? `/api/student-accommodations/${item.accommodationId}`
          : "/api/student-accommodations",
        {
          method: item.accommodationId ? "PATCH" : "POST",
          body: JSON.stringify({
            ...(item.accommodationId ? {} : { studentId: item.studentId }),
            name: item.name,
            setting,
            implementationNotes: directions,
          }),
        }
      );
      onReconciled();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reconcile support.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <h3 className="text-sm font-semibold">{item.studentName} · {item.name}</h3>
      <p className="text-muted mt-1 text-xs">{item.logCount} historical log{item.logCount === 1 ? "" : "s"}. Confirm—not infer—the IEP directions.</p>
      <label className="text-muted mt-3 flex flex-col text-xs">
        Setting
        <input className="input mt-1" value={setting} onChange={(event) => setSetting(event.target.value)} maxLength={200} required disabled={pending} />
      </label>
      <label className="text-muted mt-3 flex flex-col text-xs">
        Implementation directions
        <textarea className="input mt-1" rows={2} value={directions} onChange={(event) => setDirections(event.target.value)} maxLength={500} required disabled={pending} />
      </label>
      {error ? <p role="alert" className="mt-2 text-sm" style={{ color: "#b91c1c" }}>{error}</p> : null}
      <div className="mt-3 flex justify-end">
        <button className="btn btn-primary" disabled={pending || !setting.trim() || !directions.trim()}>
          {pending ? "Saving…" : "Activate confirmed support"}
        </button>
      </div>
    </form>
  );
}

export function DataReadinessAdmin() {
  const [data, setData] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<Readiness>("/api/admin/data-readiness")
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load readiness."));
  }, []);

  useEffect(() => load(), [load]);

  return (
    <section id="readiness" className="mt-10" aria-labelledby="readiness-heading">
      <h2 id="readiness-heading">Data readiness</h2>
      <p className="text-muted mt-1 text-sm">Complete required setup before relying on collection compliance or accommodation validation.</p>
      {error ? <p role="alert" className="mt-3 text-sm" style={{ color: "#b91c1c" }}>{error}</p> : null}
      {!data && !error ? <p className="text-muted mt-3 text-sm">Loading readiness…</p> : null}
      {data ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Active goals", data.summary.activeGoals],
              ["Plans incomplete", data.summary.goalsMissingPlan],
              ["Default prompt ladders", data.summary.promptGoalsUsingDefault],
              ["Supports to reconcile", data.summary.historicalAccommodationsToReconcile],
            ].map(([label, value]) => (
              <div key={label} className="card">
                <dt className="text-muted text-xs">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          {data.goalsMissingPlan.length > 0 ? (
            <div className="mt-5">
              <h3>Guided plan-completion queue</h3>
              <ol className="mt-2 flex flex-col gap-2">
                {data.goalsMissingPlan.map((goal, index) => (
                  <li key={goal.id} className="card flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="card-kicker">{index + 1} · {goal.studentName} · {goal.metricType.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm">{goal.goalText}</p>
                    </div>
                    <Link className="btn btn-secondary" href={`/goals/${goal.studentId}?goalId=${goal.id}`}>
                      Complete plan
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ) : <p className="mt-5 text-sm">All active goals have measurement plans.</p>}

          {data.unmatchedAccommodations.length > 0 ? (
            <div className="mt-5">
              <h3>Reconcile historical accommodations</h3>
              <p className="text-muted mt-1 text-sm">Historical names are preserved, but setting and implementation directions must be confirmed by an authorized administrator.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {data.unmatchedAccommodations.map((item) => (
                  <ReconcileAccommodation
                    key={`${item.studentId}:${item.name}`}
                    item={item}
                    onReconciled={load}
                  />
                ))}
              </div>
            </div>
          ) : <p className="mt-5 text-sm">No historical accommodations need reconciliation.</p>}
        </>
      ) : null}
    </section>
  );
}
