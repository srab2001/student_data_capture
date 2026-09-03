"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Walkthrough, TourLauncher } from "@/components/Walkthrough";
import { SUMMARY_TOUR_STEPS, SUMMARY_TOUR_KEY } from "@/lib/tour-steps";
import { useTour } from "@/lib/use-tour";
import { localDateIso } from "@/lib/observations";
import { InterventionPanel } from "./InterventionPanel";
import { ProgressChart } from "./ProgressChart";
import type { ProgressSummaryResponse } from "./types";

const DOMAINS = ["all", "academic", "behavioral", "independence", "accommodation"] as const;

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateIso(date);
}

function statusColor(kind: string): string {
  if (["complete", "descriptive", "on_track", "favorable"].includes(kind)) return "var(--color-accent-2-800)";
  if (["needs_attention", "limited", "off_track", "unfavorable"].includes(kind)) return "#9a3412";
  return "var(--color-neutral-700)";
}

export function SummaryView({ canManageInterventions }: { canManageInterventions: boolean }) {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>("all");
  const [studentId, setStudentId] = useState<string>("all");
  const [data, setData] = useState<ProgressSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const tour = useTour(SUMMARY_TOUR_KEY, !!data);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ from, to });
    if (studentId !== "all") params.set("studentId", studentId);
    apiFetch<ProgressSummaryResponse>(`/api/summary?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Failed to load.");
      });
    return () => controller.abort();
  }, [from, to, studentId, refreshVersion]);

  const rows = useMemo(() => {
    if (!data) return [];
    const flat = data.students.flatMap((student) =>
      student.goals
        .filter((goal) => domain === "all" || goal.goal.domain === domain)
        .map((goal) => ({
          studentName: student.student.displayName,
          studentId: student.student.id,
          goal,
        }))
    );
    return flat.sort((a, b) => {
      const aNeedsEvidence = a.goal.collectionEvidence.kind === "needs_attention" ? 0 : 1;
      const bNeedsEvidence = b.goal.collectionEvidence.kind === "needs_attention" ? 0 : 1;
      if (aNeedsEvidence !== bNeedsEvidence) return aNeedsEvidence - bNeedsEvidence;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [data, domain]);

  const selected = rows.find((row) => row.goal.goal.id === selectedGoalId) ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Progress summary</h1>
          <p className="text-muted mt-1 text-xs">
            Decision support from recorded evidence—not an automatic mastery determination.
          </p>
        </div>
        <div data-tour="summary-export" className="flex gap-2">
          <a
            href={`/api/export/csv?${new URLSearchParams({
              from,
              to,
              ...(studentId !== "all" ? { studentId } : {}),
            }).toString()}`}
            className="btn btn-secondary"
          >
            Export CSV
          </a>
          <a
            href={`/summary/print?${new URLSearchParams({
              from,
              to,
              ...(studentId !== "all" ? { studentId } : {}),
            }).toString()}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            Print view
          </a>
        </div>
      </div>

      <form data-tour="summary-filters" className="card mb-4 flex flex-wrap items-end gap-3" aria-label="Summary filters">
        <label className="text-muted flex flex-col text-xs">
          From
          <input type="date" value={from} max={to} required onChange={(event) => setFrom(event.target.value)} className="input mt-1" />
        </label>
        <label className="text-muted flex flex-col text-xs">
          To
          <input type="date" value={to} min={from} required onChange={(event) => setTo(event.target.value)} className="input mt-1" />
        </label>
        <label className="text-muted flex flex-col text-xs">
          Domain
          <select value={domain} onChange={(event) => setDomain(event.target.value as (typeof DOMAINS)[number])} className="input mt-1">
            {DOMAINS.map((value) => (
              <option key={value} value={value}>{value === "all" ? "All domains" : value}</option>
            ))}
          </select>
        </label>
        <label className="text-muted flex flex-col text-xs">
          Student
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="input mt-1">
            <option value="all">All students</option>
            {data?.students.map((student) => (
              <option key={student.student.id} value={student.student.id}>{student.student.displayName}</option>
            ))}
          </select>
        </label>
      </form>

      {error && <p role="alert" className="mb-4 text-sm" style={{ color: "#b91c1c" }}>{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,1.2fr)]">
        <div data-tour="summary-table" className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-neutral-300)" }}>
          <table className="w-full min-w-[48rem] text-left text-sm">
            <caption className="sr-only">Student goals and evidence status</caption>
            <thead style={{ background: "var(--color-neutral-100)" }} className="text-muted text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" className="px-3 py-2">Student / Goal</th>
                <th scope="col" className="px-3 py-2">Current</th>
                <th scope="col" className="px-3 py-2">Recent trend</th>
                <th scope="col" className="px-3 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ studentName, goal }) => (
                <tr key={goal.goal.id} className="border-t" style={{ borderColor: "var(--color-neutral-200)" }}>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGoalId(goal.goal.id)}
                      aria-pressed={selectedGoalId === goal.goal.id}
                      className="min-h-11 w-full text-left"
                    >
                      <span className="text-muted block text-xs">{studentName}</span>
                      {goal.goal.goalText}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{goal.currentValueLabel}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: statusColor(goal.trendAnalysis.kind) }}>
                    {goal.trendLabel}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: statusColor(goal.collectionEvidence.kind) }}>
                    {goal.collectionEvidence.compliancePct === null ? "—" : `${goal.collectionEvidence.compliancePct}%`}
                    <span className="block">{goal.dataSufficiency.observationDays} days</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="text-muted px-3 py-6 text-center">{data ? "No goals match these filters." : "Loading…"}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div data-tour="summary-detail" className="card">
          {selected ? (
            <>
              <p className="text-muted text-xs">{selected.studentName}</p>
              <h2 className="text-sm font-semibold">{selected.goal.goal.goalText}</h2>
              <p className="text-muted mt-1 text-xs capitalize">{selected.goal.goal.domain} · {selected.goal.goal.metricType.replaceAll("_", " ")}</p>

              <div className="mt-4">
                <ProgressChart summary={selected.goal} rangeFrom={from} rangeTo={to} />
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg p-2" style={{ background: "var(--color-neutral-100)" }}>
                  <dt className="text-muted text-xs">Recent trend</dt>
                  <dd className="mt-1 text-xs" style={{ color: statusColor(selected.goal.trendAnalysis.kind), fontWeight: 600 }}>{selected.goal.trendLabel}</dd>
                  {selected.goal.trendAnalysis.dateFrom ? <dd className="text-muted mt-1 text-xs">{selected.goal.trendAnalysis.dateFrom} to {selected.goal.trendAnalysis.dateTo}</dd> : null}
                </div>
                <div className="rounded-lg p-2" style={{ background: "var(--color-neutral-100)" }}>
                  <dt className="text-muted text-xs">Collection</dt>
                  <dd className="mt-1 text-xs" style={{ color: statusColor(selected.goal.collectionEvidence.kind), fontWeight: 600 }}>{selected.goal.collectionEvidence.label}</dd>
                </div>
                <div className="rounded-lg p-2" style={{ background: "var(--color-neutral-100)" }}>
                  <dt className="text-muted text-xs">Evidence depth</dt>
                  <dd className="mt-1 text-xs" style={{ color: statusColor(selected.goal.dataSufficiency.kind), fontWeight: 600 }}>{selected.goal.dataSufficiency.label}</dd>
                </div>
                <div className="rounded-lg p-2" style={{ background: "var(--color-neutral-100)" }}>
                  <dt className="text-muted text-xs">Aim line</dt>
                  <dd className="mt-1 text-xs" style={{ color: statusColor(selected.goal.aimStatus.kind), fontWeight: 600 }}>{selected.goal.aimStatus.label}</dd>
                </div>
              </dl>

              <table className="mt-4 w-full text-left text-xs">
                <caption className="text-muted mb-1 text-left">Recorded session summaries</caption>
                <thead className="text-muted"><tr><th scope="col" className="py-1">Date</th><th scope="col" className="py-1">Reading</th></tr></thead>
                <tbody>
                  {selected.goal.dataPoints.map((point) => (
                    <tr key={point.id} className="border-t" style={{ borderColor: "var(--color-neutral-200)" }}>
                      <td className="py-1 font-mono">{point.sessionDate}</td>
                      <td className="py-1">
                        {point.observationDetails?.kind === "abc" ? (
                          <dl>
                            <dt className="font-semibold">Antecedent</dt><dd>{point.observationDetails.antecedent}</dd>
                            <dt className="mt-1 font-semibold">Behavior</dt><dd>{point.observationDetails.behavior}</dd>
                            <dt className="mt-1 font-semibold">Consequence</dt><dd>{point.observationDetails.consequence}</dd>
                          </dl>
                        ) : point.observationDetails?.kind === "rubric" ? (
                          <span>
                            {point.observationDetails.workSample}: {point.valueNumeric}
                            {selected.goal.goal.rubricConfig ? `/${selected.goal.goal.rubricConfig.maxScore}` : ""}
                            {point.observationDetails.criterion ? ` · ${point.observationDetails.criterion}` : ""}
                          </span>
                        ) : point.trialsTotal ? (
                          `${point.trialsCorrect}/${point.trialsTotal}`
                        ) : selected.goal.goal.metricType === "frequency_count" && point.valueNumeric !== null ? (
                          `${point.valueNumeric}${
                            point.observationDurationSeconds
                              ? ` · ${((point.valueNumeric * 60) / point.observationDurationSeconds).toFixed(1)}/min over ${(point.observationDurationSeconds / 60).toFixed(1)} min`
                              : point.opportunitiesObserved
                                ? ` · ${((point.valueNumeric * 100) / point.opportunitiesObserved).toFixed(1)} per 100 opportunities (${point.opportunitiesObserved} observed)`
                                : " · exposure not recorded"
                          }`
                        ) : (
                          point.valueEnum ?? point.valueNumeric ?? "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <InterventionPanel
                key={selected.goal.goal.id}
                goalId={selected.goal.goal.id}
                interventions={selected.goal.interventions}
                canManage={canManageInterventions}
                onChanged={() => setRefreshVersion((version) => version + 1)}
                rangeFrom={from}
                rangeTo={to}
              />
            </>
          ) : (
            <p className="text-muted text-sm">Select a goal to review its evidence, chart, and intervention context.</p>
          )}
        </div>
      </div>

      {data?.students.some((student) => student.accommodations.bySupport.length > 0) ? (
        <section className="mt-6" aria-labelledby="accommodation-analysis-heading">
          <h2 id="accommodation-analysis-heading">Accommodation implementation</h2>
          <p className="text-muted mt-1 text-sm">
            Descriptive implementation evidence only. Small samples and differences in setting prevent causal conclusions.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-neutral-300)" }}>
            <table className="table w-full text-left text-sm">
              <thead>
                <tr>
                  <th scope="col">Student / support</th>
                  <th scope="col">Setting</th>
                  <th scope="col">Used</th>
                  <th scope="col">Effectiveness</th>
                  <th scope="col">Fidelity</th>
                  <th scope="col">Context linked</th>
                </tr>
              </thead>
              <tbody>
                {data.students.flatMap((student) =>
                  student.accommodations.bySupport.map((support) => (
                    <tr key={`${student.student.id}:${support.accommodationName}:${support.setting ?? ""}`}>
                      <td>{student.student.displayName}<span className="text-muted block text-xs">{support.accommodationName}</span></td>
                      <td>{support.setting ?? "Not recorded"}</td>
                      <td className="font-mono">{support.usageRatePct}% ({support.usedCount}/{support.logCount})</td>
                      <td className="font-mono">{support.avgEffectiveness ?? "—"}/5 (n={support.effectivenessN})</td>
                      <td className="font-mono">{support.avgFidelity ?? "—"}/5 (n={support.fidelityN})</td>
                      <td className="font-mono">{support.contextLinkedCount}/{support.logCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <TourLauncher onClick={tour.launch} />
      <Walkthrough steps={SUMMARY_TOUR_STEPS} open={tour.open} onClose={tour.close} />
    </main>
  );
}
