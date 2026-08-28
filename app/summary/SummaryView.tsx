"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Sparkline } from "@/components/Sparkline";
import type { ProgressSummaryResponse, ClientGoalSummary } from "./types";

const DOMAINS = ["all", "academic", "behavioral", "independence", "accommodation"] as const;

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function SummaryView() {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [domain, setDomain] = useState<(typeof DOMAINS)[number]>("all");
  const [studentId, setStudentId] = useState<string>("all");
  const [data, setData] = useState<ProgressSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ studentName: string; goal: ClientGoalSummary } | null>(
    null
  );

  useEffect(() => {
    const params = new URLSearchParams({ from, to });
    if (studentId !== "all") params.set("studentId", studentId);
    apiFetch<ProgressSummaryResponse>(`/api/summary?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load."));
  }, [from, to, studentId]);

  const rows = useMemo(() => {
    if (!data) return [];
    const flat = data.students.flatMap((s) =>
      s.goals
        .filter((g) => domain === "all" || g.goal.domain === domain)
        .map((g) => ({ studentName: s.student.displayName, studentId: s.student.id, goal: g }))
    );
    // Anything without a recent entry surfaces first.
    return flat.sort((a, b) => {
      const aHas = a.goal.dataPoints.length > 0 ? 1 : 0;
      const bHas = b.goal.dataPoints.length > 0 ? 1 : 0;
      return aHas - bHas;
    });
  }, [data, domain]);

  const numericSeries = (g: ClientGoalSummary): number[] => {
    return g.dataPoints
      .map((dp) => {
        if (g.goal.metricType === "accuracy_pct" && dp.trialsTotal) {
          return Math.round(((dp.trialsCorrect ?? 0) / dp.trialsTotal) * 100);
        }
        return dp.valueNumeric ?? null;
      })
      .filter((v): v is number => v != null);
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Progress summary
        </h1>
        <div className="flex gap-2">
          <a
            href={`/api/export/csv?${new URLSearchParams({
              from,
              to,
              ...(studentId !== "all" ? { studentId } : {}),
            }).toString()}`}
            className="min-h-11 flex items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
            className="min-h-11 flex items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Print view
          </a>
        </div>
      </div>

      <form
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="Filters"
      >
        <label className="flex flex-col text-xs text-zinc-500 dark:text-zinc-500">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-h-11 rounded-lg border border-zinc-200 px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col text-xs text-zinc-500 dark:text-zinc-500">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-h-11 rounded-lg border border-zinc-200 px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col text-xs text-zinc-500 dark:text-zinc-500">
          Domain
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as (typeof DOMAINS)[number])}
            className="min-h-11 rounded-lg border border-zinc-200 px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d === "all" ? "All domains" : d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-zinc-500 dark:text-zinc-500">
          Student
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="min-h-11 rounded-lg border border-zinc-200 px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="all">All students</option>
            {data?.students.map((s) => (
              <option key={s.student.id} value={s.student.id}>
                {s.student.displayName}
              </option>
            ))}
          </select>
        </label>
      </form>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Goals and current progress</caption>
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Student / Goal
                </th>
                <th scope="col" className="px-3 py-2">
                  Current
                </th>
                <th scope="col" className="px-3 py-2">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ studentName, goal }) => (
                <tr
                  key={goal.goal.id}
                  className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelected({ studentName, goal })}
                      className="min-h-11 text-left"
                    >
                      <span className="block text-xs text-zinc-400 dark:text-zinc-600">
                        {studentName}
                      </span>
                      {goal.goal.goalText}
                      {goal.dataPoints.length === 0 && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          No recent entry
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{goal.currentValueLabel}</td>
                  <td className="px-3 py-2 font-mono text-xs">{goal.trendLabel}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-zinc-400 dark:text-zinc-600">
                    {data ? "No goals match these filters." : "Loading…"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          {selected ? (
            <>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">{selected.studentName}</p>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {selected.goal.goal.goalText}
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                {selected.goal.goal.domain} · {selected.goal.goal.metricType}
              </p>

              <div className="mt-3">
                <Sparkline values={numericSeries(selected.goal)} />
              </div>

              <table className="mt-3 w-full text-left text-xs">
                <thead className="text-zinc-500 dark:text-zinc-500">
                  <tr>
                    <th scope="col" className="py-1">
                      Date
                    </th>
                    <th scope="col" className="py-1">
                      Reading
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selected.goal.dataPoints.map((dp, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="py-1 font-mono">{dp.sessionDate}</td>
                      <td className="py-1">
                        {dp.trialsTotal
                          ? `${dp.trialsCorrect}/${dp.trialsTotal}`
                          : (dp.valueEnum ?? dp.valueNumeric ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">
              Select a goal to see its trend detail.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
